import { useMemo } from 'react'
import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import { normalise, type Ride } from '@frisbee/shared'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Timestamp.fromDate(d)
}

export const useUpcomingRides = () => useCollection(query(cols.rides, where('start', '>=', startOfToday()), orderBy('start'), limit(100)), 'rides:upcoming')
export const useRide = (id: string) => useDoc(doc(cols.rides, id), `ride:${id}`)
export const useRideRequests = (id: string, enabled: boolean) =>
  useCollection(enabled ? query(subs.joinRequests('rides', id), orderBy('createdAt')) : null, `ride-requests:${id}:${enabled}`)
export const useMyRideRequest = (id: string, uid: string) => useDoc(doc(subs.joinRequests('rides', id), uid), `ride-myreq:${id}:${uid}`)

/** Rides I drove or rode in, past and future (two equality queries merged client-side). */
export function useMyRides(uid: string) {
  const driving = useCollection(query(cols.rides, where('driver.uid', '==', uid), limit(50)), `rides:driving:${uid}`)
  const riding = useCollection(query(cols.rides, where('passengerIds', 'array-contains', uid), limit(50)), `rides:riding:${uid}`)
  const data = useMemo(() => {
    const seen = new Map<string, Ride>()
    for (const r of [...driving.data, ...riding.data]) seen.set(r.id, r)
    return [...seen.values()].sort((a, b) => b.start.toMillis() - a.start.toMillis())
  }, [driving.data, riding.data])
  return { data, loading: driving.loading || riding.loading, error: driving.error ?? riding.error }
}

export interface RideFilter {
  from: string
  to: string
  date: string // yyyy-mm-dd or ''
}

/** Case/accent-insensitive substring match: "vijay" finds "Vijayawada bus stand". */
export function filterRides(rides: Ride[], f: RideFilter) {
  const from = normalise(f.from)
  const to = normalise(f.to)
  return rides.filter((r) => {
    if (from && !normalise(r.from).includes(from)) return false
    if (to && !normalise(r.to).includes(to)) return false
    if (f.date) {
      const d = r.start.toDate()
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (key !== f.date) return false
    }
    return true
  })
}
