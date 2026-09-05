import { tagLabel, type SkillEntry } from '@frisbee/shared'
import { cn } from '@/lib/utils'
import { TagPicker } from './tag-picker'

const LEVELS: { level: 1 | 2 | 3; label: string }[] = [
  { level: 1, label: 'Beginner' },
  { level: 2, label: 'Comfortable' },
  { level: 3, label: 'Can mentor' },
]

/** Skills with a 1–3 proficiency selector per tag. */
export function SkillPicker({ value, onChange, error }: { value: SkillEntry[]; onChange: (v: SkillEntry[]) => void; error?: string }) {
  const ids = value.map((s) => s.tag)
  return (
    <div className="flex flex-col gap-3">
      <TagPicker
        kind="skill"
        label="Skills"
        hint="Pick what you can actually do, then set a level."
        value={ids}
        error={error}
        onChange={(next) =>
          onChange(next.map((tag) => value.find((s) => s.tag === tag) ?? { tag, level: 1 }))
        }
      />
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {value.map((s) => (
            <li key={s.tag} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate text-body">{tagLabel(s.tag)}</span>
              <div role="radiogroup" aria-label={`${tagLabel(s.tag)} level`} className="flex shrink-0 gap-1">
                {LEVELS.map((l) => (
                  <button
                    key={l.level}
                    type="button"
                    role="radio"
                    aria-checked={s.level === l.level}
                    title={l.label}
                    onClick={() => onChange(value.map((x) => (x.tag === s.tag ? { ...x, level: l.level } : x)))}
                    className={cn(
                      'flex h-8 items-center gap-1 rounded-sm border px-2 text-micro font-semibold',
                      s.level === l.level ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-line text-ink-3',
                    )}
                  >
                    <span className="flex gap-0.5" aria-hidden>
                      {[1, 2, 3].map((d) => (
                        <span key={d} className={cn('size-1.5 rounded-full', d <= l.level ? 'bg-current' : 'bg-line-strong')} />
                      ))}
                    </span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
