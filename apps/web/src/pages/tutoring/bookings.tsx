import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { CalendarCheck, Star } from 'lucide-react'
import { tagLabel, type Booking } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, EmptyState, PageHeader, Sheet, SkeletonList, StatusChip, Tabs, Textarea, useTabParam, useToast, type StatusTone } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { openDm } from '@/features/messaging/api'
import { cancelBooking, completeBooking, reviewBooking } from '@/features/tutoring/api'
import { useMyBookings } from '@/features/tutoring/hooks'
import { cn, friendlyError } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'

const TABS = ['upcoming', 'past'] as const
const TONE: Record<Booking['status'], StatusTone> = { pending_payment: 'pending', confirmed: 'open', completed: 'info', cancelled: 'closed' }
const LABEL: Record<Booking['status'], string> = { pending_payment: 'Unpaid', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }

export default function BookingsPage() {
  const me = useMe()
  const [tab, setTab] = useTabParam(TABS, 'upcoming')
  const all = useMyBookings(me.uid)
  const now = useNow()
  const upcoming = all.data.filter((b) => b.status !== 'cancelled' && b.status !== 'completed' && b.end.toMillis() >= now)
  const past = all.data.filter((b) => !upcoming.includes(b)).reverse()
  const items = tab === 'upcoming' ? upcoming : past

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="Sessions" description="Everything you have booked, and everything booked with you." back="/tutoring" />
      <Tabs
        items={[
          { id: 'upcoming', label: 'Upcoming', count: upcoming.length || undefined },
          { id: 'past', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {all.loading ? (
        <SkeletonList rows={3} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          text={tab === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions yet.'}
          action={
            <Link to="/tutoring">
              <Button variant="secondary" size="sm">
                Find a tutor
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </Page>
  )
}

function BookingCard({ b }: { b: Booking }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState(false)
  const iAmTutor = b.tutorId === me.uid
  const other = iAmTutor ? b.student : b.tutor
  const now = useNow()
  const started = b.start.toMillis() <= now
  const ended = b.end.toMillis() <= now

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Link to={iAmTutor ? `/people/${other.uid}` : `/tutoring/${other.uid}`}>
          <Avatar name={other.name} seed={other.uid} src={other.photo} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-h3">
              {tagLabel(b.skill)} {iAmTutor ? 'with' : 'by'} {other.name}
            </div>
            <StatusChip tone={TONE[b.status]}>{LABEL[b.status]}</StatusChip>
          </div>
          <div className="text-small text-ink-2">
            {format(b.start.toDate(), 'EEE d MMM, h:mm a')} – {format(b.end.toDate(), 'h:mm a')} · ₹{b.rate}
            {iAmTutor ? ' · you earn this' : b.payment.paidAt ? ' · paid (demo)' : ''}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDm(me, other).then((id) => navigate(`/messages/${id}`)).catch((e) => toast(friendlyError(e), 'error'))}>
          Message
        </Button>
        {b.status === 'confirmed' && !started && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => run(() => cancelBooking(b, me.uid), 'Session cancelled')}>
            Cancel
          </Button>
        )}
        {b.status === 'confirmed' && started && (
          <Button size="sm" loading={busy} onClick={() => run(() => completeBooking(b), 'Marked complete')}>
            Mark completed
          </Button>
        )}
        {b.status === 'pending_payment' && !iAmTutor && (
          <Link to={`/tutoring/${b.tutorId}`} className="contents">
            <Button size="sm">Finish booking</Button>
          </Link>
        )}
        {(b.status === 'completed' || (b.status === 'confirmed' && ended)) && !iAmTutor && !b.reviewed && (
          <Button size="sm" icon={<Star className="size-4" />} onClick={() => setReview(true)}>
            Leave a review
          </Button>
        )}
        {b.reviewed && !iAmTutor && <span className="self-center text-small text-ink-3">Reviewed</span>}
      </div>
      <ReviewSheet b={b} open={review} onClose={() => setReview(false)} />
    </Card>
  )
}

function ReviewSheet({ b, open, onClose }: { b: Booking; open: boolean; onClose: () => void }) {
  const me = useMe()
  const { toast } = useToast()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      await reviewBooking(b, me, rating, text.trim())
      toast('Thanks for the review', 'success')
      onClose()
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Rate ${b.tutor.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={submit}>
            Submit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Rating" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="rounded-sm p-1 hover:bg-canvas">
              <Star className={cn('size-7', n <= rating ? 'fill-teal-600 text-teal-600' : 'text-line-strong')} />
            </button>
          ))}
        </div>
        <Textarea label="What was it like?" rows={4} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional. Helps other students choose." />
      </div>
    </Sheet>
  )
}
