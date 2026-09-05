import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Users } from 'lucide-react'
import { tagLabel } from '@frisbee/shared'
import { Button, Chip, EmptyState, Input, SkeletonList } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { useFilteredTeams, useOpenTeams, useWantedSkills, type TeamFilter } from './hooks'
import { TeamCard } from './team-card'

/** Embedded in Discover → Teams and reused by /teams (which has its own Post button in the header). */
export function TeamsBrowse({ showPost = true }: { showPost?: boolean }) {
  const me = useMe()
  const mySkills = me.skills.map((s) => s.tag)
  const [filter, setFilter] = useState<TeamFilter>({ q: '', skill: null, openOnly: true })
  const teams = useOpenTeams()
  const items = useFilteredTeams(teams.data, filter)
  const wanted = useWantedSkills(teams.data)
  const forMe = wanted.filter((s) => mySkills.includes(s))
  const chips = [...forMe, ...wanted.filter((s) => !forMe.includes(s))].slice(0, 12)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input aria-label="Search teams" placeholder="Search projects or roles" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} />
        {showPost && (
          <Link to="/teams?new=1">
            <Button variant="secondary" icon={<Plus className="size-4" />} className="h-11 md:h-10">
              Post
            </Button>
          </Link>
        )}
      </div>
      {chips.length > 0 && (
        <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <Chip selected={!filter.skill} onClick={() => setFilter((f) => ({ ...f, skill: null }))}>
            Any skill
          </Chip>
          {chips.map((s) => (
            <Chip key={s} selected={filter.skill === s} onClick={() => setFilter((f) => ({ ...f, skill: f.skill === s ? null : s }))}>
              {tagLabel(s)}
              {forMe.includes(s) ? ' · you' : ''}
            </Chip>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 text-small text-ink-2">
        <input type="checkbox" className="size-4 accent-brand-500" checked={filter.openOnly} onChange={(e) => setFilter((f) => ({ ...f, openOnly: e.target.checked }))} />
        Only teams still recruiting
      </label>
      {teams.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          text={filter.q || filter.skill ? 'No teams match those filters.' : 'No teams recruiting right now. Got a hackathon idea? Post it.'}
          action={
            <Link to="/teams?new=1">
              <Button variant="secondary" size="sm">
                Post a team
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <TeamCard key={t.id} t={t} highlight={mySkills} />
          ))}
        </div>
      )}
    </div>
  )
}
