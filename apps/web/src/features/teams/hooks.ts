import { useMemo } from 'react'
import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import type { Team } from '@frisbee/shared'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'

export const useOpenTeams = () => useCollection(query(cols.teams, where('deadline', '>=', Timestamp.now()), orderBy('deadline'), limit(100)), 'teams:open')
export const useTeam = (id: string) => useDoc(doc(cols.teams, id), `team:${id}`)
export const useTeamMembers = (id: string) => useCollection(query(subs.members('teams', id), orderBy('joinedAt')), `team-members:${id}`)
export const useApplications = (id: string, enabled: boolean) =>
  useCollection(enabled ? query(subs.teamApplications(id), orderBy('createdAt')) : null, `team-apps:${id}:${enabled}`)
export const useMyApplication = (id: string, uid: string) => useDoc(doc(subs.teamApplications(id), uid), `team-myapp:${id}:${uid}`)
export const useMyTeams = (uid: string) => useCollection(query(cols.teams, where('memberIds', 'array-contains', uid), limit(50)), `teams:mine:${uid}`)

export interface TeamFilter {
  q: string
  skill: string | null
  openOnly: boolean
}

export function useFilteredTeams(teams: Team[], f: TeamFilter) {
  return useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return teams.filter((t) => {
      if (f.openOnly && t.status !== 'open') return false
      if (f.skill && !t.roles.some((r) => r.skills.includes(f.skill!))) return false
      if (q && !`${t.name} ${t.description} ${t.roles.map((r) => r.title).join(' ')}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [teams, f.q, f.skill, f.openOnly])
}

/** Skills that appear in at least one open role, most wanted first. */
export function useWantedSkills(teams: Team[]) {
  return useMemo(() => {
    const count = new Map<string, number>()
    for (const t of teams) for (const r of t.roles) if (r.filled < r.count) for (const s of r.skills) count.set(s, (count.get(s) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [teams])
}
