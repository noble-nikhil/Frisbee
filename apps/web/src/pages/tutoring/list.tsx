import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarCheck, GraduationCap, Star } from 'lucide-react'
import { normalise, tagLabel, type Tutor } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, EmptyState, Input, PageHeader, SkeletonList } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { useTutors } from '@/features/tutoring/hooks'

export default function TutoringPage() {
  const me = useMe()
  const tutors = useTutors()
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState<string | null>(null)
  const skills = useMemo(() => {
    const count = new Map<string, number>()
    for (const t of tutors.data) for (const s of t.skills) count.set(s, (count.get(s) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [tutors.data])
  const wanted = me.wantsToLearn
  const items = useMemo(() => {
    const nq = normalise(q)
    return tutors.data
      .filter((t) => t.uid !== me.uid)
      .filter((t) => !skill || t.skills.includes(skill))
      .filter((t) => !nq || t.searchTokens.some((tok) => tok.startsWith(nq)) || normalise(t.name).includes(nq))
      .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
  }, [tutors.data, q, skill, me.uid])

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader
        title="Tutoring"
        description="Verified student tutors. Book an hour, pay them directly."
        action={
          <div className="flex gap-2">
            <Link to="/tutoring/bookings">
              <Button size="sm" variant="secondary" icon={<CalendarCheck className="size-4" />}>
                Sessions
              </Button>
            </Link>
            {!me.roles.tutor && (
              <Link to="/tutoring/apply">
                <Button size="sm">Become a tutor</Button>
              </Link>
            )}
          </div>
        }
      />
      {me.roles.tutor && (
        <Card className="flex items-center justify-between gap-3">
          <div className="text-small text-ink-2">You are a verified tutor. Students see your profile when they search.</div>
          <Link to={`/tutoring/${me.uid}`}>
            <Button size="sm" variant="secondary">
              My tutor page
            </Button>
          </Link>
        </Card>
      )}
      <Input aria-label="Search tutors" placeholder="Search by subject or name" value={q} onChange={(e) => setQ(e.target.value)} />
      {skills.length > 0 && (
        <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <Chip selected={!skill} onClick={() => setSkill(null)}>
            All subjects
          </Chip>
          {[...skills.filter((s) => wanted.includes(s)), ...skills.filter((s) => !wanted.includes(s))].slice(0, 15).map((s) => (
            <Chip key={s} selected={skill === s} onClick={() => setSkill(skill === s ? null : s)}>
              {tagLabel(s)}
              {wanted.includes(s) ? ' · you want this' : ''}
            </Chip>
          ))}
        </div>
      )}
      {tutors.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          text={q || skill ? 'No tutors match that yet.' : 'No tutors yet. Know a subject well? Apply and an admin will verify you.'}
          action={
            !me.roles.tutor ? (
              <Link to="/tutoring/apply">
                <Button variant="secondary" size="sm">
                  Apply as a tutor
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <TutorCard key={t.uid} t={t} wanted={wanted} />
          ))}
        </div>
      )}
    </Page>
  )
}

export function Rating({ avg, count, size = 'sm' }: { avg: number; count: number; size?: 'sm' | 'md' }) {
  if (count === 0) return <span className={`text-ink-3 ${size === 'sm' ? 'text-small' : 'text-body'}`}>No ratings yet</span>
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-small' : 'text-body'} text-ink-2`}>
      <Star className="size-3.5 fill-teal-600 text-teal-600" aria-hidden />
      <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
      <span className="text-ink-3">({count})</span>
    </span>
  )
}

function TutorCard({ t, wanted }: { t: Tutor; wanted: string[] }) {
  return (
    <Link to={`/tutoring/${t.uid}`}>
      <Card interactive className="flex h-full gap-3">
        <Avatar name={t.name} seed={t.uid} src={t.photo} size={56} verified={t.verifiedStudent} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-h3">{t.name}</div>
            <span className="shrink-0 text-small font-semibold tabular-nums">₹{t.hourlyRate}/hr</span>
          </div>
          <Rating avg={t.ratingAvg} count={t.ratingCount} />
          <p className="line-clamp-2 text-small text-ink-2">{t.bio}</p>
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {t.skills.slice(0, 4).map((s) => (
              <Chip key={s} className="h-6" selected={wanted.includes(s)}>
                {tagLabel(s)}
              </Chip>
            ))}
            {t.skills.length > 4 && <span className="text-small text-ink-3">+{t.skills.length - 4}</span>}
          </div>
        </div>
      </Card>
    </Link>
  )
}
