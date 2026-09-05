import { useSearchParams } from 'react-router'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  id: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('hide-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-small font-semibold transition-colors',
              active ? 'border-brand-500 text-ink' : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="text-ink-3 font-normal">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Tabs whose state lives in `?tab=` so the back button and deep links work. */
export function useTabParam<T extends string>(ids: readonly T[], fallback: T): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab') as T | null
  const value = raw && ids.includes(raw) ? raw : fallback
  return [
    value,
    (t) =>
      setParams(
        (p) => {
          p.set('tab', t)
          return p
        },
        { replace: true },
      ),
  ]
}
