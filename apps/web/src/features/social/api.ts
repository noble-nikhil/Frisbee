import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  getDoc,
  increment,
  runTransaction,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  tokenize,
  type Community,
  type CommunityRequest,
  type CommunityRequestInput,
  type Group,
  type GroupInput,
  type PollInput,
  type PostInput,
  type ReactionKind,
  type User,
  type UserRef,
} from '@frisbee/shared'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, set, subs, type Social } from '@/lib/firestore'
import { toRef } from '@/features/connections/api'
import { createThread, joinThread, leaveThread } from '@/features/messaging/api'
import { notify } from '@/features/notifications/api'

/** Groups and communities share one shape and one set of operations; `kind` picks the collection. */

export async function createGroup(me: User, input: GroupInput) {
  const creator = toRef(me)
  const ref = doc(cols.groups) // id first: the chat thread points back at the group
  const threadId = await createThread('group', creator, input.name, { collection: 'groups', id: ref.id, title: input.name })
  await set(ref, {
    ...input,
    coverURL: null,
    ownerId: me.uid,
    mods: [],
    memberIds: [me.uid],
    memberCount: 1,
    threadId,
    searchTokens: tokenize(input.name, input.category, input.description),
    createdAt: now(),
  })
  await set(doc(subs.members('groups', ref.id), me.uid), { role: 'owner', name: me.displayName, photo: me.photoURL, joinedAt: now() })
  await updateDoc(doc(cols.users, me.uid), { 'stats.groups': increment(1) })
  return ref.id
}

export async function join(kind: Social, g: Group | Community, me: User) {
  await runTransaction(db, async (tx) => {
    const ref = doc(cols[kind], g.id)
    const fresh = (await tx.get(ref)).data()
    if (!fresh || fresh.memberIds.includes(me.uid)) return
    tx.update(ref, { memberIds: arrayUnion(me.uid), memberCount: increment(1) })
    tx.set(doc(subs.members(kind, g.id), me.uid), { uid: me.uid, role: 'member', name: me.displayName, photo: me.photoURL, joinedAt: now() })
  })
  await Promise.all([
    joinThread(g.threadId, toRef(me)),
    updateDoc(doc(cols.users, me.uid), { 'stats.groups': increment(1) }),
    deleteDoc(doc(subs.joinRequests(kind, g.id), me.uid)).catch(() => undefined),
  ])
}

export async function leave(kind: Social, g: Group | Community, me: User) {
  if (g.ownerId === me.uid) throw new Error('Owners cannot leave. Transfer ownership or delete the group.')
  const batch = writeBatch(db)
  batch.update(doc(cols[kind], g.id), { memberIds: arrayRemove(me.uid), memberCount: increment(-1) })
  batch.delete(doc(subs.members(kind, g.id), me.uid))
  batch.update(doc(cols.users, me.uid), { 'stats.groups': increment(-1) })
  await batch.commit()
  await leaveThread(g.threadId, me.uid)
}

export async function requestToJoin(kind: Social, g: Group | Community, me: User, message = '') {
  await set(doc(subs.joinRequests(kind, g.id), me.uid), { name: me.displayName, photo: me.photoURL, message, status: 'pending', createdAt: now() })
  await notify({ to: [g.ownerId, ...g.mods], type: kind === 'groups' ? 'group' : 'community', title: `${me.displayName} wants to join ${g.name}`, body: message, link: `/${kind}/${g.id}?tab=members` })
}

export async function decideJoinRequest(kind: Social, g: Group | Community, uid: string, approve: boolean) {
  await updateDoc(doc(subs.joinRequests(kind, g.id), uid), { status: approve ? 'approved' : 'declined' })
  await notify({
    to: uid,
    type: kind === 'groups' ? 'group' : 'community',
    title: approve ? `You're in: ${g.name}` : `Request to ${g.name} declined`,
    body: approve ? 'Open the group to finish joining.' : '',
    link: `/${kind}/${g.id}`,
  })
}

/** Called by the requester after approval — completes the join (rules verify the approved request). */
export const completeApprovedJoin = join

export async function removeMember(kind: Social, g: Group | Community, uid: string) {
  const batch = writeBatch(db)
  batch.update(doc(cols[kind], g.id), { memberIds: arrayRemove(uid), memberCount: increment(-1) })
  batch.delete(doc(subs.members(kind, g.id), uid))
  await batch.commit()
  await leaveThread(g.threadId, uid)
}

export const setMemberRole = (kind: Social, g: Group | Community, uid: string, role: 'mod' | 'member') =>
  Promise.all([
    updateDoc(doc(subs.members(kind, g.id), uid), { role }),
    updateDoc(doc(cols[kind], g.id), { mods: role === 'mod' ? arrayUnion(uid) : arrayRemove(uid) }),
  ])

// Posts -----------------------------------------------------------------------

export async function createPost(kind: Social, id: string, author: UserRef, input: PostInput) {
  const ref = await add(subs.posts(kind, id), {
    author,
    text: input.text,
    imageURL: input.imageURL,
    reactions: { like: 0, heart: 0, fire: 0 },
    commentCount: 0,
    pinned: false,
    ...(input.channelId ? { channelId: input.channelId } : {}),
    createdAt: now(),
  })
  return ref.id
}

