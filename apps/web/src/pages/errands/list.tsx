import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { Plus, ShoppingBag } from 'lucide-react'
import { ERRAND_CITIES, LIMITS, tripSchema, type Trip } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, Chip, EmptyState, Input, PageHeader, Select, Sheet, SkeletonList, StatusChip, Tabs, Textarea, useTabParam, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { createTrip } from '@/features/errands/api'
import { sortTrips, useMyTrips, useTripsIRequested, useUpcomingTrips } from '@/features/errands/hooks'
import { useZodForm } from '@/lib/form'
import { friendlyError, plural } from '@/lib/utils'

const TABS = ['trips', 'mine'] as const

export default function ErrandsPage() {
  const [tab, setTab] = useTabParam(TABS, 'trips')
  const [create, setCreate] = useState(false)
  return (
    <Page className="flex flex-col gap-4">
      <PageHeader
        title="Errands"
        description="Going to town? Bring something back for someone."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>
            Post trip
          </Button>
        }
      />
      <Tabs
        items={[
          { id: 'trips', label: 'Upcoming trips' },
          { id: 'mine', label: 'Mine' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'trips' ? <Upcoming onCreate={() => setCreate(true)} /> : <Mine />}
      <TripSheet open={create} onClose={() => setCreate(false)} />
    </Page>
  )
}

const tone: Record<Trip['status'], { tone: 'open' | 'closed' | 'info'; label: string }> = {
  open: { tone: 'open', label: 'Taking requests' },
  closed: { tone: 'closed', label: 'Closed' },
  done: { tone: 'info', label: 'Done' },
}

export function TripCard({ t }: { t: Trip }) {
  const d = t.date.toDate()
  return (
    <Link to={`/errands/${t.id}`}>
      <Card interactive className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3">
            {t.traveller.name} → {t.city}
          </h3>
          <StatusChip tone={tone[t.status].tone}>{tone[t.status].label}</StatusChip>
        </div>
        <div className="text-small text-ink-2">
          {format(d, 'EEE d MMM')} · back by {t.returnTime} · {t.itemCount}/{t.maxItems} items
        </div>
        {t.note && <p className="line-clamp-2 text-small text-ink-3">{t.note}</p>}
      </Card>
    </Link>
  )
}

function Upcoming({ onCreate }: { onCreate: () => void }) {
  const [city, setCity] = useState<string | null>(null)
  const trips = useUpcomingTrips()
  const items = useMemo(() => trips.data.filter((t) => (!city || t.city === city) && t.status === 'open'), [trips.data, city])
  return (
    <div className="flex flex-col gap-3">
      <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        <Chip selected={!city} onClick={() => setCity(null)}>
          Anywhere
        </Chip>
        {ERRAND_CITIES.map((c) => (
          <Chip key={c} selected={city === c} onClick={() => setCity(city === c ? null : c)}>
            {c}
          </Chip>
        ))}
      </div>
      {trips.loading ? (
        <SkeletonList rows={3} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          text={city ? `Nobody is heading to ${city} soon.` : 'No trips posted. If you are heading out, let people know.'}
          action={
            <Button variant="secondary" size="sm" onClick={onCreate}>
              Post a trip
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <TripCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function Mine() {
  const me = useMe()
  const mine = useMyTrips(me.uid)
  const requested = useTripsIRequested(me.uid)
  if (mine.loading || requested.loading) return <SkeletonList rows={3} card />
  if (mine.data.length + requested.data.length === 0) return <EmptyState icon={ShoppingBag} text="Trips you post and items you ask for show up here." />
  return (
    <div className="flex flex-col gap-5">
      {mine.data.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Your trips</h2>
          {sortTrips(mine.data)
            .reverse()
            .map((t) => (
              <TripCard key={t.id} t={t} />
            ))}
        </section>
      )}
      {requested.data.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">{plural(requested.data.length, 'trip')} you asked from</h2>
          {sortTrips(requested.data)
            .reverse()
            .map((t) => (
              <TripCard key={t.id} t={t} />
            ))}
        </section>
      )}
    </div>
  )
}

function TripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [tomorrow] = useState(() => format(new Date(Date.now() + 86400_000), "yyyy-MM-dd'T'10:00"))
  const form = useZodForm(tripSchema, {
    defaultValues: { city: undefined, date: tomorrow, returnTime: '18:00', maxItems: 5, note: '' },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createTrip(me, v)
      onClose()
      navigate(`/errands/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Post a trip"
      description="People attach small requests. You accept the ones you can manage."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Post
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Select label="Going to" required placeholder="Select" defaultValue="" error={form.formState.errors.city?.message} {...form.register('city')}>
            {ERRAND_CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Leaving" required type="datetime-local" error={form.formState.errors.date?.message} {...form.register('date')} />
            <Input label="Back by" required type="time" error={form.formState.errors.returnTime?.message} {...form.register('returnTime')} />
          </div>
          <Input label="Max items" required type="number" min={1} max={LIMITS.errandItems} hint="How many things you are willing to carry" error={form.formState.errors.maxItems?.message} {...form.register('maxItems')} />
          <Textarea label="Note" rows={2} placeholder="e.g. Going by bike, nothing bulky. Near Besant Road mostly." error={form.formState.errors.note?.message} {...form.register('note')} />
      </form>
    </Sheet>
  )
}
