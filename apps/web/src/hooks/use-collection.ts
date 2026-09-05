import { useEffect, useState } from 'react'
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore'

export interface State<T> {
  data: T
  loading: boolean
  error: Error | null
}

/**
 * Live subscription with a stable `key`. Firestore query objects are new on every
 * render, so the caller passes a string key that changes when the query does; the
 * hook re-subscribes on key change and resets to "loading" without an extra render
 * cycle (state is adjusted during render when the key moves).
 */
function useLive<T>(subscribe: ((next: (data: T) => void, fail: (e: Error) => void) => () => void) | null, key: string, empty: T): State<T> {
  const [state, setState] = useState<State<T> & { key: string }>({ key, data: empty, loading: !!subscribe, error: null })
  if (state.key !== key) setState({ key, data: empty, loading: !!subscribe, error: null })

  useEffect(() => {
    if (!subscribe) return
    return subscribe(
      (data) => setState({ key, data, loading: false, error: null }),
      (error) => setState({ key, data: empty, loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state.key === key ? state : { data: empty, loading: !!subscribe, error: null }
}

/** Live query. Pass `null` to pause (e.g. while auth is loading). */
export function useCollection<T>(query: Query<T> | null, key: string): State<T[]> {
  return useLive<T[]>(
    query ? (next, fail) => onSnapshot(query, (snap) => next(snap.docs.map((d) => d.data())), fail) : null,
    key,
    EMPTY as T[],
  )
}

export function useDoc<T>(ref: DocumentReference<T> | null, key: string): State<T | null> {
  return useLive<T | null>(ref ? (next, fail) => onSnapshot(ref, (snap) => next(snap.exists() ? snap.data() : null), fail) : null, key, null)
}

// One shared empty array so `data` is referentially stable while loading (memo-friendly).
const EMPTY: never[] = []
