import { Timestamp, deleteDoc, getDoc, getDocs, increment, limit, orderBy, query, runTransaction, updateDoc, where, writeBatch } from 'firebase/firestore'
import {
  tokenize,
  type Activity,
  type ActivityInput,
  type Event,
  type EventInput,
  type Hangout,
  type HangoutInput,
  type User,
  type UserRef,
} from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { createThread, joinThread, leaveThread, postSystemMessage } from '@/features/messaging/api'
import { notify } from '@/features/notifications/api'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, set, subs } from '@/lib/firestore'

export type HappeningKind = 'activities' | 'hangouts' | 'events'

const ts = (d: Date) => Timestamp.fromDate(d)
const person = (u: UserRef) => ({ name: u.name, photo: u.photo })

// Activities ------------------------------------------------------------------

export async function createActivity(me: User, input: ActivityInput) {
  const ref = await add(cols.activities, {
    ...input,
    start: ts(input.start),
    goingCount: 0,
    createdBy: toRef(me),
    searchTokens: tokenize(input.title, input.location, input.tags, input.description),
    createdAt: now(),
  })
  return ref.id
}

export const updateActivity = (id: string, patch: Partial<Pick<Activity, 'title' | 'description' | 'location' | 'tags' | 'capacity'>>) =>
  updateDoc(doc(cols.activities, id), patch)

export const deleteActivity = (id: string) => deleteDoc(doc(cols.activities, id))

/** Activities have a soft capacity: the count is checked in the transaction, no waitlist. */
export async function rsvpActivity(a: Activity, me: User, going: boolean) {
  const ref = doc(cols.activities, a.id)
  const mine = doc(subs.rsvps('activities', a.id), me.uid)
  await runTransaction(db, async (tx) => {
    const [fresh, existing] = await Promise.all([tx.get(ref), tx.get(mine)])
    const data = fresh.data()
    if (!data) throw new Error('This activity was removed.')
    if (going === existing.exists()) return
    if (going) {
      if (data.capacity && data.goingCount >= data.capacity) throw new Error('This activity is full.')
      tx.set(mine, { uid: me.uid, status: 'going', position: null, ...person(toRef(me)), createdAt: now() })
      tx.update(ref, { goingCount: increment(1) })
    } else {
      tx.delete(mine)
      tx.update(ref, { goingCount: increment(-1) })
    }
  })
}

// Hangouts --------------------------------------------------------------------

const inviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

export async function createHangout(me: User, input: HangoutInput) {
  const host = toRef(me)
  const ref = doc(cols.hangouts)
  const threadId = await createThread('context', host, input.title, { collection: 'hangouts', id: ref.id, title: input.title })
  await set(ref, {
    ...input,
    start: ts(input.start),
    memberCount: 1,
    inviteCode: input.visibility === 'invite' ? inviteCode() : null,
    status: 'open',
    createdBy: host,
    threadId,
    searchTokens: tokenize(input.title, input.type, input.venue),
    createdAt: now(),
  })
  await set(doc(subs.members('hangouts', ref.id), me.uid), { role: 'owner', name: me.displayName, photo: me.photoURL, joinedAt: now() })
  return ref.id
}

/** Instant join (or join after approval). Closes the hangout when the last seat goes. */
export async function joinHangout(h: Hangout, me: User) {
  const ref = doc(cols.hangouts, h.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh) throw new Error('This hangout was removed.')
    if (fresh.status !== 'open') throw new Error('This hangout is no longer open.')
    if (fresh.memberCount >= fresh.limit) throw new Error('No seats left.')
    const full = fresh.memberCount + 1 >= fresh.limit
    tx.set(doc(subs.members('hangouts', h.id), me.uid), { uid: me.uid, role: 'member', name: me.displayName, photo: me.photoURL, joinedAt: now() })
    tx.update(ref, { memberCount: increment(1), status: full ? 'full' : 'open' })
  })
  await Promise.all([
    joinThread(h.threadId, toRef(me)),
    deleteDoc(doc(subs.joinRequests('hangouts', h.id), me.uid)).catch(() => undefined),
    notify({ to: h.createdBy.uid, type: 'hangout', title: `${me.displayName} joined ${h.title}`, body: '', link: `/happening/hangouts/${h.id}` }),
  ])
}

export async function leaveHangout(h: Hangout, me: User) {
  const ref = doc(cols.hangouts, h.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh) return
    tx.delete(doc(subs.members('hangouts', h.id), me.uid))
    tx.update(ref, { memberCount: increment(-1), status: fresh.status === 'full' ? 'open' : fresh.status })
  })
  await leaveThread(h.threadId, me.uid)
}

