import { DAYS, DAY_LABELS, SLOTS, SLOT_LABELS, type Availability, type Day, type Slot } from '@frisbee/shared'
import { cn } from '@/lib/utils'

export function AvailabilityGrid({ value, onChange, compact }: { value: Availability; onChange?: (v: Availability) => void; compact?: boolean }) {
  const has = (d: Day, s: Slot) => value[d]?.includes(s) ?? false
  const toggle = (d: Day, s: Slot) => {
    if (!onChange) return
    const current = value[d] ?? []
    const next = has(d, s) ? current.filter((x) => x !== s) : [...current, s]
    onChange({ ...value, [d]: next })
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-small">
        <thead>
          <tr>
            <th />
            {DAYS.map((d) => (
              <th key={d} className="pb-1 text-center text-micro font-semibold text-ink-3">
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((s) => (
            <tr key={s}>
              <th scope="row" className="pr-1 text-left text-micro font-semibold text-ink-3">
                {SLOT_LABELS[s]}
              </th>
              {DAYS.map((d) => {
                const on = has(d, s)
                return (
                  <td key={d}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${DAY_LABELS[d]} ${SLOT_LABELS[s]}`}
                      disabled={!onChange}
                      onClick={() => toggle(d, s)}
                      className={cn(
                        'w-full rounded-sm border transition-colors',
                        compact ? 'h-6' : 'h-11',
                        on ? 'border-teal-600 bg-teal-50' : 'border-line bg-surface',
                        onChange && !on && 'hover:border-line-strong',
                        !onChange && 'cursor-default',
                      )}
                    >
                      {on && <span className="sr-only">Available</span>}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
