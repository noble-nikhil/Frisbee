import { Link } from 'react-router'
import { Calendar, Lock, MapPin, Users } from 'lucide-react'
import { EVENT_CATEGORY_LABELS, type Activity, type Event, type Hangout } from '@frisbee/shared'
import { Card, Chip, StatusChip } from '@/components/ui'
import { when } from '@/lib/utils'

function Row({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-small text-ink-2">
      <Icon className="size-3.5 shrink-0 text-ink-3" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function ActivityCard({ a }: { a: Activity }) {
  const full = !!a.capacity && a.goingCount >= a.capacity
  return (
    <Link to={`/happening/activities/${a.id}`}>
      <Card interactive className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3">{a.title}</h3>
          {full && <StatusChip tone="closed">Full</StatusChip>}
        </div>
        <div className="flex flex-col gap-1">
          <Row icon={Calendar}>{when(a.start)}</Row>
          <Row icon={MapPin}>{a.location}</Row>
          <Row icon={Users}>
            {a.goingCount} going{a.capacity ? ` · ${a.capacity} max` : ''}
          </Row>
        </div>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {a.tags.map((t) => (
            <Chip key={t} className="h-6">
              {t}
            </Chip>
          ))}
        </div>
      </Card>
    </Link>
  )
}

const hangoutTone: Record<Hangout['status'], { tone: 'open' | 'closed' | 'danger'; label: string }> = {
  open: { tone: 'open', label: 'Open' },
  full: { tone: 'closed', label: 'Full' },
  closed: { tone: 'closed', label: 'Closed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

export function HangoutCard({ h }: { h: Hangout }) {
  const s = hangoutTone[h.status]
  return (
    <Link to={`/happening/hangouts/${h.id}`}>
      <Card interactive className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-micro font-semibold uppercase tracking-wide text-ink-3">{h.type}</div>
            <h3 className="text-h3">{h.title}</h3>
          </div>
          <StatusChip tone={s.tone}>{s.label}</StatusChip>
        </div>
        <div className="flex flex-col gap-1">
          <Row icon={Calendar}>{when(h.start)}</Row>
          <Row icon={MapPin}>{h.venue}</Row>
          <Row icon={Users}>
            {h.memberCount}/{h.limit} seats
            {h.visibility === 'invite' && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                <Lock className="size-3" /> invite only
              </span>
            )}
          </Row>
        </div>
        <div className="mt-auto pt-1 text-small text-ink-3">
          Hosted by {h.createdBy.name}
          {h.joinMode === 'request' ? ' · approval needed' : ''}
        </div>
      </Card>
    </Link>
  )
}

export function EventCard({ e }: { e: Event }) {
  const left = e.capacity - e.goingCount
  return (
    <Link to={`/happening/events/${e.id}`}>
      <Card interactive className="flex h-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-micro font-semibold uppercase tracking-wide text-ink-3">{EVENT_CATEGORY_LABELS[e.category]}</div>
            <h3 className="text-h3">{e.title}</h3>
          </div>
          {left <= 0 ? <StatusChip tone="pending">Waitlist</StatusChip> : left <= 5 ? <StatusChip tone="live">{left} left</StatusChip> : null}
        </div>
        <div className="flex flex-col gap-1">
          <Row icon={Calendar}>{when(e.start)}</Row>
          <Row icon={MapPin}>{e.venue}</Row>
          <Row icon={Users}>
            {e.goingCount}/{e.capacity} going{e.waitlistCount ? ` · ${e.waitlistCount} waiting` : ''}
          </Row>
        </div>
        <div className="mt-auto pt-1 text-small text-ink-3">By {e.organiser.name}</div>
      </Card>
    </Link>
  )
}
