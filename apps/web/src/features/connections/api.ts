import { deleteDoc, getDoc, getDocs, increment, limit, query, runTransaction, updateDoc, where } from 'firebase/firestore'
import type { ConnectionRequest, User, UserRef } from '@frisbee/shared'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, set, subs } from '@/lib/firestore'
import { pairId } from '@/lib/utils'
import { notify } from '@/features/notifications/api'

export const toRef = (u: Pick<User, 'uid' | 'displayName' | 'photoURL'>): UserRef => ({
  uid: u.uid,
  name: u.displayName,
  photo: u.photoURL,
})

export async function sendConnectionRequest(me: User, to: User, message = '') {
  const existing = await getDocs(
    query(cols.connectionRequests, where('from', '==', me.uid), where('to', '==', to.uid), where('status', '==', 'pending'), limit(1)),
  )
  if (!existing.empty) return existing.docs[0]!.id
  const ref = await add(cols.connectionRequests, {
    from: me.uid,
    to: to.uid,
    fromRef: toRef(me),
    toRef: toRef(to),
    message,
    status: 'pending',
    createdAt: now(),
    respondedAt: null,
  })
  await notify({
    to: to.uid,
    type: 'connection_request',
    title: `${me.displayName} wants to connect`,
    body: message || 'Open their profile to respond.',
    link: `/people/${me.uid}`,
  })
  return ref.id
}

export async function respondToRequest(req: ConnectionRequest, me: User, accept: boolean) {
  const reqRef = doc(cols.connectionRequests, req.id)
  if (!accept) {
    await updateDoc(reqRef, { status: 'declined', respondedAt: now() })
    return
  }
  const id = pairId(req.from, req.to)
  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(reqRef)
    if (fresh.data()?.status !== 'pending') throw new Error('This request was already handled')
    tx.update(reqRef, { status: 'accepted', respondedAt: now() })
    tx.set(doc(cols.connections, id), { id, uids: [req.from, req.to].sort() as [string, string], requestId: req.id, since: now() })
    tx.update(doc(cols.users, req.from), { 'stats.connections': increment(1) })
    tx.update(doc(cols.users, req.to), { 'stats.connections': increment(1) })
  })
  await notify({
    to: req.from,
    type: 'connection_accepted',
    title: `${me.displayName} accepted your request`,
    body: 'You can message each other now.',
    link: `/people/${me.uid}`,
  })
}

export const withdrawRequest = (id: string) => updateDoc(doc(cols.connectionRequests, id), { status: 'withdrawn', respondedAt: now() })

export async function isConnected(a: string, b: string) {
  const snap = await getDoc(doc(cols.connections, pairId(a, b)))
  return snap.exists()
}

export async function removeConnection(a: string, b: string) {
  await deleteDoc(doc(cols.connections, pairId(a, b)))
  await Promise.all([
    updateDoc(doc(cols.users, a), { 'stats.connections': increment(-1) }),
    updateDoc(doc(cols.users, b), { 'stats.connections': increment(-1) }),
  ])
}

export const blockUser = (me: string, other: string) => set(doc(subs.blocks(me), other), { createdAt: now() })
export const unblockUser = (me: string, other: string) => deleteDoc(doc(subs.blocks(me), other))
