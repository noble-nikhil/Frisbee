import { useCallback, useState } from 'react'

/** A Set<string> persisted in localStorage (e.g. skipped matches). */
export function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  const add = useCallback(
    (value: string) => {
      setSet((prev) => {
        const next = new Set(prev).add(value)
        localStorage.setItem(key, JSON.stringify([...next]))
        return next
      })
    },
    [key],
  )
  const clear = useCallback(() => {
    localStorage.removeItem(key)
    setSet(new Set())
  }, [key])
  return { set, add, clear }
}
