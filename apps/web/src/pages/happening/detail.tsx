import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Calendar, Check, Flag, Link2, MapPin, MessageSquare, Trash2, Users } from 'lucide-react'
import { EVENT_CATEGORY_LABELS, type Hangout } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, ErrorState, IconButton, ListRow, PageHeader, Skeleton, StatusChip, Textarea, useToast } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { toRef } from '@/features/connections/api'
import {
  cancelRsvp,
  decideHangoutRequest,
  deleteActivity,
  deleteEvent,
  joinHangout,
  leaveHangout,
  postEventUpdate,
  requestHangout,
  rsvpActivity,
  rsvpEvent,
  setHangoutStatus,
  type HappeningKind,
} from '@/features/happening/api'
import {
  useActivity,
  useEvent,
  useEventUpdates,
  useHangout,
  useHangoutMembers,
  useHangoutRequests,
  useMyHangoutRequest,
  useMyRsvp,
  useRsvps,
} from '@/features/happening/hooks'
import { ReportSheet } from '@/features/safety/report-sheet'
import { friendlyError, plural, timeAgo, when } from '@/lib/utils'

const KINDS: HappeningKind[] = ['activities', 'hangouts', 'events']

export default function HappeningDetailPage() {
  const { kind = '', id = '' } = useParams()
  if (!KINDS.includes(kind as HappeningKind) || !id)
    return (
      <Page>
        <PageHeader title="Not found" back="/happening" />
        <ErrorState error="That link doesn't point anywhere." />
      </Page>
    )
  if (kind === 'activities') return <ActivityDetail id={id} />
  if (kind === 'hangouts') return <HangoutDetail id={id} />
  return <EventDetail id={id} />
}

function Loading({ back }: { back: string }) {
  return (
    <Page className="flex flex-col gap-3">
      <PageHeader title="" back={back} />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </Page>
  )
}

function Missing({ back, what }: { back: string; what: string }) {
  return (
    <Page>
      <PageHeader title="" back={back} />
      <ErrorState error={`This ${what} was removed.`} />
    </Page>
  )
}

function Fact({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-body text-ink-2">
      <Icon className="size-4 shrink-0 text-ink-3" />
      <span>{children}</span>
    </div>
  )
}

function OwnerTools({ onDelete, report }: { onDelete?: () => void; report?: () => void }) {
  return (
    <div className="flex gap-1">
      {report && (
        <IconButton aria-label="Report" size="sm" onClick={report}>
          <Flag className="size-4" />
        </IconButton>
      )}
      {onDelete && (
        <IconButton aria-label="Delete" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" />
        </IconButton>
      )}
    </div>
  )
}

function useAction() {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

function PeopleList({ people, title }: { people: { uid: string; name: string; photo: string | null; label?: string }[]; title: string }) {
  if (people.length === 0) return null
  return (
    <section>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
        {people.map((p) => (
          <ListRow key={p.uid} to={`/people/${p.uid}`} leading={<Avatar name={p.name} seed={p.uid} src={p.photo} size={32} />} title={p.name} trailing={p.label && <span className="text-small text-ink-3">{p.label}</span>} />
        ))}
      </div>
    </section>
  )
}

// Activity --------------------------------------------------------------------

function ActivityDetail({ id }: { id: string }) {
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { busy, run } = useAction()
  const [report, setReport] = useState(false)
  const activity = useActivity(id)
  const rsvps = useRsvps('activities', id)
  const mine = useMyRsvp('activities', id, me.uid)
  if (activity.loading) return <Loading back="/happening" />
  const a = activity.data
  if (!a) return <Missing back="/happening" what="activity" />
  const owner = a.createdBy.uid === me.uid
  const going = !!mine.data
  const full = !!a.capacity && a.goingCount >= a.capacity

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/happening" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-1">
              {a.tags.map((t) => (
                <Chip key={t} className="h-6">
                  {t}
                </Chip>
              ))}
            </div>
            <h1 className="mt-2 text-h1">{a.title}</h1>
          </div>
          <OwnerTools
            onDelete={owner || isAdmin ? () => run(async () => (await deleteActivity(a.id), navigate('/happening'))) : undefined}
            report={owner ? undefined : () => setReport(true)}
          />
        </div>
        <Fact icon={Calendar}>{when(a.start)}</Fact>
        <Fact icon={MapPin}>{a.location}</Fact>
        <Fact icon={Users}>
          {plural(a.goingCount, 'person going', 'people going')}
          {a.capacity ? ` · ${a.capacity} max` : ''}
        </Fact>
        {a.description && <p className="text-body whitespace-pre-line text-ink-2">{a.description}</p>}
        <Link to={`/people/${a.createdBy.uid}`} className="flex items-center gap-2 text-small text-ink-2">
          <Avatar name={a.createdBy.name} seed={a.createdBy.uid} src={a.createdBy.photo} size={24} /> Posted by {a.createdBy.name}
        </Link>
        {going ? (
          <Button variant="secondary" icon={<Check className="size-4" />} loading={busy} onClick={() => run(() => rsvpActivity(a, me, false), 'RSVP removed')}>
            You're going · tap to cancel
          </Button>
        ) : (
          <Button loading={busy} disabled={full} onClick={() => run(() => rsvpActivity(a, me, true), 'See you there')}>
            {full ? 'Full' : "I'm in"}
          </Button>
        )}
      </div>
      <PeopleList title="Going" people={rsvps.data} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'activities', id: a.id, ownerId: a.createdBy.uid, label: a.title }} />
    </Page>
  )
}

