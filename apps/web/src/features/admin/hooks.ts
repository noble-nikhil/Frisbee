import { limit, query, where } from 'firebase/firestore'
import { useCollection } from '@/hooks/use-collection'
import { cols } from '@/lib/firestore'
import { recentUsersQuery } from './api'

export const usePendingCommunityRequests = (on: boolean) =>
  useCollection(on ? query(cols.communityRequests, where('status', '==', 'pending'), limit(50)) : null, `admin:community-requests:${on}`)
export const usePendingApplications = (on: boolean) =>
  useCollection(on ? query(cols.applications, where('status', '==', 'pending'), limit(50)) : null, `admin:applications:${on}`)
export const useOpenReports = (on: boolean) => useCollection(on ? query(cols.reports, where('status', '==', 'open'), limit(50)) : null, `admin:reports:${on}`)
export const useRecentUsers = (on: boolean) => useCollection(on ? recentUsersQuery() : null, `admin:users:${on}`)
