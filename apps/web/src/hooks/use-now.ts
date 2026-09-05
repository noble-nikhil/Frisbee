import { useEffect, useState } from 'react'

/**
 * Current time as render-safe state. Ticks every `intervalMs` so "starts in 5 min",
 * "closed", "past deadline" etc. update on their own instead of waiting for a reload.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
