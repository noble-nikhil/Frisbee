import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { TAXONOMY, tagLabel, type TagKind } from '@frisbee/shared'
import { Chip } from '@/components/ui'
import { controlClass } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  kind: TagKind
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  label: string
  hint?: string
  error?: string
  /** restrict choices to this subset of ids (e.g. "can teach" ⊆ skills) */
  only?: string[]
}

/** Typeahead over the controlled taxonomy. Selected tags appear as removable chips. */
export function TagPicker({ kind, value, onChange, max = 12, label, hint, error, only }: TagPickerProps) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)

  const pool = useMemo(() => {
    const all = TAXONOMY[kind]
    return only ? all.filter((t) => only.includes(t.id)) : all
  }, [kind, only])

  const suggestions = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = pool.filter((t) => !value.includes(t.id) && (!needle || t.label.toLowerCase().includes(needle) || t.group.toLowerCase().includes(needle)))
    return list.slice(0, needle ? 12 : 18)
  }, [pool, q, value])

  const add = (id: string) => {
    if (value.length >= max) return
    onChange([...value, id])
    setQ('')
  }

  const showList = focused || q.length > 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-small font-semibold text-ink-2">{label}</span>
        <span className="text-micro text-ink-3">
          {value.length}/{max}
        </span>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Chip key={id} selected onRemove={() => onChange(value.filter((v) => v !== id))}>
              {tagLabel(id)}
            </Chip>
          ))}
        </div>
      )}
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions[0]) add(suggestions[0].id)
            }
          }}
          placeholder={value.length >= max ? 'Limit reached' : 'Search…'}
          disabled={value.length >= max}
          aria-label={`Search ${label.toLowerCase()}`}
          className={cn(controlClass(!!error), 'h-11 pl-9 md:h-10')}
        />
      </div>
      {showList && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-line bg-surface p-2">
          {suggestions.map((t) => (
            <Chip key={t.id} onClick={() => add(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}
      {(error || hint) && <p className={cn('text-small', error ? 'text-danger' : 'text-ink-3')}>{error ?? hint}</p>}
    </div>
  )
}
