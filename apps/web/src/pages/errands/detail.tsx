import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { format } from 'date-fns'
import { Calendar, Clock, Flag, Package, Plus, Trash2 } from 'lucide-react'
import { tripItemSchema, type ItemStatus, type Trip, type TripItem } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, ErrorState, IconButton, Input, PageHeader, Sheet, Skeleton, StatusChip, Textarea, useToast, type StatusTone } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { cancelItem, deleteTrip, requestItem, setItemStatus, setTripStatus } from '@/features/errands/api'
import { useTrip, useTripItems } from '@/features/errands/hooks'
import { ReportSheet } from '@/features/safety/report-sheet'
import { useZodForm } from '@/lib/form'
import { cn, friendlyError, timeAgo } from '@/lib/utils'

const STEPS: ItemStatus[] = ['requested', 'accepted', 'picked_up', 'delivered']
const LABEL: Record<ItemStatus, string> = { requested: 'Requested', accepted: 'Accepted', declined: 'Declined', picked_up: 'Picked up', delivered: 'Delivered', cancelled: 'Cancelled' }
const TONE: Record<ItemStatus, StatusTone> = { requested: 'pending', accepted: 'info', declined: 'danger', picked_up: 'live', delivered: 'open', cancelled: 'closed' }

export default function TripDetailPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [report, setReport] = useState(false)
  const [ask, setAsk] = useState(false)
  const trip = useTrip(id)
  const items = useTripItems(id)

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  if (trip.loading)
    return (
      <Page className="flex flex-col gap-3">
        <PageHeader title="" back="/errands" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </Page>
    )
  const t = trip.data
  if (!t)
    return (
      <Page>
        <PageHeader title="" back="/errands" />
        <ErrorState error="This trip was removed." />
      </Page>
    )
  const isTraveller = t.traveller.uid === me.uid
  const d = t.date.toDate()
  const visible = isTraveller ? items.data : items.data.filter((i) => i.requester.uid === me.uid)
  const others = isTraveller ? 0 : items.data.length - visible.length
  const slotsLeft = t.maxItems - t.itemCount

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/errands" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusChip tone={t.status === 'open' ? 'open' : t.status === 'done' ? 'info' : 'closed'}>{t.status === 'open' ? 'Taking requests' : t.status === 'done' ? 'Done' : 'Closed'}</StatusChip>
            <h1 className="mt-2 text-h1">
              {isTraveller ? 'You' : t.traveller.name} → {t.city}
            </h1>
          </div>
          <div className="flex gap-1">
            {!isTraveller && (
              <IconButton aria-label="Report" size="sm" onClick={() => setReport(true)}>
                <Flag className="size-4" />
              </IconButton>
            )}
            {(isTraveller || isAdmin) && (
              <IconButton aria-label="Delete" size="sm" onClick={() => run('delete', async () => (await deleteTrip(t.id), navigate('/errands')))}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        </div>
        <Fact icon={Calendar}>{format(d, 'EEEE d MMMM, h:mm a')}</Fact>
        <Fact icon={Clock}>Back by {t.returnTime}</Fact>
        <Fact icon={Package}>
          {t.itemCount}/{t.maxItems} items · {slotsLeft > 0 ? `${slotsLeft} left` : 'full'}
        </Fact>
        {t.note && <p className="text-body whitespace-pre-line text-ink-2">{t.note}</p>}
        <Link to={`/people/${t.traveller.uid}`} className="flex items-center gap-2 text-small text-ink-2">
          <Avatar name={t.traveller.name} seed={t.traveller.uid} src={t.traveller.photo} size={24} /> {t.traveller.name}
        </Link>

        {isTraveller ? (
          <Card className="flex flex-col gap-2">
            <h2 className="eyebrow">Your trip</h2>
            <div className="flex flex-wrap gap-2">
              {t.status === 'open' ? (
                <Button size="sm" variant="secondary" loading={busy === 'status'} onClick={() => run('status', () => setTripStatus(t.id, 'closed'), 'No more requests')}>
                  Stop taking requests
                </Button>
              ) : t.status === 'closed' ? (
                <Button size="sm" variant="secondary" loading={busy === 'status'} onClick={() => run('status', () => setTripStatus(t.id, 'open'), 'Open again')}>
                  Reopen requests
                </Button>
              ) : null}
              {t.status !== 'done' && (
                <Button size="sm" variant="ghost" loading={busy === 'status'} onClick={() => run('status', () => setTripStatus(t.id, 'done'), 'Trip marked done')}>
                  Mark trip done
                </Button>
              )}
            </div>
          </Card>
        ) : t.status === 'open' && slotsLeft > 0 ? (
          <Button icon={<Plus className="size-4" />} onClick={() => setAsk(true)}>
            Ask for something
          </Button>
        ) : (
          <p className="text-small text-ink-3">{t.status === 'open' ? 'The traveller has hit their item limit.' : 'This trip is not taking requests.'}</p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="eyebrow">{isTraveller ? `Requests (${items.data.length})` : 'Your requests'}</h2>
        {visible.length === 0 && <p className="py-6 text-center text-small text-ink-3">{isTraveller ? 'Nothing yet. Requests appear here as people add them.' : 'You have not asked for anything on this trip.'}</p>}
        {visible.map((i) => (
          <ItemCard key={i.id} t={t} item={i} isTraveller={isTraveller} busy={busy === i.id} onAction={(fn, ok) => run(i.id, fn, ok)} />
        ))}
        {others > 0 && <p className="text-small text-ink-3">{others} other {others === 1 ? 'request' : 'requests'} from other people.</p>}
      </section>

      <AskSheet trip={t} open={ask} onClose={() => setAsk(false)} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'trips', id: t.id, ownerId: t.traveller.uid, label: `${t.traveller.name} → ${t.city}` }} />
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

function ItemCard({ t, item, isTraveller, busy, onAction }: { t: Trip; item: TripItem; isTraveller: boolean; busy: boolean; onAction: (fn: () => Promise<unknown>, ok?: string) => void }) {
  const idx = STEPS.indexOf(item.status)
  const terminal = item.status === 'declined' || item.status === 'cancelled'
  const next: ItemStatus | null = item.status === 'requested' ? 'accepted' : item.status === 'accepted' ? 'picked_up' : item.status === 'picked_up' ? 'delivered' : null
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-h3">
            {item.qty > 1 ? `${item.qty} × ` : ''}
            {item.item}
          </div>
          <div className="text-small text-ink-3">
            {isTraveller ? `${item.requester.name} · ` : ''}
            {item.where ? `${item.where} · ` : ''}
            {item.approxCost ? `~${item.approxCost} · ` : ''}
            {timeAgo(item.createdAt)}
          </div>
          {item.note && <p className="mt-1 text-small text-ink-2">{item.note}</p>}
        </div>
        <StatusChip tone={TONE[item.status]}>{LABEL[item.status]}</StatusChip>
      </div>
      {!terminal && (
        <ol className="flex items-center gap-1" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-1">
              <span className={cn('h-1 flex-1 rounded-full', i <= idx ? 'bg-teal-600' : 'bg-line')} />
            </li>
          ))}
        </ol>
      )}
      {isTraveller && !terminal && item.status !== 'delivered' && (
        <div className="flex gap-2">
          {item.status === 'requested' && (
            <Button size="sm" variant="secondary" loading={busy} onClick={() => onAction(() => setItemStatus(t, item, 'declined'))}>
              Decline
            </Button>
          )}
          {next && (
            <Button size="sm" loading={busy} onClick={() => onAction(() => setItemStatus(t, item, next), `Marked ${LABEL[next].toLowerCase()}`)}>
              {next === 'accepted' ? 'Accept' : next === 'picked_up' ? 'Picked up' : 'Delivered'}
            </Button>
          )}
        </div>
      )}
      {!isTraveller && (item.status === 'requested' || item.status === 'accepted') && (
        <Button size="sm" variant="ghost" className="self-start" loading={busy} onClick={() => onAction(() => cancelItem(t, item), 'Request cancelled')}>
          Cancel request
        </Button>
      )}
    </Card>
  )
}

function AskSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const me = useMe()
  const { toast } = useToast()
  const form = useZodForm(tripItemSchema, { defaultValues: { item: '', qty: 1, approxCost: '', where: '', note: '' } })
  const submit = form.handleSubmit(async (v) => {
    try {
      await requestItem(trip, me, v)
      form.reset()
      onClose()
      toast('Request sent to the traveller', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ask for something"
      description={`${trip.traveller.name} is going to ${trip.city}. Keep it small and specific.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Send request
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Input label="Item" required placeholder="e.g. Type-C cable" error={form.formState.errors.item?.message} {...form.register('item')} />
          <Input label="Qty" type="number" min={1} max={20} error={form.formState.errors.qty?.message} {...form.register('qty')} />
        </div>
        <Input label="Where to get it" placeholder="Shop or area, if you know" error={form.formState.errors.where?.message} {...form.register('where')} />
        <Input label="Approx cost" placeholder="e.g. ₹250" hint="You settle up in person. Nothing is charged here." error={form.formState.errors.approxCost?.message} {...form.register('approxCost')} />
        <Textarea label="Note" rows={2} error={form.formState.errors.note?.message} {...form.register('note')} />
      </form>
    </Sheet>
  )
}
