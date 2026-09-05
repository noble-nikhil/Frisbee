import { explainMatch, tagLabel, type SharedTags } from '@frisbee/shared'
import { cn } from '@/lib/utils'

interface MatchExplainProps {
  shared: SharedTags
  max?: number
  className?: string
}

/** "Skills · React, Figma" / "Interests · Football". Reused by matches, swap and team applicants. */
export function MatchExplain({ shared, max = 2, className }: MatchExplainProps) {
  const groups = explainMatch(shared)
  if (!groups.length) return null
  const shown = groups.slice(0, max)
  const hidden = groups.slice(max).reduce((n, g) => n + g.tags.length, 0)
  return (
    <dl className={cn('flex flex-col gap-0.5 text-small', className)}>
      {shown.map((g) => (
        <div key={g.label} className="flex gap-1.5 truncate">
          <dt className="shrink-0 text-ink-3">{g.label} ·</dt>
          <dd className="truncate text-ink-2">{g.tags.map(tagLabel).join(', ')}</dd>
        </div>
      ))}
      {hidden > 0 && <div className="text-ink-3">+{hidden} more</div>}
    </dl>
  )
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-line', className)} aria-hidden>
      <div className="h-full bg-teal-600" style={{ width: `${score}%` }} />
    </div>
  )
}
