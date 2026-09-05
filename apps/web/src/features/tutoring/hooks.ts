import { useMemo } from 'react'
import { limit, orderBy, query, where } from 'firebase/firestore'
import type { Booking } from '@frisbee/shared'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'
import { bookedSlotsQuery, myApplications } from './api'

export const useTutors = () => useCollection(query(cols.tutors, where('active', '==', true), limit(100)), 'tutors:active')
export const useTutor = (uid: string) => useDoc(doc(cols.tutors, uid), `tutor:${uid}`)
export const useReviews = (uid: string) => useCollection(query(subs.reviews(uid), orderBy('createdAt', 'desc'), limit(20)), `reviews:${uid}`)
export const useBookedSlots = (uid: string) => useCollection(bookedSlotsQuery(uid), `slots:${uid}`)
export const useMyTutorApplication = (uid: string) => useCollection(myApplications(uid, 'tutor'), `apps:tutor:${uid}`)
export const useBooking = (id: string | null) => useDoc(id ? doc(cols.bookings, id) : null, `booking:${id ?? ''}`)

/** Bookings as student plus bookings as tutor, merged. */
export function useMyBookings(uid: string) {
  const asStudent = useCollection(query(cols.bookings, where('studentId', '==', uid), limit(100)), `bookings:student:${uid}`)
  const asTutor = useCollection(query(cols.bookings, where('tutorId', '==', uid), limit(100)), `bookings:tutor:${uid}`)
  const data = useMemo(() => {
    const m = new Map<string, Booking>()
    for (const b of [...asStudent.data, ...asTutor.data]) m.set(b.id, b)
    return [...m.values()].sort((a, b) => a.start.toMillis() - b.start.toMillis())
  }, [asStudent.data, asTutor.data])
  return { data, loading: asStudent.loading || asTutor.loading, error: asStudent.error ?? asTutor.error }
}
