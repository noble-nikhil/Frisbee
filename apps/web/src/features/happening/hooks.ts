import { useMemo } from 'react'
import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc, subs } from '@/lib/firestore'

/** Everything from the start of today onwards. Client-side filters keep the queries index-free. */
const fromToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Timestamp.fromDate(d)
}

export const useActivities = () => useCollection(query(cols.activities, where('start', '>=', fromToday()), orderBy('start'), limit(100)), 'activities')
export const useHangouts = () => useCollection(query(cols.hangouts, where('start', '>=', fromToday()), orderBy('start'), limit(100)), 'hangouts')
export const useEvents = () => useCollection(query(cols.events, where('start', '>=', fromToday()), orderBy('start'), limit(200)), 'events')

export const useActivity = (id: string) => useDoc(doc(cols.activities, id), `activity:${id}`)
export const useHangout = (id: string) => useDoc(doc(cols.hangouts, id), `hangout:${id}`)
export const useEvent = (id: string) => useDoc(doc(cols.events, id), `event:${id}`)

export const useRsvps = (kind: 'activities' | 'events', id: string) =>
  useCollection(query(subs.rsvps(kind, id), orderBy('createdAt'), limit(300)), `rsvps:${kind}:${id}`)
export const useMyRsvp = (kind: 'activities' | 'events', id: string, uid: string) => useDoc(doc(subs.rsvps(kind, id), uid), `rsvp:${kind}:${id}:${uid}`)

export const useHangoutMembers = (id: string) => useCollection(query(subs.members('hangouts', id), orderBy('joinedAt')), `hangout-members:${id}`)
export const useHangoutRequests = (id: string, enabled: boolean) =>
  useCollection(enabled ? query(subs.joinRequests('hangouts', id), where('status', '==', 'pending')) : null, `hangout-requests:${id}:${enabled}`)
export const useMyHangoutRequest = (id: string, uid: string) => useDoc(doc(subs.joinRequests('hangouts', id), uid), `hangout-myreq:${id}:${uid}`)

export const useEventUpdates = (id: string) => useCollection(query(subs.eventUpdates(id), orderBy('createdAt', 'desc'), limit(20)), `event-updates:${id}`)

/** Group a list of dated items by calendar day (YYYY-MM-DD) preserving order. */
export function useGroupedByDay<T extends { start: Timestamp }>(items: T[]) {
  return useMemo(() => {
    const map = new Map<string, T[]>()
    for (const it of items) {
      const d = it.start.toDate()
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map.set(key, [...(map.get(key) ?? []), it])
    }
    return map
  }, [items])
}
