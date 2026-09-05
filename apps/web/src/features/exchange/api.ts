import { Timestamp, updateDoc } from 'firebase/firestore'
import { addMinutes } from 'date-fns'
import type { Exchange, ExchangeProposalInput, ScheduleInput, User, UserRef } from '@frisbee/shared'
import { add, cols, doc, now } from '@/lib/firestore'
import { toRef } from '@/features/connections/api'
import { openDm, postSystemMessage } from '@/features/messaging/api'
import { notify } from '@/features/notifications/api'
import { tagLabel } from '@frisbee/shared'

export async function proposeExchange(me: User, other: UserRef, input: ExchangeProposalInput) {
  const threadId = await openDm(me, other)
  const ref = await add(cols.exchanges, {
    aId: me.uid,
    bId: other.uid,
    participants: [me.uid, other.uid],
    refs: { [me.uid]: toRef(me), [other.uid]: other },
    aTeaches: input.aTeaches,
    bTeaches: input.bTeaches,
    message: input.message,
    status: 'proposed',
    slot: null,
    threadId,
    createdAt: now(),
    updatedAt: now(),
  })
  await postSystemMessage(
    threadId,
    `${me.displayName} proposed a skill swap: ${input.aTeaches.map(tagLabel).join(', ')} for ${input.bTeaches.map(tagLabel).join(', ')}.`,
  )
  await notify({
    to: other.uid,
    type: 'exchange',
    title: `${me.displayName} proposed a skill swap`,
    body: `They teach ${input.aTeaches.map(tagLabel).join(', ')}; you teach ${input.bTeaches.map(tagLabel).join(', ')}.`,
    link: `/messages/${threadId}`,
  })
  return ref.id
}

export async function respondToExchange(ex: Exchange, me: User, accept: boolean) {
  await updateDoc(doc(cols.exchanges, ex.id), { status: accept ? 'accepted' : 'cancelled', updatedAt: now() })
  const other = ex.participants.find((p) => p !== me.uid)!
  if (ex.threadId) await postSystemMessage(ex.threadId, `${me.displayName} ${accept ? 'accepted' : 'declined'} the swap.`)
  await notify({
    to: other,
    type: 'exchange',
    title: `${me.displayName} ${accept ? 'accepted' : 'declined'} your swap`,
    body: accept ? 'Pick a time for your first session.' : '',
    link: ex.threadId ? `/messages/${ex.threadId}` : '/discover?tab=swap',
  })
}

export async function scheduleExchange(ex: Exchange, me: User, input: ScheduleInput) {
  const start = Timestamp.fromDate(input.start)
  const end = Timestamp.fromDate(addMinutes(input.start, input.durationMin))
  await updateDoc(doc(cols.exchanges, ex.id), { status: 'scheduled', slot: { start, end, place: input.place }, updatedAt: now() })
  await add(cols.sessions, {
    kind: 'exchange',
    refId: ex.id,
    participants: ex.participants,
    title: 'Skill swap session',
    start,
    end,
    place: input.place,
    status: 'scheduled',
    remindersSent: { h24: false, h2: false },
  })
  const other = ex.participants.find((p) => p !== me.uid)!
  if (ex.threadId) await postSystemMessage(ex.threadId, `${me.displayName} scheduled a session at ${input.place}.`)
  await notify({ to: other, type: 'exchange', title: 'Swap session scheduled', body: `${input.place}`, link: ex.threadId ? `/messages/${ex.threadId}` : '/home' })
}

export const completeExchange = (id: string) => updateDoc(doc(cols.exchanges, id), { status: 'completed', updatedAt: now() })
