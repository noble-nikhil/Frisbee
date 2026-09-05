import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDocs, limit, query, where } from 'firebase/firestore'
import { rankMatches, skillSwap, type MatchItem, type User } from '@frisbee/shared'
import { cols } from '@/lib/firestore'

/**
 * Candidate pool: complete, visible profiles. A campus is small enough that
 * pulling ~300 docs and scoring on the client is faster than any server hop
 * and works offline from the persistent cache.
 */
export function useCandidates() {
  return useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const snap = await getDocs(
        query(cols.users, where('profileComplete', '==', true), where('privacy.profile', '==', 'everyone'), limit(300)),
      )
      return snap.docs.map((d) => d.data()).filter((u) => !u.suspended)
    },
    staleTime: 5 * 60_000,
  })
}

export interface MatchFilters {
  department?: string
  year?: number
}

export interface Match extends MatchItem {
  user: User
}

export function useMatches(me: User, hidden: Set<string>, filters: MatchFilters = {}, max = 50) {
  const candidates = useCandidates()
  const matches = useMemo<Match[]>(() => {
    const pool = (candidates.data ?? []).filter(
      (u) =>
        u.uid !== me.uid &&
        !hidden.has(u.uid) &&
        (!filters.department || u.department === filters.department) &&
        (!filters.year || u.year === filters.year),
    )
    const byUid = new Map(pool.map((u) => [u.uid, u]))
    return rankMatches(me, pool, max).map((m) => ({ ...m, user: byUid.get(m.uid)! }))
  }, [candidates.data, me, hidden, filters.department, filters.year, max])
  return { matches, loading: candidates.isLoading, error: candidates.error, refetch: candidates.refetch }
}

export function useSwaps(me: User, hidden: Set<string>) {
  const candidates = useCandidates()
  const swaps = useMemo(() => {
    return (candidates.data ?? [])
      .filter((u) => u.uid !== me.uid && !hidden.has(u.uid))
      .map((user) => ({ user, swap: skillSwap(me, user) }))
      .filter((x): x is { user: User; swap: NonNullable<ReturnType<typeof skillSwap>> } => !!x.swap)
      .sort((a, b) => b.swap.iTeach.length + b.swap.theyTeach.length - (a.swap.iTeach.length + a.swap.theyTeach.length))
  }, [candidates.data, me, hidden])
  return { swaps, loading: candidates.isLoading }
}
