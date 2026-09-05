import { Timestamp, deleteDoc, increment, limit, orderBy, query, runTransaction, updateDoc, where } from 'firebase/firestore'
import { addDays, format, isBefore, setHours, setMinutes, startOfDay } from 'date-fns'
import { DAYS, tokenize, tagLabel, type Booking, type Tutor, type TutorApplicationInput, type User } from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { notify } from '@/features/notifications/api'
import { db } from '@/lib/firebase'
import { add, cols, doc, now, subs } from '@/lib/firestore'

// Applications ------------------------------------------------------------------

export async function applyAsTutor(me: User, input: TutorApplicationInput) {
  const { proofURLs, ...payload } = input
  const ref = await add(cols.applications, {
    kind: 'tutor',
    applicant: toRef(me),
    payload,
    proofURLs,
    status: 'pending',
    reviewerId: null,
    note: '',
    createdAt: now(),
    decidedAt: null,
  })
  return ref.id
}

export const myApplications = (uid: string, kind: 'tutor' | 'volunteer') => query(cols.applications, where('applicant.uid', '==', uid), where('kind', '==', kind), limit(5))

// Tutor profile -----------------------------------------------------------------

export function updateTutor(t: Tutor, patch: Partial<Pick<Tutor, 'bio' | 'skills' | 'hourlyRate' | 'availability' | 'active' | 'blackoutDates'>>) {
  const next = { ...t, ...patch }
  return updateDoc(doc(cols.tutors, t.uid), { ...patch, searchTokens: tutorSearchTokens(next) })
}

// Slots -------------------------------------------------------------------------

export const SLOT_MINUTES = 60
export const slotId = (d: Date) => format(d, "yyyy-MM-dd_HHmm")

/**
 * Bookable one-hour starts for the next `days` days, derived from the tutor's weekly
 * windows minus blackout dates. Already-booked slots are removed by the caller.
 */
export function openSlots(t: Tutor, days = 14, from = new Date()): Date[] {
  const out: Date[] = []
  for (let i = 0; i < days; i++) {
    const day = startOfDay(addDays(from, i))
    const key = format(day, 'yyyy-MM-dd')
    if (t.blackoutDates.includes(key)) continue
    const dow = DAYS[(day.getDay() + 6) % 7]! // JS: 0=Sun → DAYS: 0=mon
    for (const w of t.availability.filter((a) => a.dow === dow)) {
      const [sh, sm] = w.start.split(':').map(Number) as [number, number]
      const [eh, em] = w.end.split(':').map(Number) as [number, number]
      let cursor = setMinutes(setHours(day, sh), sm)
      const end = setMinutes(setHours(day, eh), em)
      while (cursor.getTime() + SLOT_MINUTES * 60_000 <= end.getTime()) {
        if (isBefore(from, cursor)) out.push(cursor)
        cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60_000)
      }
    }
  }
  return out
}

// Bookings ----------------------------------------------------------------------

/**
 * Two-step "mock payment": the booking is created as pending_payment together with the
 * slot lock (so nobody else can take it), then confirmPayment flips it to confirmed.
 * Slot lock and booking are written in one transaction; rules verify the slot's
 * bookingId points at a booking owned by the caller (getAfter).
 */
export async function createBooking(t: Tutor, me: User, skill: string, start: Date) {
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000)
  const bookingRef = doc(cols.bookings)
  const slotRef = doc(subs.tutorSlots(t.uid), slotId(start))
  await runTransaction(db, async (tx) => {
    if ((await tx.get(slotRef)).exists()) throw new Error('That slot was just taken. Pick another.')
    tx.set(bookingRef, {
      id: bookingRef.id,
      tutorId: t.uid,
      tutor: { uid: t.uid, name: t.name, photo: t.photo },
      studentId: me.uid,
      student: toRef(me),
      skill,
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      rate: t.hourlyRate,
      status: 'pending_payment',
      payment: { mode: 'mock', paidAt: null },
      reviewed: false,
      remindersSent: { h24: false, h2: false },
      createdAt: now(),
    })
    tx.set(slotRef, { id: slotRef.id, bookingId: bookingRef.id, start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) })
  })
  return bookingRef.id
}

export async function confirmPayment(b: Booking) {
  await updateDoc(doc(cols.bookings, b.id), { status: 'confirmed', 'payment.paidAt': now() })
  await notify({
    to: b.tutorId,
    type: 'tutoring',
    title: `New session: ${tagLabel(b.skill)}`,
    body: `${b.student.name} booked ${format(b.start.toDate(), 'EEE d MMM, h:mm a')}`,
    link: '/tutoring/bookings',
  })
}

/** Cancelling frees the slot. Either side can cancel; the other side is told. */
export async function cancelBooking(b: Booking, byUid: string) {
  await updateDoc(doc(cols.bookings, b.id), { status: 'cancelled' })
  await deleteDoc(doc(subs.tutorSlots(b.tutorId), slotId(b.start.toDate()))).catch(() => undefined)
  const other = byUid === b.studentId ? b.tutorId : b.studentId
  await notify({ to: other, type: 'tutoring', title: 'Session cancelled', body: `${tagLabel(b.skill)} on ${format(b.start.toDate(), 'EEE d MMM, h:mm a')}`, link: '/tutoring/bookings' })
}

export const completeBooking = (b: Booking) => updateDoc(doc(cols.bookings, b.id), { status: 'completed' })

/** Review + rating rollup in one transaction (rules: ratingCount moves by exactly one). */
export async function reviewBooking(b: Booking, me: User, rating: number, text: string) {
  const tutorRef = doc(cols.tutors, b.tutorId)
  await runTransaction(db, async (tx) => {
    const t = (await tx.get(tutorRef)).data()
    if (!t) throw new Error('Tutor not found')
    const count = t.ratingCount + 1
    const avg = Math.round(((t.ratingAvg * t.ratingCount + rating) / count) * 10) / 10
    tx.set(doc(subs.reviews(b.tutorId), b.id), { id: b.id, student: toRef(me), rating, text, createdAt: now() })
    tx.update(tutorRef, { ratingAvg: avg, ratingCount: increment(1) })
    tx.update(doc(cols.bookings, b.id), { reviewed: true })
  })
}

export const bookedSlotsQuery = (tutorId: string) => query(subs.tutorSlots(tutorId), where('start', '>=', Timestamp.now()), orderBy('start'), limit(200))

export const tutorSearchTokens = (t: Pick<Tutor, 'name' | 'skills' | 'bio'>) => tokenize(t.name, t.skills.map(tagLabel), t.bio)
