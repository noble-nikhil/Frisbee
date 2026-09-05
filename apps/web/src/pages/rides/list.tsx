import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowRight, Car, Plus, Search } from 'lucide-react'
import { LIMITS, VEHICLES, VEHICLE_LABELS, rideSchema, type Ride } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, EmptyState, Input, PageHeader, Select, Sheet, SkeletonList, StatusChip, Tabs, Textarea, useTabParam, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { VerifiedGate } from '@/features/auth/verified-gate'
import { createRide } from '@/features/rides/api'
import { filterRides, useMyRides, useUpcomingRides, type RideFilter } from '@/features/rides/hooks'
import { useZodForm } from '@/lib/form'
import { friendlyError, when } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'

const TABS = ['browse', 'mine'] as const

export default function RidesPage() {
  const [tab, setTab] = useTabParam(TABS, 'browse')
  const [create, setCreate] = useState(false)
  return (
    <Page className="flex flex-col gap-4">
      <PageHeader
        title="Rides"
        description="Share a car, auto or cab. Drivers approve who joins."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>
            Offer
          </Button>
        }
      />
      <Tabs
        items={[
          { id: 'browse', label: 'Find a ride' },
          { id: 'mine', label: 'My rides' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'browse' ? <Browse onCreate={() => setCreate(true)} /> : <Mine />}
      <OfferSheet open={create} onClose={() => setCreate(false)} />
    </Page>
  )
}

const tone: Record<Ride['status'], { tone: 'open' | 'closed' | 'danger' | 'info'; label: string }> = {
  open: { tone: 'open', label: 'Open' },
  full: { tone: 'closed', label: 'Full' },
  departed: { tone: 'info', label: 'Departed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

export function RideCard({ r }: { r: Ride }) {
  const s = tone[r.status]
  return (
    <Link to={`/rides/${r.id}`}>
      <Card interactive className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-h3">
            <span className="truncate">{r.from}</span>
            <ArrowRight className="size-4 shrink-0 text-ink-3" />
            <span className="truncate">{r.to}</span>
          </div>
          <StatusChip tone={s.tone}>{s.label}</StatusChip>
        </div>
        <div className="text-small text-ink-2">
          {when(r.start)} · {VEHICLE_LABELS[r.vehicle]} · {r.seats - r.seatsTaken} of {r.seats} seats free
        </div>
        <div className="flex items-center justify-between text-small text-ink-3">
          <span>Driver: {r.driver.name}</span>
          {r.costNote && <span>{r.costNote}</span>}
        </div>
      </Card>
    </Link>
  )
}

function Browse({ onCreate }: { onCreate: () => void }) {
  const [filter, setFilter] = useState<RideFilter>({ from: '', to: '', date: '' })
  const rides = useUpcomingRides()
  const items = useMemo(() => filterRides(rides.data, filter).filter((r) => r.status === 'open' || r.status === 'full'), [rides.data, filter])
  const set = (k: keyof RideFilter) => (e: React.ChangeEvent<HTMLInputElement>) => setFilter((f) => ({ ...f, [k]: e.target.value }))
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Input aria-label="From" placeholder="From" value={filter.from} onChange={set('from')} />
        <Input aria-label="To" placeholder="To" value={filter.to} onChange={set('to')} />
        <Input aria-label="Date" type="date" value={filter.date} onChange={set('date')} className="col-span-2 md:col-span-1" />
      </div>
      {rides.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={filter.from || filter.to || filter.date ? Search : Car}
          text={filter.from || filter.to || filter.date ? 'No rides match. Try a wider search or a different day.' : 'No rides posted yet. Heading somewhere? Offer the empty seats.'}
          action={
            <Button variant="secondary" size="sm" onClick={onCreate}>
              Offer a ride
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((r) => (
            <RideCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function Mine() {
  const me = useMe()
  const mine = useMyRides(me.uid)
  const now = useNow()
  const upcoming = mine.data.filter((r) => r.start.toMillis() >= now - 3600_000 && r.status !== 'cancelled')
  const past = mine.data.filter((r) => !upcoming.includes(r))
  if (mine.loading) return <SkeletonList rows={3} card />
  if (mine.data.length === 0) return <EmptyState icon={Car} text="Rides you offer or join show up here, with your history." />
  return (
    <div className="flex flex-col gap-5">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Upcoming</h2>
          {upcoming.map((r) => (
            <RideCard key={r.id} r={r} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">History</h2>
          {past.map((r) => (
            <RideCard key={r.id} r={r} />
          ))}
        </section>
      )}
    </div>
  )
}

function OfferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nextHour] = useState(() => format(new Date(Date.now() + 3600_000), "yyyy-MM-dd'T'HH:00"))
  const form = useZodForm(rideSchema, {
    defaultValues: { from: 'SRM AP campus', to: '', start: nextHour, vehicle: undefined, seats: 3, note: '', costNote: '' },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createRide(me, v)
      onClose()
      navigate(`/rides/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Offer a ride"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Post ride
          </Button>
        </>
      }
    >
      <VerifiedGate what="offer rides">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input label="From" required error={form.formState.errors.from?.message} {...form.register('from')} />
          <Input label="To" required placeholder="e.g. Vijayawada railway station" error={form.formState.errors.to?.message} {...form.register('to')} />
          <Input label="Leaving at" required type="datetime-local" error={form.formState.errors.start?.message} {...form.register('start')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Vehicle" required placeholder="Select" defaultValue="" error={form.formState.errors.vehicle?.message} {...form.register('vehicle')}>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_LABELS[v]}
                </option>
              ))}
            </Select>
            <Input label="Free seats" required type="number" min={1} max={LIMITS.rideSeats} error={form.formState.errors.seats?.message} {...form.register('seats')} />
          </div>
          <Input label="Cost split" placeholder="e.g. ₹120 each, or free" hint="Just a note. No payments happen in the app." error={form.formState.errors.costNote?.message} {...form.register('costNote')} />
          <Textarea label="Note" rows={2} placeholder="Pickup point, luggage space, music policy" error={form.formState.errors.note?.message} {...form.register('note')} />
        </form>
      </VerifiedGate>
    </Sheet>
  )
}
