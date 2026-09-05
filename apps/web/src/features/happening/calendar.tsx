import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import type { Event } from '@frisbee/shared'
import { IconButton } from '@/components/ui'
import { cn } from '@/lib/utils'

/** Month grid; a dot marks days with events, tapping a day filters the list below it. */
export function MonthCalendar({ events, selected, onSelect }: { events: Event[]; selected: Date | null; onSelect: (d: Date | null) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month])
  const busy = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) set.add(format(e.start.toDate(), 'yyyy-MM-dd'))
    return set
  }, [events])

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <IconButton size="sm" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className="text-h3">{format(month, 'MMMM yyyy')}</span>
        <IconButton size="sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
      <div className="grid grid-cols-7 text-center text-micro font-semibold uppercase text-ink-3">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const has = busy.has(key)
          const on = !!selected && isSameDay(d, selected)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(on ? null : d)}
              aria-pressed={on}
              aria-label={format(d, 'EEEE d MMMM')}
              className={cn(
                'mx-auto flex size-9 flex-col items-center justify-center rounded-sm text-small tabular-nums transition-colors',
                !isSameMonth(d, month) && 'text-ink-4',
                isToday(d) && !on && 'font-semibold text-brand-700',
                on ? 'bg-brand-500 font-semibold text-white' : 'hover:bg-canvas',
              )}
            >
              {format(d, 'd')}
              <span className={cn('mt-0.5 size-1 rounded-full', has ? (on ? 'bg-white' : 'bg-teal-600') : 'bg-transparent')} aria-hidden />
            </button>
          )
        })}
      </div>
    </div>
  )
}
