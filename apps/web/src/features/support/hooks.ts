import { limit, query, where } from 'firebase/firestore'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { cols, doc } from '@/lib/firestore'
import { myVolunteerApplications } from './api'

export const useMyRequests = (uid: string) => useCollection(query(cols.supportRequests, where('requester.uid', '==', uid), limit(50)), `support:mine:${uid}`)
export const useOpenRequests = (on: boolean) =>
  useCollection(on ? query(cols.supportRequests, where('status', '==', 'open'), limit(50)) : null, `support:open:${on}`)
export const useAssignedRequests = (uid: string, on: boolean) =>
  useCollection(on ? query(cols.supportRequests, where('volunteer.uid', '==', uid), limit(50)) : null, `support:assigned:${uid}:${on}`)
export const useVolunteer = (uid: string) => useDoc(doc(cols.volunteers, uid), `volunteer:${uid}`)
export const useMyVolunteerApplication = (uid: string) => useCollection(myVolunteerApplications(uid), `apps:volunteer:${uid}`)
