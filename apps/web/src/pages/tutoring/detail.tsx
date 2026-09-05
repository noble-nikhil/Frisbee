import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { format, isSameDay } from 'date-fns'
import { CreditCard, Flag, MessageSquare, Star } from 'lucide-react'
import { DAY_LABELS, tagLabel, type Booking, type Tutor } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, ErrorState, IconButton, PageHeader, Select, Sheet, Skeleton, StatusChip, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { openDm } from '@/features/messaging/api'
import { ReportSheet } from '@/features/safety/report-sheet'
import { cancelBooking, confirmPayment, createBooking, openSlots, slotId, updateTutor } from '@/features/tutoring/api'
import { useBookedSlots, useBooking, useReviews, useTutor } from '@/features/tutoring/hooks'
import { cn, friendlyError, timeAgo } from '@/lib/utils'
import { Rating } from './list'

export default function TutorDetailPage() {
  const { tutorId = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const tutor = useTutor(tutorId)
  const reviews = useReviews(tutorId)
  const booked = useBookedSlots(tutorId)
  const [report, setReport] = useState(false)
  const [picked, setPicked] = useState<Date | null>(null)
  const [skill, setSkill] = useState('')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isMe = tutorId === me.uid

  const slots = useMemo(() => {
    if (!tutor.data) return []
    const taken = new Set(booked.data.map((s) => s.id))
    return openSlots(tutor.data).filter((d) => !taken.has(slotId(d)))
  }, [tutor.data, booked.data])
  const days = useMemo(() => {
    const m = new Map<string, Date[]>()
    for (const d of slots) {
      const k = format(d, 'yyyy-MM-dd')
      m.set(k, [...(m.get(k) ?? []), d])
    }
    return [...m.entries()]
  }, [slots])
  const [day, setDay] = useState<string | null>(null)
  const activeDay = day ?? days[0]?.[0] ?? null

  if (tutor.loading)
    return (
      <Page className="flex flex-col gap-3">
        <PageHeader title="" back="/tutoring" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </Page>
    )
  const t = tutor.data
  if (!t)
    return (
      <Page>
        <PageHeader title="" back="/tutoring" />
        <ErrorState error="This tutor profile doesn't exist." />
      </Page>
    )

  const startBooking = async () => {
    if (!picked) return
    setBusy(true)
    try {
      const id = await createBooking(t, me, skill || t.skills[0]!, picked)
      setBookingId(id)
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const message = async () => {
    try {
      navigate(`/messages/${await openDm(me, { uid: t.uid, name: t.name, photo: t.photo })}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/tutoring" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar name={t.name} seed={t.uid} src={t.photo} size={56} verified={t.verifiedStudent} />
          <div className="min-w-0 flex-1">
            <h1 className="text-h1">{t.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Rating avg={t.ratingAvg} count={t.ratingCount} size="md" />
              <span className="text-body font-semibold">₹{t.hourlyRate}/hour</span>
              <StatusChip tone="open">Verified tutor</StatusChip>
              {!t.active && <StatusChip tone="closed">Not taking bookings</StatusChip>}
            </div>
          </div>
          {!isMe && (
            <IconButton aria-label="Report" size="sm" onClick={() => setReport(true)}>
              <Flag className="size-4" />
            </IconButton>
          )}
        </div>
        <p className="text-body whitespace-pre-line text-ink-2">{t.bio}</p>
        <div className="flex flex-wrap gap-1">
          {t.skills.map((s) => (
            <Chip key={s} selected={me.wantsToLearn.includes(s)}>
              {tagLabel(s)}
            </Chip>
          ))}
        </div>
        <div className="text-small text-ink-3">Usually available {t.availability.map((a) => `${DAY_LABELS[a.dow]} ${a.start}–${a.end}`).join(' · ')}</div>
        {!isMe && (
          <div className="flex gap-2">
            <Link to={`/people/${t.uid}`} className="flex-1">
              <Button full variant="secondary">
                Full profile
              </Button>
            </Link>
            <Button variant="secondary" icon={<MessageSquare className="size-4" />} onClick={message}>
              Message
            </Button>
          </div>
        )}
      </div>

      {isMe ? (
        <Card className="flex items-center justify-between gap-3">
          <div className="text-small text-ink-2">{t.active ? 'You are visible to students.' : 'Your profile is hidden from search.'}</div>
          <Button size="sm" variant="secondary" onClick={() => updateTutor(t, { active: !t.active }).catch((e) => toast(friendlyError(e), 'error'))}>
            {t.active ? 'Pause bookings' : 'Resume bookings'}
          </Button>
        </Card>
      ) : (
        t.active && (
          <section className="flex flex-col gap-3">
            <h2 className="eyebrow">Book an hour</h2>
            {days.length === 0 ? (
              <p className="text-small text-ink-3">No open slots in the next two weeks. Message {t.name.split(' ')[0]} to ask.</p>
            ) : (
              <>
                <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                  {days.map(([k, ds]) => (
                    <Chip key={k} selected={k === activeDay} onClick={() => (setDay(k), setPicked(null))}>
                      {format(ds[0]!, 'EEE d MMM')}
                    </Chip>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(days.find(([k]) => k === activeDay)?.[1] ?? []).map((d) => {
                    const on = !!picked && isSameDay(picked, d) && picked.getTime() === d.getTime()
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPicked(on ? null : d)}
                        className={cn('h-10 rounded-sm border text-small tabular-nums transition-colors', on ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-line bg-surface hover:border-line-strong')}
                      >
                        {format(d, 'h:mm a')}
                      </button>
                    )
                  })}
                </div>
                {t.skills.length > 1 && (
                  <Select label="Subject" value={skill || t.skills[0]} onChange={(e) => setSkill(e.target.value)}>
                    {t.skills.map((s) => (
                      <option key={s} value={s}>
                        {tagLabel(s)}
                      </option>
                    ))}
                  </Select>
                )}
                <Button size="lg" disabled={!picked} loading={busy} onClick={startBooking}>
                  {picked ? `Book ${format(picked, 'EEE d MMM, h:mm a')} · ₹${t.hourlyRate}` : 'Pick a slot'}
                </Button>
              </>
            )}
          </section>
        )
      )}

      <section className="flex flex-col gap-2">
        <h2 className="eyebrow">Reviews ({t.ratingCount})</h2>
        {reviews.data.length === 0 && <p className="text-small text-ink-3">No reviews yet. Students can leave one after a completed session.</p>}
        {reviews.data.map((r) => (
          <Card key={r.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar name={r.student.name} seed={r.student.uid} src={r.student.photo} size={24} />
              <span className="text-small font-semibold">{r.student.name}</span>
              <span className="ml-auto inline-flex items-center gap-0.5 text-small">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn('size-3.5', i < r.rating ? 'fill-teal-600 text-teal-600' : 'text-line-strong')} />
                ))}
              </span>
            </div>
            {r.text && <p className="text-body text-ink-2">{r.text}</p>}
            <span className="text-micro text-ink-3">{timeAgo(r.createdAt)}</span>
          </Card>
        ))}
      </section>

      <PaymentSheet bookingId={bookingId} tutor={t} onClose={() => setBookingId(null)} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'tutors', id: t.uid, ownerId: t.uid, label: `Tutor: ${t.name}` }} />
    </Page>
  )
}

/** Mock payment step: the slot is already locked; confirming marks the booking paid. Abandoning releases it. */
function PaymentSheet({ bookingId, tutor, onClose }: { bookingId: string | null; tutor: Tutor; onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const booking = useBooking(bookingId)
  const [busy, setBusy] = useState(false)
  const b: Booking | null = booking.data
  const abandon = async () => {
    if (b && b.status === 'pending_payment') await cancelBooking(b, me.uid).catch(() => undefined)
    onClose()
  }
  const pay = async () => {
    if (!b) return
    setBusy(true)
    try {
      await confirmPayment(b)
      toast('Session booked', 'success')
      onClose()
      navigate('/tutoring/bookings')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={!!bookingId}
      onClose={abandon}
      title="Confirm and pay"
      description="Demo payment. Nothing is charged; in production this is where UPI would go."
      footer={
        <>
          <Button variant="ghost" onClick={abandon}>
            Cancel
          </Button>
          <Button loading={busy || !b} icon={<CreditCard className="size-4" />} onClick={pay}>
            Pay ₹{tutor.hourlyRate}
          </Button>
        </>
      }
    >
      {b ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          <dt className="text-ink-3">Tutor</dt>
          <dd>{tutor.name}</dd>
          <dt className="text-ink-3">Subject</dt>
          <dd>{tagLabel(b.skill)}</dd>
          <dt className="text-ink-3">When</dt>
          <dd>
            {format(b.start.toDate(), 'EEEE d MMMM, h:mm a')} – {format(b.end.toDate(), 'h:mm a')}
          </dd>
          <dt className="text-ink-3">Amount</dt>
          <dd className="font-semibold">₹{b.rate}</dd>
        </dl>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
      <p className="mt-4 text-small text-ink-3">The slot is held for you while this is open. Free cancellation until the session starts.</p>
    </Sheet>
  )
}
