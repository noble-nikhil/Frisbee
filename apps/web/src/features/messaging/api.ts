import { arrayUnion, getDoc, increment, limit, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore'
import type { Thread, ThreadKind, User, UserRef } from '@frisbee/shared'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, set, subs } from '@/lib/firestore'
import { pairId } from '@/lib/utils'

const info = (u: UserRef) => ({ name: u.name, photo: u.photo })

/** DM thread id is deterministic so two people can never end up with two threads. */
export async function openDm(me: User, other: UserRef): Promise<string> {
  const id = pairId(me.uid, other.uid)
  const ref = doc(cols.threads, id)
  const snap = await getDoc(ref)
  if (snap.exists()) return id
  // Deterministic id + rules that only allow members to read, so a second create can only
  // race against ourselves; setDoc on an existing thread would wipe history, hence the probe above.
  await set(ref, {
    kind: 'dm',
    members: [me.uid, other.uid],
    memberInfo: { [me.uid]: { name: me.displayName, photo: me.photoURL }, [other.uid]: info(other) },
    lastMessage: null,
    unread: { [me.uid]: 0, [other.uid]: 0 },
    createdAt: now(),
    updatedAt: now(),
  })
  return id
}

/** Group / context threads (group chat, hangout, ride, team). Creator is the first member. */
export async function createThread(kind: Exclude<ThreadKind, 'dm'>, creator: UserRef, title: string, contextRef?: Thread['contextRef']) {
  const ref = await add(cols.threads, {
    kind,
    title,
    members: [creator.uid],
    memberInfo: { [creator.uid]: info(creator) },
    ...(contextRef ? { contextRef } : {}),
    lastMessage: null,
    unread: { [creator.uid]: 0 },
    createdAt: now(),
    updatedAt: now(),
  })
  return ref.id
}

/** Blind update on purpose: a non-member cannot read the thread yet, and the rules only let them add themselves. */
export function joinThread(threadId: string, user: UserRef) {
  return updateDoc(doc(cols.threads, threadId), {
    members: arrayUnion(user.uid),
    [`memberInfo.${user.uid}`]: info(user),
    [`unread.${user.uid}`]: 0,
    updatedAt: now(),
  })
}

export async function leaveThread(threadId: string, uid: string) {
  const ref = doc(cols.threads, threadId)
  const snap = await getDoc(ref)
  const t = snap.data()
  if (!t) return
  await updateDoc(ref, { members: t.members.filter((m) => m !== uid), updatedAt: now() })
}

export async function sendMessage(thread: Thread, sender: UserRef, text: string, imageURL?: string) {
  const batch = writeBatch(db)
  const msgRef = doc(subs.messages(thread.id))
  batch.set(msgRef, {
    id: msgRef.id,
    senderId: sender.uid,
    type: imageURL ? 'image' : 'text',
    text,
    ...(imageURL ? { imageURL } : {}),
    createdAt: now(),
  })
  const unreadBumps = Object.fromEntries(thread.members.filter((m) => m !== sender.uid).map((m) => [`unread.${m}`, increment(1)]))
  batch.update(doc(cols.threads, thread.id), {
    lastMessage: { text: imageURL ? 'Photo' : text, senderId: sender.uid, at: now() },
    updatedAt: now(),
    ...unreadBumps,
  })
  await batch.commit()
}

export async function postSystemMessage(threadId: string, text: string) {
  await add(subs.messages(threadId), { senderId: 'system', type: 'system', text, createdAt: now() })
}

export const markThreadRead = (threadId: string, uid: string) =>
  updateDoc(doc(cols.threads, threadId), { [`unread.${uid}`]: 0 })

export const messagesQuery = (threadId: string) => query(subs.messages(threadId), orderBy('createdAt', 'desc'), limit(50))
