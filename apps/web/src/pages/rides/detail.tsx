import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowRight, Calendar, Car, Flag, IndianRupee, MessageSquare, Trash2, Users } from 'lucide-react'
import { VEHICLE_LABELS, type Ride } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, ErrorState, IconButton, ListRow, PageHeader, Skeleton, StatusChip, Textarea, useToast } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { approveSeat, declineSeat, deleteRide, leaveRide, requestSeat, setRideStatus, withdrawRequest } from '@/features/rides/api'
import { useMyRideRequest, useRide, useRideRequests } from '@/features/rides/hooks'
import { ReportSheet } from '@/features/safety/report-sheet'
import { useDoc } from '@/hooks/use-collection'
import { cols, doc } from '@/lib/firestore'
import { friendlyError, when } from '@/lib/utils'

const tone: Record<Ride['status'], { tone: 'open' | 'closed' | 'danger' | 'info'; label: string }> = {
  open: { tone: 'open', label: 'Open' },
  full: { tone: 'closed', label: 'Full' },
  departed: { tone: 'info', label: 'Departed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

export default function RideDetailPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(false)
  const [message, setMessage] = useState('')
  const ride = useRide(id)
  const r = ride.data
  const isDriver = !!r && r.driver.uid === me.uid
  const requests = useRideRequests(id, isDriver)
  const myRequest = useMyRideRequest(id, me.uid)
  const inRide = !!r && (isDriver || r.passengerIds.includes(me.uid))
  // The ride chat's memberInfo doubles as the passenger list (readable by everyone in the ride).
  const thread = useDoc(inRide ? doc(cols.threads, r.threadId) : null, `ride-thread:${r?.threadId ?? ''}`)

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

  if (ride.loading)
    return (
      <Page className="flex flex-col gap-3">
        <PageHeader title="" back="/rides" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </Page>
    )
  if (!r)
    return (
      <Page>
        <PageHeader title="" back="/rides" />
        <ErrorState error="This ride was removed." />
      </Page>
    )

  const isPassenger = r.passengerIds.includes(me.uid)
  const pending = requests.data.filter((q) => q.status === 'pending')
  const free = r.seats - r.seatsTaken
  const passengers = Object.entries(thread.data?.memberInfo ?? {}).filter(([uid]) => r.passengerIds.includes(uid))

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/rides" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={tone[r.status].tone}>{tone[r.status].label}</StatusChip>
              <StatusChip tone="closed">{VEHICLE_LABELS[r.vehicle]}</StatusChip>
            </div>
            <h1 className="mt-2 flex flex-wrap items-center gap-2 text-h1">
              <span>{r.from}</span>
              <ArrowRight className="size-5 text-ink-3" />
              <span>{r.to}</span>
            </h1>
          </div>
          <div className="flex gap-1">
            {!isDriver && (
              <IconButton aria-label="Report" size="sm" onClick={() => setReport(true)}>
                <Flag className="size-4" />
              </IconButton>
            )}
            {(isDriver || isAdmin) && (
              <IconButton aria-label="Delete" size="sm" onClick={() => run(async () => (await deleteRide(r.id), navigate('/rides')))}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        </div>
        <Fact icon={Calendar}>{when(r.start)}</Fact>
        <Fact icon={Users}>
          {free} of {r.seats} seats free
        </Fact>
        {r.costNote && <Fact icon={IndianRupee}>{r.costNote}</Fact>}
        {r.note && <p className="text-body whitespace-pre-line text-ink-2">{r.note}</p>}
        <Link to={`/people/${r.driver.uid}`} className="flex items-center gap-2 text-small text-ink-2">
          <Avatar name={r.driver.name} seed={r.driver.uid} src={r.driver.photo} size={24} /> Driver: {r.driver.name}
        </Link>

        {isDriver || isPassenger ? (
          <div className="flex gap-2">
            <Link to={`/messages/${r.threadId}`} className="flex-1">
              <Button full variant="secondary" icon={<MessageSquare className="size-4" />}>
                Ride chat
              </Button>
            </Link>
            {isPassenger && r.status !== 'departed' && (
              <Button variant="ghost" loading={busy} onClick={() => run(() => leaveRide(r, me.uid), 'You left the ride')}>
                Drop out
              </Button>
            )}
          </div>
        ) : r.status === 'open' ? (
          myRequest.data?.status === 'pending' ? (
            <div className="flex gap-2">
              <Button variant="secondary" disabled full>
                Waiting for the driver
              </Button>
              <Button variant="ghost" loading={busy} onClick={() => run(() => withdrawRequest(r.id, me.uid), 'Request withdrawn')}>
                Withdraw
              </Button>
            </div>
          ) : myRequest.data?.status === 'declined' ? (
            <p className="text-small text-ink-3">The driver declined your request.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Textarea rows={2} placeholder="Pickup point or anything the driver should know (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} />
              <Button loading={busy} onClick={() => run(() => requestSeat(r, me, message.trim()), 'Request sent to the driver')}>
                Request a seat
              </Button>
            </div>
          )
        ) : (
          <p className="text-small text-ink-3">{r.status === 'full' ? 'All seats are taken.' : 'This ride is no longer taking passengers.'}</p>
        )}

        {isDriver && r.status !== 'cancelled' && (
          <Card className="flex flex-col gap-3">
            <h2 className="eyebrow">Driver controls</h2>
            <div className="flex flex-wrap gap-2">
              {r.status !== 'departed' && (
                <Button size="sm" variant="secondary" icon={<Car className="size-4" />} loading={busy} onClick={() => run(() => setRideStatus(r, 'departed'), 'Marked as departed')}>
                  Mark departed
                </Button>
              )}
              {r.status === 'departed' ? (
                <Button size="sm" variant="ghost" loading={busy} onClick={() => run(() => setRideStatus(r, free > 0 ? 'open' : 'full'))}>
                  Reopen
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-danger" loading={busy} onClick={() => run(() => setRideStatus(r, 'cancelled'), 'Ride cancelled')}>
                  Cancel ride
                </Button>
              )}
            </div>
          </Card>
        )}

        {isDriver && pending.length > 0 && (
          <section>
            <h2 className="eyebrow mb-2">Seat requests</h2>
            <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
              {pending.map((q) => (
                <ListRow
                  key={q.uid}
                  leading={<Avatar name={q.name} seed={q.uid} src={q.photo} size={32} />}
                  title={<Link to={`/people/${q.uid}`}>{q.name}</Link>}
                  meta={q.message || 'No message'}
                  trailing={
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => declineSeat(r, q.uid))}>
                        Decline
                      </Button>
                      <Button size="sm" disabled={free <= 0} loading={busy} onClick={() => run(() => approveSeat(r, q.uid, q.name), `${q.name} is in`)}>
                        Approve
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        )}

        {(isDriver || isPassenger) && passengers.length > 0 && (
          <section>
            <h2 className="eyebrow mb-2">Passengers ({r.seatsTaken})</h2>
            <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
              {passengers.map(([uid, info]) => (
                <ListRow
                  key={uid}
                  to={`/people/${uid}`}
                  leading={<Avatar name={info.name} seed={uid} src={info.photo} size={32} />}
                  title={uid === me.uid ? `${info.name} (you)` : info.name}
                  trailing={
                    isDriver &&
                    r.status !== 'departed' && (
                      <Button size="sm" variant="ghost" onClick={() => run(() => leaveRide(r, uid), 'Passenger removed')}>
                        Remove
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'rides', id: r.id, ownerId: r.driver.uid, label: `${r.from} → ${r.to}` }} />
    </Page>
  )
}

function Fact({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-body text-ink-2">
      <Icon className="size-4 shrink-0 text-ink-3" />
      <span>{children}</span>
    </div>
  )
}