// Hangout ---------------------------------------------------------------------

function HangoutDetail({ id }: { id: string }) {
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { busy, run } = useAction()
  const [report, setReport] = useState(false)
  const [message, setMessage] = useState('')
  const hangout = useHangout(id)
  const members = useHangoutMembers(id)
  const h = hangout.data
  const isHost = !!h && h.createdBy.uid === me.uid
  const requests = useHangoutRequests(id, isHost)
  const myRequest = useMyHangoutRequest(id, me.uid)
  if (hangout.loading) return <Loading back="/happening?tab=hangouts" />
  if (!h) return <Missing back="/happening?tab=hangouts" what="hangout" />
  const isMember = members.data.some((m) => m.uid === me.uid)
  const approved = myRequest.data?.status === 'approved'
  const pending = myRequest.data?.status === 'pending'
  const canJoin = h.status === 'open' && (h.joinMode === 'instant' || approved)
  const status: Record<Hangout['status'], { tone: 'open' | 'closed' | 'danger'; label: string }> = {
    open: { tone: 'open', label: `${h.limit - h.memberCount} seats left` },
    full: { tone: 'closed', label: 'Full' },
    closed: { tone: 'closed', label: 'Closed' },
    cancelled: { tone: 'danger', label: 'Cancelled' },
  }
  const inviteLink = `${window.location.origin}/happening/hangouts/${h.id}`

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/happening?tab=hangouts" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone="closed">{h.type}</StatusChip>
              <StatusChip tone={status[h.status].tone}>{status[h.status].label}</StatusChip>
              {h.visibility === 'invite' && <StatusChip tone="info">Invite only</StatusChip>}
            </div>
            <h1 className="mt-2 text-h1">{h.title}</h1>
          </div>
          <OwnerTools
            onDelete={isAdmin && !isHost ? () => run(async () => (await setHangoutStatus(h, 'cancelled'), navigate('/happening?tab=hangouts'))) : undefined}
            report={isHost ? undefined : () => setReport(true)}
          />
        </div>
        <Fact icon={Calendar}>{when(h.start)}</Fact>
        <Fact icon={MapPin}>{h.venue}</Fact>
        <Fact icon={Users}>
          {h.memberCount}/{h.limit} · {h.joinMode === 'instant' ? 'instant join' : 'host approves'}
        </Fact>

        {isMember ? (
          <div className="flex gap-2">
            <Link to={`/messages/${h.threadId}`} className="flex-1">
              <Button full variant="secondary" icon={<MessageSquare className="size-4" />}>
                Chat
              </Button>
            </Link>
            {!isHost && h.status !== 'cancelled' && (
              <Button variant="ghost" loading={busy} onClick={() => run(() => leaveHangout(h, me), 'You left the hangout')}>
                Leave
              </Button>
            )}
          </div>
        ) : h.status === 'open' ? (
          canJoin ? (
            <Button loading={busy} onClick={() => run(() => joinHangout(h, me), 'Seat confirmed')}>
              {approved ? 'Confirm my seat' : 'Join'}
            </Button>
          ) : pending ? (
            <Button variant="secondary" disabled>
              Request sent
            </Button>
          ) : myRequest.data?.status === 'declined' ? (
            <p className="text-small text-ink-3">The host declined your request.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Textarea rows={2} placeholder="Say hi to the host (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} />
              <Button loading={busy} onClick={() => run(() => requestHangout(h, me, message.trim()), 'Request sent')}>
                Ask to join
              </Button>
            </div>
          )
        ) : null}

        {isHost && (
          <Card className="flex flex-col gap-3">
            <h2 className="eyebrow">Host controls</h2>
            {h.visibility === 'invite' && (
              <div className="flex items-center justify-between gap-2 text-small">
                <span className="text-ink-2">Invite link</span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Link2 className="size-4" />}
                  onClick={() =>
                    navigator.clipboard
                      .writeText(inviteLink)
                      .then(() => toast('Link copied', 'success'))
                      .catch(() => toast(inviteLink, 'info'))
                  }
                >
                  Copy
                </Button>
              </div>
            )}
            {h.status !== 'cancelled' && (
              <div className="flex gap-2">
                {h.status === 'closed' ? (
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => setHangoutStatus(h, h.memberCount >= h.limit ? 'full' : 'open'), 'Reopened')}>
                    Reopen
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => setHangoutStatus(h, 'closed'), 'Closed to new people')}>
                    Close joining
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-danger" loading={busy} onClick={() => run(() => setHangoutStatus(h, 'cancelled'), 'Hangout cancelled')}>
                  Cancel hangout
                </Button>
              </div>
            )}
          </Card>
        )}

        {isHost && requests.data.length > 0 && (
          <section>
            <h2 className="eyebrow mb-2">Requests</h2>
            <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
              {requests.data.map((r) => (
                <ListRow
                  key={r.uid}
                  leading={<Avatar name={r.name} seed={r.uid} src={r.photo} size={32} />}
                  title={r.name}
                  meta={r.message || 'No message'}
                  trailing={
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => run(() => decideHangoutRequest(h, r.uid, false))}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => run(() => decideHangoutRequest(h, r.uid, true))}>
                        Approve
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <PeopleList title={`Going (${h.memberCount})`} people={members.data.map((m) => ({ ...m, label: m.role === 'owner' ? 'Host' : undefined }))} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'hangouts', id: h.id, ownerId: h.createdBy.uid, label: h.title }} />
    </Page>
  )
}

