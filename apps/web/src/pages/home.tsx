import { useMemo } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { ShieldCheck, Users } from 'lucide-react'
import { Page } from '@/components/layout/app-shell'
import { MODULES } from '@/components/layout/nav'
import { Button, Card, EmptyState, ListRow, Section, Skeleton, SkeletonList, StatusChip } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { useConnections, useIncomingRequests, useOutgoingRequests } from '@/features/connections/hooks'
import { useMatches } from '@/features/matching/hooks'
import { MatchCard } from '@/features/matching/match-card'
import { InstallCard } from '@/features/pwa/install'
import { useLocalSet } from '@/hooks/use-local-set'
import { cols } from '@/lib/firestore'
import { when } from '@/lib/utils'
import { Avatar } from '@/components/ui'

interface Upcoming {
  id: string
  kind: 'activities' | 'hangouts' | 'events'
  title: string
  start: Date
  venue: string
  meta: string
}

function useUpcoming() {
  return useQuery({
    queryKey: ['home-upcoming'],
    queryFn: async (): Promise<Upcoming[]> => {
      const nowTs = Timestamp.now()
      const [acts, hangs, events] = await Promise.all([
        getDocs(query(cols.activities, where('start', '>=', nowTs), orderBy('start'), limit(5))),
        getDocs(query(cols.hangouts, where('start', '>=', nowTs), orderBy('start'), limit(5))),
        getDocs(query(cols.events, where('start', '>=', nowTs), orderBy('start'), limit(5))),
      ])
      const items: Upcoming[] = [
        ...acts.docs.map((d) => {
          const a = d.data()
          return { id: a.id, kind: 'activities' as const, title: a.title, start: a.start.toDate(), venue: a.location, meta: `${a.goingCount} going` }
        }),
        ...hangs.docs
          .map((d) => d.data())
          .filter((h) => h.status === 'open' || h.status === 'full')
          .map((h) => ({ id: h.id, kind: 'hangouts' as const, title: h.title, start: h.start.toDate(), venue: h.venue, meta: `${h.memberCount}/${h.limit}` })),
        ...events.docs.map((d) => {
          const e = d.data()
          return { id: e.id, kind: 'events' as const, title: e.title, start: e.start.toDate(), venue: e.venue, meta: `${e.goingCount} going` }
        }),
      ]
      return items.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 6)
    },
  })
}

export default function HomePage() {
  const me = useMe()
  const { isCollegeEmail, isVerified } = useAuth()
  const skipped = useLocalSet('frisbee.skipped')
  const connections = useConnections(me.uid)
  const incoming = useIncomingRequests(me.uid)
  const outgoing = useOutgoingRequests(me.uid)
  const hidden = useMemo(() => new Set([...skipped.set, ...connections.set]), [skipped.set, connections.set])
  const { matches, loading } = useMatches(me, hidden, {}, 6)
  const upcoming = useUpcoming()
  const outgoingSet = useMemo(() => new Set(outgoing.data.map((r) => r.to)), [outgoing.data])

  const firstName = me.displayName.split(' ')[0]

  return (
    <Page className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">Hi {firstName}</h1>
        <p className="text-small text-ink-2">Here's what's moving on campus.</p>
      </div>

      {isCollegeEmail && !isVerified && (
        <div className="flex items-center gap-3 rounded-md border border-line bg-warning-bg px-3 py-2.5 text-small">
          <ShieldCheck className="size-4 shrink-0 text-warning" />
          <span className="flex-1 text-ink-2">Verify your college email to unlock rides, tutoring and communities.</span>
          <Link to="/verify" className="font-semibold text-brand-700">
            Verify
          </Link>
        </div>
      )}

      <InstallCard />

      {incoming.data.length > 0 && (
        <Section title="Connection requests" to="/discover?tab=requests" linkLabel="View all">
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {incoming.data.slice(0, 3).map((r) => (
              <ListRow
                key={r.id}
                to={`/people/${r.from}`}
                leading={<Avatar name={r.fromRef.name} seed={r.from} src={r.fromRef.photo} />}
                title={r.fromRef.name}
                meta={r.message || 'Wants to connect'}
                chevron
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Top matches" to="/discover">
        {loading ? (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-60 shrink-0" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              text="No matches yet. Add a few more tags to your profile, or check back once more students join."
              action={
                <Link to="/me/edit">
                  <Button variant="secondary" size="sm">
                    Edit tags
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="hide-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {matches.map((m) => (
              <MatchCard key={m.uid} match={m} compact state={outgoingSet.has(m.uid) ? 'requested' : 'none'} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Today & upcoming" to="/happening">
        {upcoming.isLoading ? (
          <SkeletonList rows={3} />
        ) : upcoming.data && upcoming.data.length > 0 ? (
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {upcoming.data.map((u) => (
              <ListRow
                key={`${u.kind}-${u.id}`}
                to={`/happening/${u.kind}/${u.id}`}
                leading={
                  <div className="w-16 shrink-0 text-small text-ink-2">{when(u.start).replace(', ', '\n')}</div>
                }
                title={u.title}
                meta={u.venue}
                trailing={<StatusChip tone={u.kind === 'events' ? 'live' : u.kind === 'hangouts' ? 'open' : 'info'}>{u.meta}</StatusChip>}
              />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-small text-ink-2">Nothing scheduled yet. Be the first — post an activity or a hangout.</p>
            <Link to="/happening" className="mt-2 inline-block text-small font-semibold text-brand-700">
              Open Happening
            </Link>
          </Card>
        )}
      </Section>

      <Section title="Modules">
        <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
          {MODULES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-surface px-1 py-3 text-center text-small text-ink-2 transition-colors hover:border-line-strong"
            >
              <m.icon className="size-6 text-ink" strokeWidth={1.5} />
              <span className="truncate text-[12px] leading-4">{m.label}</span>
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  )
}
