import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />
}

/** Placeholder for a list of ListRows / cards. `rows` caps at 6 per the design system. */
export function SkeletonList({ rows = 4, card }: { rows?: number; card?: boolean }) {
  return (
    <div className={cn('flex flex-col', card ? 'gap-3' : 'divide-y divide-line')}>
      {Array.from({ length: Math.min(rows, 6) }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-3', card ? 'rounded-md border border-line bg-surface p-4' : 'py-3')}>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
