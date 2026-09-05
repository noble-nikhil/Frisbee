import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  className?: string
}

export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className={cn('inline-flex h-8 rounded-sm bg-canvas p-0.5', className)}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex-1 rounded-[3px] px-3 text-small font-semibold whitespace-nowrap transition-colors',
              active ? 'border border-line bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
