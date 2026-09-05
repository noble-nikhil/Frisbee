import { getDocs, limit, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import type { NotificationType } from '@frisbee/shared'
import { db } from '@/lib/firebase'
import { add, doc, now, subs } from '@/lib/firestore'

interface Notify {
  to: string | string[]
  type: NotificationType
  title: string
  body: string
  link: string
}

/**
 * Client-side fan-out. Rules allow creating a notification in someone else's
 * subcollection (create-only, shape-validated) so no server hop is needed.
 */
export async function notify({ to, type, title, body, link }: Notify) {
  const targets = Array.isArray(to) ? to : [to]
  await Promise.all(
    targets.map((uid) => add(subs.notifications(uid), { type, title, body, link, read: false, createdAt: now() })),
  )
}

export const markRead = (uid: string, id: string) => updateDoc(doc(subs.notifications(uid), id), { read: true })

export async function markAllRead(uid: string) {
  const snap = await getDocs(query(subs.notifications(uid), where('read', '==', false), limit(200)))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }))
  await batch.commit()
}