export async function requestHangout(h: Hangout, me: User, message: string) {
  await set(doc(subs.joinRequests('hangouts', h.id), me.uid), { name: me.displayName, photo: me.photoURL, message, status: 'pending', createdAt: now() })
  await notify({ to: h.createdBy.uid, type: 'hangout', title: `${me.displayName} wants to join ${h.title}`, body: message, link: `/happening/hangouts/${h.id}` })
}

export async function decideHangoutRequest(h: Hangout, uid: string, approve: boolean) {
  await updateDoc(doc(subs.joinRequests('hangouts', h.id), uid), { status: approve ? 'approved' : 'declined' })
  await notify({
    to: uid,
    type: 'hangout',
    title: approve ? `You're in: ${h.title}` : `${h.title}: request declined`,
    body: approve ? 'Open the hangout to confirm your seat.' : '',
    link: `/happening/hangouts/${h.id}`,
  })
}

export async function setHangoutStatus(h: Hangout, status: Hangout['status']) {
  await updateDoc(doc(cols.hangouts, h.id), { status })
  if (status === 'cancelled') await postSystemMessage(h.threadId, 'The host cancelled this hangout.')
}

export const hangoutByCode = async (code: string) => {
  const snap = await getDocs(query(cols.hangouts, where('inviteCode', '==', code.trim().toUpperCase()), limit(1)))
  return snap.docs[0]?.data() ?? null
}

// Events ----------------------------------------------------------------------

export async function createEvent(me: User, input: EventInput, organiser: Event['organiser']) {
  const ref = await add(cols.events, {
    ...input,
    start: ts(input.start),
    end: ts(input.end),
    goingCount: 0,
    waitlistCount: 0,
    organiser,
    createdBy: me.uid,
    searchTokens: tokenize(input.title, input.category, input.venue, input.description),
    createdAt: now(),
  })
  return ref.id
}

export const deleteEvent = (id: string) => deleteDoc(doc(cols.events, id))

/** RSVP with waitlist. Position is the waitlist ordinal at the time of joining. */
export async function rsvpEvent(e: Event, me: User) {
  const ref = doc(cols.events, e.id)
  const mine = doc(subs.rsvps('events', e.id), me.uid)
  return runTransaction(db, async (tx) => {
    const [fresh, existing] = await Promise.all([tx.get(ref), tx.get(mine)])
    const data = fresh.data()
    if (!data) throw new Error('This event was removed.')
    if (existing.exists()) return existing.data().status
    const going = data.goingCount < data.capacity
    tx.set(mine, {
      uid: me.uid,
      status: going ? 'going' : 'waitlisted',
      position: going ? null : data.waitlistCount + 1,
      name: me.displayName,
      photo: me.photoURL,
      createdAt: now(),
    })
    tx.update(ref, going ? { goingCount: increment(1) } : { waitlistCount: increment(1) })
    return going ? 'going' : 'waitlisted'
  })
}

/** Cancelling a "going" seat promotes the first waitlisted person inside the same transaction. */
export async function cancelRsvp(e: Event, me: User) {
  const ref = doc(cols.events, e.id)
  const mine = doc(subs.rsvps('events', e.id), me.uid)
  const waitlist = await getDocs(query(subs.rsvps('events', e.id), where('status', '==', 'waitlisted'), orderBy('position'), limit(1)))
  const next = waitlist.docs[0]?.data() ?? null
  const promoted = await runTransaction(db, async (tx) => {
    const existing = (await tx.get(mine)).data()
    if (!existing) return null
    tx.delete(mine)
    if (existing.status === 'waitlisted') {
      tx.update(ref, { waitlistCount: increment(-1) })
      return null
    }
    if (next && next.uid !== me.uid) {
      tx.update(doc(subs.rsvps('events', e.id), next.uid), { status: 'going', position: null })
      tx.update(ref, { waitlistCount: increment(-1) })
      return next.uid
    }
    tx.update(ref, { goingCount: increment(-1) })
    return null
  })
  if (promoted) {
    await notify({ to: promoted, type: 'event', title: `A seat opened up: ${e.title}`, body: 'You have moved from the waitlist to going.', link: `/happening/events/${e.id}` })
  }
}

export async function postEventUpdate(e: Event, author: UserRef, text: string) {
  await add(subs.eventUpdates(e.id), { author, text, createdAt: now() })
  // fan out to attendees (organiser announcements are the one place we notify everyone)
  const rsvps = await getDocs(subs.rsvps('events', e.id))
  const batch = writeBatch(db)
  for (const r of rsvps.docs) {
    if (r.id === author.uid) continue
    const ref = doc(subs.notifications(r.id))
    batch.set(ref, { id: ref.id, type: 'event', title: e.title, body: text.slice(0, 140), link: `/happening/events/${e.id}`, read: false, createdAt: now() })
  }
  await batch.commit()
}

export const myRsvp = async (kind: 'activities' | 'events', id: string, uid: string) => (await getDoc(doc(subs.rsvps(kind, id), uid))).data() ?? null
