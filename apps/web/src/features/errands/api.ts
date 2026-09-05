import { Timestamp, arrayUnion, deleteDoc, increment, runTransaction, updateDoc } from 'firebase/firestore'
import { tokenize, type ItemStatus, type Trip, type TripInput, type TripItem, type TripItemInput, type User } from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { notify } from '@/features/notifications/api'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, subs } from '@/lib/firestore'

export async function createTrip(me: User, input: TripInput) {
  const ref = await add(cols.trips, {
    ...input,
    date: Timestamp.fromDate(input.date),
    itemCount: 0,
    traveller: toRef(me),
    requesterIds: [],
    status: 'open',
    searchTokens: tokenize(input.city, input.note),
    createdAt: now(),
  })
  return ref.id
}

export const setTripStatus = (id: string, status: Trip['status']) => updateDoc(doc(cols.trips, id), { status })
export const deleteTrip = (id: string) => deleteDoc(doc(cols.trips, id))

/** Attach a request to a trip. The item counter is bumped in the same transaction so maxItems holds. */
export async function requestItem(t: Trip, me: User, input: TripItemInput) {
  const tripRef = doc(cols.trips, t.id)
  const itemRef = doc(subs.tripItems(t.id))
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(tripRef)).data()
    if (!fresh) throw new Error('This trip was removed.')
    if (fresh.status !== 'open') throw new Error('This trip is no longer taking requests.')
    if (fresh.itemCount >= fresh.maxItems) throw new Error('The traveller has hit their item limit.')
    tx.set(itemRef, { id: itemRef.id, ...input, requester: toRef(me), status: 'requested', createdAt: now(), updatedAt: now() })
    tx.update(tripRef, { itemCount: increment(1), requesterIds: arrayUnion(me.uid) })
  })
  await notify({ to: t.traveller.uid, type: 'errand', title: `${me.displayName} needs something from ${t.city}`, body: `${input.qty} × ${input.item}`, link: `/errands/${t.id}` })
}

const LABEL: Record<ItemStatus, string> = {
  requested: 'requested',
  accepted: 'accepted',
  declined: 'declined',
  picked_up: 'picked up',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

/** Traveller moves an item along requested → accepted → picked up → delivered (or declines). */
export async function setItemStatus(t: Trip, item: TripItem, status: ItemStatus) {
  await updateDoc(doc(subs.tripItems(t.id), item.id), { status, updatedAt: now() })
  if (item.requester.uid !== t.traveller.uid) {
    await notify({ to: item.requester.uid, type: 'errand', title: `${item.item}: ${LABEL[status]}`, body: `${t.traveller.name}'s ${t.city} trip`, link: `/errands/${t.id}` })
  }
}

/** Requester cancels their own item (only before pickup). Counter is released so someone else can use the slot. */
export async function cancelItem(t: Trip, item: TripItem) {
  const tripRef = doc(cols.trips, t.id)
  await runTransaction(db, async (tx) => {
    if (item.status === 'requested') {
      tx.delete(doc(subs.tripItems(t.id), item.id))
      tx.update(tripRef, { itemCount: increment(-1) })
    } else {
      tx.update(doc(subs.tripItems(t.id), item.id), { status: 'cancelled', updatedAt: now() })
    }
  })
}
