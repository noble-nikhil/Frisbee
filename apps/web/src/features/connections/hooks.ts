import { query, where, limit } from 'firebase/firestore'
import { useCollection } from '@/hooks/use-collection'
import { cols, subs } from '@/lib/firestore'

/** Everyone I'm connected with (uids). */
export function useConnections(uid: string) {
  const { data, loading } = useCollection(query(cols.connections, where('uids', 'array-contains', uid)), `conns:${uid}`)
  const uids = data.map((c) => c.uids.find((u) => u !== uid)!).filter(Boolean)
  return { uids, set: new Set(uids), loading }
}

export function useIncomingRequests(uid: string) {
  return useCollection(
    // Sort in the UI instead of requiring a composite Firestore index that
    // may not have been deployed with the production rules.
    query(cols.connectionRequests, where('to', '==', uid), where('status', '==', 'pending'), limit(50)),
    `req-in:${uid}`,
  )
}

export function useOutgoingRequests(uid: string) {
  return useCollection(
    query(cols.connectionRequests, where('from', '==', uid), where('status', '==', 'pending'), limit(100)),
    `req-out:${uid}`,
  )
}

export function useBlocks(uid: string) {
  const { data } = useCollection(query(subs.blocks(uid)), `blocks:${uid}`)
  return new Set(data.map((b) => b.uid))
}
