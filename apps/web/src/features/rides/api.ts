import { Timestamp, arrayRemove, arrayUnion, deleteDoc, increment, runTransaction, updateDoc } from 'firebase/firestore'
import { tokenize, type Ride, type RideInput, type User } from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { createThread, leaveThread, postSystemMessage } from '@/features/messaging/api'
import { notify } from '@/features/notifications/api'
import { db } from '@/lib/firebase'
import { cols, doc, now, set, subs } from '@/lib/firestore'

export async function createRide(me: User, input: RideInput) {
  const driver = toRef(me)
  const ref = doc(cols.rides)
  const title = `${input.from} → ${input.to}`
  const threadId = await createThread('context', driver, title, { collection: 'rides', id: ref.id, title })
  await set(ref, {
    ...input,
    start: Timestamp.fromDate(input.start),
    seatsTaken: 0,
    status: 'open',
    driver,
    passengerIds: [],
    threadId,
    searchTokens: tokenize(input.from, input.to, input.vehicle),
    createdAt: now(),
  })
  return ref.id
}

export async function requestSeat(r: Ride, me: User, message: string) {
  await set(doc(subs.joinRequests('rides', r.id), me.uid), { name: me.displayName, photo: me.photoURL, message, status: 'pending', createdAt: now() })
  await notify({ to: r.driver.uid, type: 'ride', title: `${me.displayName} asked for a seat`, body: `${r.from} → ${r.to}${message ? ` · ${message}` : ''}`, link: `/rides/${r.id}` })
}

export const withdrawRequest = (rideId: string, uid: string) => deleteDoc(doc(subs.joinRequests('rides', rideId), uid))

/**
 * Driver approves: request → approved, passenger added, seat counted, ride flips to full on the last seat.
 * The passenger is added to the ride chat so they can coordinate pickup.
 */
export async function approveSeat(r: Ride, uid: string, name: string) {
  const ref = doc(cols.rides, r.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh) throw new Error('This ride was removed.')
    if (fresh.status !== 'open') throw new Error('This ride is not open.')
    if (fresh.seatsTaken >= fresh.seats) throw new Error('No seats left.')
    if (fresh.passengerIds.includes(uid)) return
    tx.update(ref, {
      passengerIds: arrayUnion(uid),
      seatsTaken: increment(1),
      status: fresh.seatsTaken + 1 >= fresh.seats ? 'full' : 'open',
    })
    tx.update(doc(subs.joinRequests('rides', r.id), uid), { status: 'approved' })
  })
  await Promise.all([
    updateDoc(doc(cols.threads, r.threadId), { members: arrayUnion(uid), [`memberInfo.${uid}`]: { name, photo: null }, [`unread.${uid}`]: 0, updatedAt: now() }),
    notify({ to: uid, type: 'ride', title: 'Seat confirmed', body: `${r.from} → ${r.to}. Open the ride chat to coordinate.`, link: `/rides/${r.id}` }),
  ])
}

export async function declineSeat(r: Ride, uid: string) {
  await updateDoc(doc(subs.joinRequests('rides', r.id), uid), { status: 'declined' })
  await notify({ to: uid, type: 'ride', title: 'Seat request declined', body: `${r.from} → ${r.to}`, link: '/rides' })
}

/** Passenger drops out; driver can also remove a passenger. */
export async function leaveRide(r: Ride, uid: string) {
  const ref = doc(cols.rides, r.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh || !fresh.passengerIds.includes(uid)) return
    tx.update(ref, { passengerIds: arrayRemove(uid), seatsTaken: increment(-1), status: fresh.status === 'full' ? 'open' : fresh.status })
  })
  await Promise.all([leaveThread(r.threadId, uid), deleteDoc(doc(subs.joinRequests('rides', r.id), uid)).catch(() => undefined)])
}

export async function setRideStatus(r: Ride, status: Ride['status']) {
  await updateDoc(doc(cols.rides, r.id), { status })
  if (status === 'cancelled') await postSystemMessage(r.threadId, 'The driver cancelled this ride.')
  if (status === 'departed') await postSystemMessage(r.threadId, 'The driver marked this ride as departed.')
}

export const deleteRide = (id: string) => deleteDoc(doc(cols.rides, id))
