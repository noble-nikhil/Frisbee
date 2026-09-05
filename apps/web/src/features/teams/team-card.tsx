import { Link } from 'react-router'
import { formatDistanceToNowStrict } from 'date-fns'
import { tagLabel, type Team } from '@frisbee/shared'
import { Card, Chip, StatusChip } from '@/components/ui'
import { useNow } from '@/hooks/use-now'

const tone: Record<Team['status'], { tone: 'open' | 'closed' | 'info'; label: string }> = {
  open: { tone: 'open', label: 'Recruiting' },
  filled: { tone: 'info', label: 'Team full' },
  closed: { tone: 'closed', label: 'Closed' },
}

export function TeamCard({ t, highlight = [] }: { t: Team; highlight?: string[] }) {
  const openRoles = t.roles.filter((r) => r.filled < r.count)
  const deadline = t.deadline.toDate()
  const now = useNow()
  const soon = deadline.getTime() - now < 3 * 86400_000
  return (
    <Link to={`/teams/${t.id}`}>
      <Card interactive className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3">{t.name}</h3>
          <StatusChip tone={tone[t.status].tone}>{tone[t.status].label}</StatusChip>
        </div>
        <p className="line-clamp-2 text-small text-ink-2">{t.description}</p>
        <div className="flex flex-col gap-1">
          {openRoles.slice(0, 3).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-1 text-small">
              <span className="font-semibold text-ink">
                {r.count - r.filled} × {r.title}
              </span>
              {r.skills.map((s) => (
                <Chip key={s} className="h-5 px-1.5 text-micro" selected={highlight.includes(s)}>
                  {tagLabel(s)}
                </Chip>
              ))}
            </div>
          ))}
          {openRoles.length > 3 && <span className="text-small text-ink-3">+{openRoles.length - 3} more roles</span>}
        </div>
        <div className={`mt-auto pt-1 text-small ${soon ? 'text-warning' : 'text-ink-3'}`}>
          {t.memberIds.length}/{t.teamSize} on board · apply within {formatDistanceToNowStrict(deadline)} · {t.owner.name}
        </div>
      </Card>
    </Link>
  )
}