// Event -----------------------------------------------------------------------

function EventDetail({ id }: { id: string }) {
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { busy, run } = useAction()
  const [report, setReport] = useState(false)
  const [update, setUpdate] = useState('')
  const event = useEvent(id)
  const rsvps = useRsvps('events', id)
  const mine = useMyRsvp('events', id, me.uid)
  const updates = useEventUpdates(id)
  if (event.loading) return <Loading back="/happening?tab=events" />
  const e = event.data
  if (!e) return <Missing back="/happening?tab=events" what="event" />
  const organiser = e.createdBy === me.uid
  const left = e.capacity - e.goingCount
  const going = rsvps.data.filter((r) => r.status === 'going')
  const waiting = rsvps.data.filter((r) => r.status === 'waitlisted').sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/happening?tab=events" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone="closed">{EVENT_CATEGORY_LABELS[e.category]}</StatusChip>
              {left <= 0 ? <StatusChip tone="pending">Waitlist open</StatusChip> : <StatusChip tone="open">{left} seats left</StatusChip>}
            </div>
            <h1 className="mt-2 text-h1">{e.title}</h1>
            <p className="text-small text-ink-3">By {e.organiser.name}</p>
          </div>
          <OwnerTools
            onDelete={organiser || isAdmin ? () => run(async () => (await deleteEvent(e.id), navigate('/happening?tab=events'))) : undefined}
            report={organiser ? undefined : () => setReport(true)}
          />
        </div>
        <Fact icon={Calendar}>
          {when(e.start)} – {when(e.end).replace(/^(Today|Tomorrow), /, '')}
        </Fact>
        <Fact icon={MapPin}>{e.venue}</Fact>
        <Fact icon={Users}>
          {e.goingCount}/{e.capacity} going{e.waitlistCount ? ` · ${e.waitlistCount} on the waitlist` : ''}
        </Fact>
        {e.description && <p className="text-body whitespace-pre-line text-ink-2">{e.description}</p>}

        {mine.data ? (
          <div className="flex flex-col gap-2">
            <StatusChip tone={mine.data.status === 'going' ? 'open' : 'pending'} className="self-start">
              {mine.data.status === 'going' ? "You're going" : `Waitlist #${mine.data.position}`}
            </StatusChip>
            <Button variant="secondary" loading={busy} onClick={() => run(() => cancelRsvp(e, me), 'RSVP cancelled')}>
              Cancel RSVP
            </Button>
          </div>
        ) : (
          <Button
            loading={busy}
            onClick={() =>
              run(async () => {
                const r = await rsvpEvent(e, me)
                return r
              }, left > 0 ? 'Seat confirmed' : 'Added to the waitlist')
            }
          >
            {left > 0 ? 'RSVP' : 'Join waitlist'}
          </Button>
        )}
      </div>

      {(organiser || updates.data.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Announcements</h2>
          {organiser && (
            <Card className="flex flex-col gap-2">
              <Textarea rows={2} placeholder="Post an update to everyone who RSVP'd" value={update} onChange={(ev) => setUpdate(ev.target.value)} maxLength={500} />
              <Button size="sm" className="self-end" disabled={!update.trim()} loading={busy} onClick={() => run(async () => (await postEventUpdate(e, toRef(me), update.trim()), setUpdate('')), 'Sent to attendees')}>
                Post
              </Button>
            </Card>
          )}
          {updates.data.map((u) => (
            <Card key={u.id} className="flex flex-col gap-1">
              <p className="text-body whitespace-pre-line">{u.text}</p>
              <span className="text-micro text-ink-3">
                {u.author.name} · {timeAgo(u.createdAt)}
              </span>
            </Card>
          ))}
        </section>
      )}

      <PeopleList title={`Going (${going.length})`} people={going} />
      <PeopleList title={`Waitlist (${waiting.length})`} people={waiting.map((w) => ({ ...w, label: `#${w.position}` }))} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'events', id: e.id, ownerId: e.createdBy, label: e.title }} />
    </Page>
  )
}

