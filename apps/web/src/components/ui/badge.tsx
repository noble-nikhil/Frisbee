import { cn } from '@/lib/utils'

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-micro font-semibold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Dot({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 rounded-full bg-brand-500', className)} />
}
