import { cn } from '@/lib/utils'

/** The one and only team credit. Copy is fixed — do not add anything else here. */
export function Credit({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-center justify-center gap-2 text-small text-ink-3', className)}>
      <img src="/hello-world-80.png" alt="" width={20} height={20} className="rounded-sm" />
      made with love by team Hello World
    </p>
  )
}
