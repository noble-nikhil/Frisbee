import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeftRight, Filter, Users } from 'lucide-react'
import { DEPARTMENTS, YEARS, tagLabel } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, ListRow, PageHeader, Select, Sheet, SkeletonList, Tabs, useTabParam, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { respondToRequest, withdrawRequest } from '@/features/connections/api'
import { useConnections, useIncomingRequests, useOutgoingRequests } from '@/features/connections/hooks'
import { useMatches, useSwaps, type MatchFilters } from '@/features/matching/hooks'
import { MatchCard } from '@/features/matching/match-card'
import { useLocalSet } from '@/hooks/use-local-set'
import { friendlyError, yearLabel } from '@/lib/utils'
import { TeamsBrowse } from '@/features/teams/browse'

const TABS = ['people', 'swap', 'teams', 'requests'] as const

export default function DiscoverPage() {
  const me = useMe()
  const [tab, setTab] = useTabParam(TABS, 'people')
  const incoming = useIncomingRequests(me.uid)

  return (
    <Page>
      <PageHeader title="Discover" />
      <Tabs
        items={[
          { id: 'people', label: 'People' },
          { id: 'swap', label: 'Skill swap' },
          { id: 'teams', label: 'Teams' },
          { id: 'requests', label: 'Requests', count: incoming.data.length || undefined },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      {tab === 'people' && <PeopleTab />}
      {tab === 'swap' && <SwapTab />}
      {tab === 'teams' && <TeamsBrowse />}
      {tab === 'requests' && <RequestsTab />}
    </Page>
  )
}

function PeopleTab() {
  const me = useMe()
  const skipped = useLocalSet('frisbee.skipped')
  const connections = useConnections(me.uid)
  const outgoing = useOutgoingRequests(me.uid)
  const [filters, setFilters] = useState<MatchFilters>({})
  const [open, setOpen] = useState(false)
  const hidden = useMemo(() => new Set([...skipped.set, ...connections.set]), [skipped.set, connections.set])
  const { matches, loading, error, refetch } = useMatches(me, hidden, filters)
  const outgoingSet = useMemo(() => new Set(outgoing.data.map((r) => r.to)), [outgoing.data])
  const active = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon={<Filter className="size-4" />} onClick={() => setOpen(true)}>
          Filter{active ? ` · ${active}` : ''}
        </Button>
        {filters.department && <Chip selected onRemove={() => setFilters((f) => ({ ...f, department: undefined }))}>{filters.department}</Chip>}
        {filters.year && <Chip selected onRemove={() => setFilters((f) => ({ ...f, year: undefined }))}>{yearLabel(filters.year)}</Chip>}
        {skipped.set.size > 0 && (
          <button type="button" onClick={skipped.clear} className="ml-auto text-small text-ink-3 hover:text-ink-2">
            Show {skipped.set.size} skipped
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={4} card />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : matches.length === 0 ? (
        <EmptyState icon={Users} text={active ? 'No one matches those filters yet.' : 'No matches yet. Add more tags or check back soon.'} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.uid} match={m} state={outgoingSet.has(m.uid) ? 'requested' : 'none'} onSkip={skipped.add} />
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter people"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFilters({})}>
              Clear
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="Department" value={filters.department ?? ''} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value || undefined }))}>
            <option value="">Any</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
          <Select label="Year" value={filters.year ?? ''} onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) || undefined }))}>
            <option value="">Any</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {yearLabel(y)}
              </option>
            ))}
          </Select>
        </div>
      </Sheet>
    </div>
  )
}

function SwapTab() {
  const me = useMe()
  const skipped = useLocalSet('frisbee.skipped')
  const { swaps, loading } = useSwaps(me, skipped.set)

  if (!me.canTeach.length || !me.wantsToLearn.length)
    return (
      <EmptyState
        icon={ArrowLeftRight}
        text="Add at least one skill you can teach and one you want to learn — swaps are matched both ways."
        action={
          <Link to="/me/edit">
            <Button variant="secondary" size="sm">
              Edit skills
            </Button>
          </Link>
        }
      />
    )
  if (loading) return <SkeletonList rows={4} card />
  if (!swaps.length) return <EmptyState icon={ArrowLeftRight} text="No reciprocal swaps yet. They appear when someone wants what you teach and teaches what you want." />

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {swaps.map(({ user, swap }) => (
        <Card key={user.uid}>
          <div className="flex items-center gap-3">
            <Avatar name={user.displayName} seed={user.uid} src={user.photoURL} size={40} verified={user.roles.verifiedStudent} />
            <div className="min-w-0 flex-1">
              <Link to={`/people/${user.uid}`} className="block truncate text-h3 hover:underline">
                {user.displayName}
              </Link>
              <p className="truncate text-small text-ink-2">
                {user.department}
                {user.year ? ` · ${yearLabel(user.year)}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-small">
            <div>
              <div className="eyebrow mb-1">You teach</div>
              <div className="flex flex-wrap gap-1">
                {swap.iTeach.map((t) => (
                  <Chip key={t}>{tagLabel(t)}</Chip>
                ))}
              </div>
            </div>
            <ArrowLeftRight className="size-4 text-ink-3" />
            <div>
              <div className="eyebrow mb-1">They teach</div>
              <div className="flex flex-wrap gap-1">
                {swap.theyTeach.map((t) => (
                  <Chip key={t}>{tagLabel(t)}</Chip>
                ))}
              </div>
            </div>
          </div>
          <Link to={`/people/${user.uid}?swap=1`} className="mt-3 block">
            <Button size="sm" full>
              Propose a swap
            </Button>
          </Link>
        </Card>
      ))}
    </div>
  )
}

function RequestsTab() {
  const me = useMe()
  const incoming = useIncomingRequests(me.uid)
  const outgoing = useOutgoingRequests(me.uid)
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (fn: () => Promise<unknown>, id: string, ok: string) => {
    setBusy(id)
    try {
      await fn()
      toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  if (incoming.loading) return <SkeletonList rows={3} />

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="eyebrow mb-2">Received</h2>
        {incoming.data.length === 0 ? (
          <p className="text-small text-ink-3">No pending requests.</p>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {incoming.data.map((r) => (
              <ListRow
                key={r.id}
                leading={
                  <Link to={`/people/${r.from}`}>
                    <Avatar name={r.fromRef.name} seed={r.from} src={r.fromRef.photo} />
                  </Link>
                }
                title={<Link to={`/people/${r.from}`}>{r.fromRef.name}</Link>}
                meta={r.message || 'Wants to connect'}
                trailing={
                  <div className="flex gap-1">
                    <Button size="sm" loading={busy === r.id} onClick={() => act(() => respondToRequest(r, me, true), r.id, `You're connected with ${r.fromRef.name}`)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => act(() => respondToRequest(r, me, false), r.id, 'Declined')}>
                      Decline
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="eyebrow mb-2">Sent</h2>
        {outgoing.data.length === 0 ? (
          <p className="text-small text-ink-3">Nothing pending.</p>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {outgoing.data.map((r) => (
              <ListRow
                key={r.id}
                leading={<Avatar name={r.toRef.name} seed={r.to} src={r.toRef.photo} />}
                title={r.toRef.name}
                meta="Pending"
                trailing={
                  <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => act(() => withdrawRequest(r.id), r.id, 'Request withdrawn')}>
                    Withdraw
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
