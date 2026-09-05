import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import { type Trip } from '@frisbee/shared'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Timestamp.fromDate(d)
}

export const useUpcomingTrips = () => useCollection(query(cols.trips, where('date', '>=', startOfToday()), orderBy('date'), limit(100)), 'trips:upcoming')
export const useTrip = (id: string) => useDoc(doc(cols.trips, id), `trip:${id}`)
export const useTripItems = (id: string) => useCollection(query(subs.tripItems(id), orderBy('createdAt')), `trip-items:${id}`)
export const useMyTrips = (uid: string) => useCollection(query(cols.trips, where('traveller.uid', '==', uid), limit(50)), `trips:mine:${uid}`)

export const useTripsIRequested = (uid: string) =>
  useCollection(query(cols.trips, where('requesterIds', 'array-contains', uid), limit(50)), `trips:requested:${uid}`)

export const sortTrips = (trips: Trip[]) => [...trips].sort((a, b) => a.date.toMillis() - b.date.toMillis())