export const deletePost = (kind: Social, id: string, postId: string) => deleteDoc(doc(subs.posts(kind, id), postId))
export const pinPost = (kind: Social, id: string, postId: string, pinned: boolean) => updateDoc(doc(subs.posts(kind, id), postId), { pinned })

export async function addComment(kind: Social, id: string, postId: string, author: UserRef, text: string) {
  const batch = writeBatch(db)
  const commentRef = doc(subs.comments(kind, id, postId))
  batch.set(commentRef, { id: commentRef.id, author, text, createdAt: now() })
  batch.update(doc(subs.posts(kind, id), postId), { commentCount: increment(1) })
  await batch.commit()
}

/** Toggle: tapping the same reaction removes it; a different one swaps. */
export async function react(kind: Social, id: string, postId: string, uid: string, reaction: ReactionKind) {
  const mine = doc(subs.reactions(kind, id, postId), uid)
  const post = doc(subs.posts(kind, id), postId)
  await runTransaction(db, async (tx) => {
    const current = (await tx.get(mine)).data()?.kind as ReactionKind | undefined
    if (current === reaction) {
      tx.delete(mine)
      tx.update(post, { [`reactions.${reaction}`]: increment(-1) })
      return
    }
    tx.set(mine, { uid, kind: reaction })
    tx.update(post, {
      [`reactions.${reaction}`]: increment(1),
      ...(current ? { [`reactions.${current}`]: increment(-1) } : {}),
    })
  })
}

// Polls (communities only) ----------------------------------------------------

export async function createPoll(communityId: string, me: User, input: PollInput) {
  await add(subs.polls(communityId), {
    question: input.question,
    options: input.options.map((text, i) => ({ id: `o${i + 1}`, text, count: 0 })),
    multi: input.multi,
    anonymous: input.anonymous,
    closesAt: input.closesAt ? (input.closesAt as unknown as Community['createdAt']) : null,
    totalVotes: 0,
    createdBy: me.uid,
    createdAt: now(),
  })
}

export async function vote(communityId: string, pollId: string, uid: string, optionIds: string[]) {
  const pollRef = doc(subs.polls(communityId), pollId)
  const voteRef = doc(subs.votes(communityId, pollId), uid)
  await runTransaction(db, async (tx) => {
    const [poll, existing] = await Promise.all([tx.get(pollRef), tx.get(voteRef)])
    if (existing.exists()) throw new Error('You already voted')
    const p = poll.data()
    if (!p) throw new Error('Poll not found')
    if (p.closesAt && p.closesAt.toMillis() < Date.now()) throw new Error('This poll is closed')
    const chosen = p.multi ? optionIds : optionIds.slice(0, 1)
    tx.set(voteRef, { uid, optionIds: chosen })
    tx.update(pollRef, {
      options: p.options.map((o) => (chosen.includes(o.id) ? { ...o, count: o.count + 1 } : o)),
      totalVotes: increment(1),
    })
  })
}

export const closePoll = (communityId: string, pollId: string) =>
  updateDoc(doc(subs.polls(communityId), pollId), { closesAt: now() })

// Community requests ----------------------------------------------------------

export async function requestCommunity(me: User, input: CommunityRequestInput) {
  const ref = await add(cols.communityRequests, {
    ...input,
    requester: toRef(me),
    status: 'pending',
    reviewerId: null,
    note: '',
    createdAt: now(),
    decidedAt: null,
  })
  return ref.id
}

/** Admin approval creates the community with the requester as owner. */
export async function approveCommunityRequest(req: CommunityRequest, admin: User, note = '') {
  const requester = (await getDoc(doc(cols.users, req.requester.uid))).data()
  if (!requester) throw new Error('Requester no longer exists')
  const ref = doc(cols.communities)
  const threadId = await createThread('group', req.requester, req.name, { collection: 'communities', id: ref.id, title: req.name })
  await set(ref, {
    name: req.name,
    category: req.category,
    description: req.purpose,
    rules: req.rules,
    channels: [{ id: 'general', name: 'General' }],
    coverURL: null,
    visibility: 'public',
    ownerId: req.requester.uid,
    mods: [],
    memberIds: [req.requester.uid],
    memberCount: 1,
    threadId,
    searchTokens: tokenize(req.name, req.category, req.purpose),
    createdAt: now(),
  })
  await set(doc(subs.members('communities', ref.id), req.requester.uid), { role: 'owner', name: req.requester.name, photo: req.requester.photo, joinedAt: now() })
  await updateDoc(doc(cols.communityRequests, req.id), { status: 'approved', reviewerId: admin.uid, note, decidedAt: now() })
  await notify({ to: req.requester.uid, type: 'community', title: `${req.name} is live`, body: 'Your community was approved. You are its first admin.', link: `/communities/${ref.id}` })
  return ref.id
}

export async function rejectCommunityRequest(req: CommunityRequest, admin: User, note = '') {
  await updateDoc(doc(cols.communityRequests, req.id), { status: 'rejected', reviewerId: admin.uid, note, decidedAt: now() })
  await notify({ to: req.requester.uid, type: 'community', title: `Community request declined`, body: note || req.name, link: '/communities' })
}

export const addChannel = (communityId: string, name: string) =>
  updateDoc(doc(cols.communities, communityId), { channels: arrayUnion({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name }) })
