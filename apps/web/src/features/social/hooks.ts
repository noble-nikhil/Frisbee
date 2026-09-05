import { useMemo } from 'react'
import { limit, orderBy, query, where } from 'firebase/firestore'
import type { Community, Group } from '@frisbee/shared'
import { useCollection, useDoc, type State } from '@/hooks/use-collection'
import { cols, doc, subs, type Social } from '@/lib/firestore'

export function useSocial<K extends Social>(kind: K, id: string): State<(K extends 'communities' ? Community : Group) | null> {
  return useDoc(doc(cols[kind], id), `${kind}:${id}`) as State<(K extends 'communities' ? Community : Group) | null>
}

export const useMembers = (kind: Social, id: string) =>
  useCollection(query(subs.members(kind, id), orderBy('joinedAt', 'asc'), limit(200)), `${kind}-members:${id}`)

export const useJoinRequests = (kind: Social, id: string, enabled: boolean) =>
  useCollection(enabled ? query(subs.joinRequests(kind, id), where('status', '==', 'pending')) : null, `${kind}-requests:${id}:${enabled}`)

export const useMyJoinRequest = (kind: Social, id: string, uid: string) =>
  useDoc(doc(subs.joinRequests(kind, id), uid), `${kind}-myreq:${id}:${uid}`)

export const usePosts = (kind: Social, id: string, channelId?: string) =>
  useCollection(
    channelId
      ? query(subs.posts(kind, id), where('channelId', '==', channelId), orderBy('createdAt', 'desc'), limit(50))
      : query(subs.posts(kind, id), orderBy('createdAt', 'desc'), limit(50)),
    `${kind}-posts:${id}:${channelId ?? 'all'}`,
  )

export const useComments = (kind: Social, id: string, postId: string, open: boolean) =>
  useCollection(open ? query(subs.comments(kind, id, postId), orderBy('createdAt', 'asc'), limit(100)) : null, `comments:${postId}:${open}`)

export const useMyReaction = (kind: Social, id: string, postId: string, uid: string) =>
  useDoc(doc(subs.reactions(kind, id, postId), uid), `reaction:${postId}:${uid}`)

export const usePolls = (communityId: string) =>
  useCollection(query(subs.polls(communityId), orderBy('createdAt', 'desc'), limit(20)), `polls:${communityId}`)

export const useMyVote = (communityId: string, pollId: string, uid: string) =>
  useDoc(doc(subs.votes(communityId, pollId), uid), `vote:${pollId}:${uid}`)

export const useMyGroups = (kind: Social, uid: string) =>
  useCollection(query(cols[kind], where('memberIds', 'array-contains', uid), limit(50)), `my-${kind}:${uid}`)

// Equality-only or order-only queries: no composite indexes to deploy. Sorting happens client-side.
export function useBrowse(kind: Social, category: string | null) {
  const state = useCollection(
    category ? query(cols[kind], where('category', '==', category), limit(50)) : query(cols[kind], orderBy('memberCount', 'desc'), limit(50)),
    `browse-${kind}:${category ?? 'all'}`,
  )
  const data = useMemo(() => [...state.data].sort((a, b) => b.memberCount - a.memberCount), [state.data])
  return { ...state, data }
}
