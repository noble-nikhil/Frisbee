import { Timestamp, arrayRemove, arrayUnion, deleteDoc, runTransaction, updateDoc } from 'firebase/firestore'
import { tokenize, tagLabel, type Team, type TeamApplication, type TeamInput, type User } from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { createThread, joinThread, leaveThread } from '@/features/messaging/api'
import { notify } from '@/features/notifications/api'
import { db } from '@/lib/firebase'
import { cols, doc, now, set, subs } from '@/lib/firestore'

const roleId = () => Math.random().toString(36).slice(2, 8)

export async function createTeam(me: User, input: TeamInput) {
  const owner = toRef(me)
  const ref = doc(cols.teams)
  const threadId = await createThread('context', owner, input.name, { collection: 'teams', id: ref.id, title: input.name })
  const roles = input.roles.map((r) => ({ id: roleId(), ...r, filled: 0 }))
  await set(ref, {
    name: input.name,
    description: input.description,
    roles,
    teamSize: 1 + roles.reduce((n, r) => n + r.count, 0),
    deadline: Timestamp.fromDate(input.deadline),
    links: input.links,
    owner,
    memberIds: [me.uid],
    status: 'open',
    threadId,
    searchTokens: tokenize(input.name, input.description, roles.map((r) => r.title), roles.flatMap((r) => r.skills.map(tagLabel))),
    createdAt: now(),
  })
  await set(doc(subs.members('teams', ref.id), me.uid), { role: 'owner', name: me.displayName, photo: me.photoURL, joinedAt: now() })
  return ref.id
}

export const setTeamStatus = (id: string, status: Team['status']) => updateDoc(doc(cols.teams, id), { status })
export const deleteTeam = (id: string) => deleteDoc(doc(cols.teams, id))

export async function apply(t: Team, me: User, roleId: string, pitch: string) {
  await set(doc(subs.teamApplications(t.id), me.uid), { name: me.displayName, photo: me.photoURL, roleId, pitch, status: 'pending', createdAt: now() })
  const role = t.roles.find((r) => r.id === roleId)
  await notify({ to: t.owner.uid, type: 'team', title: `${me.displayName} applied to ${t.name}`, body: role ? `For ${role.title}` : '', link: `/teams/${t.id}` })
}

export const withdraw = (teamId: string, uid: string) => deleteDoc(doc(subs.teamApplications(teamId), uid))

/** Owner accepts: application → accepted, member added, role filled count bumped, team flips to filled when every role is. */
export async function accept(t: Team, a: TeamApplication) {
  const ref = doc(cols.teams, t.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh) throw new Error('This team was removed.')
    if (fresh.memberIds.includes(a.uid)) return
    const roles = fresh.roles.map((r) => (r.id === a.roleId ? { ...r, filled: r.filled + 1 } : r))
    const allFilled = roles.every((r) => r.filled >= r.count)
    tx.update(ref, { roles, memberIds: arrayUnion(a.uid), status: allFilled && fresh.status === 'open' ? 'filled' : fresh.status })
    tx.update(doc(subs.teamApplications(t.id), a.uid), { status: 'accepted' })
    tx.set(doc(subs.members('teams', t.id), a.uid), { uid: a.uid, role: 'member', name: a.name, photo: a.photo, joinedAt: now() })
  })
  await Promise.all([
    joinThread(t.threadId, { uid: a.uid, name: a.name, photo: a.photo }),
    notify({ to: a.uid, type: 'team', title: `You're on ${t.name}`, body: 'Say hello in the team chat.', link: `/teams/${t.id}` }),
  ])
}

export async function reject(t: Team, a: TeamApplication) {
  await updateDoc(doc(subs.teamApplications(t.id), a.uid), { status: 'rejected' })
  await notify({ to: a.uid, type: 'team', title: `${t.name}: not this time`, body: 'The team owner went with someone else for that role.', link: '/discover?tab=teams' })
}

/** A member leaves (or the owner removes them). Their role slot opens up again. */
export async function leaveTeam(t: Team, uid: string, roleId: string | null) {
  const ref = doc(cols.teams, t.id)
  await runTransaction(db, async (tx) => {
    const fresh = (await tx.get(ref)).data()
    if (!fresh || !fresh.memberIds.includes(uid)) return
    const roles = roleId ? fresh.roles.map((r) => (r.id === roleId ? { ...r, filled: Math.max(0, r.filled - 1) } : r)) : fresh.roles
    tx.update(ref, { memberIds: arrayRemove(uid), roles, status: fresh.status === 'filled' ? 'open' : fresh.status })
    tx.delete(doc(subs.members('teams', t.id), uid))
  })
  await Promise.all([leaveThread(t.threadId, uid), deleteDoc(doc(subs.teamApplications(t.id), uid)).catch(() => undefined)])
}
