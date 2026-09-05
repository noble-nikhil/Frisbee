import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export function Wordmark({ to = '/home', className, size = 'md' }: { to?: string; className?: string; size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? 36 : 28
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2', className)} aria-label="frisbee home">
      <img src="/icons/icon-192.png" alt="" width={mark} height={mark} className="rounded-sm" />
      <span className={cn('font-semibold tracking-[-0.02em] text-ink', size === 'lg' ? 'text-[24px]' : 'text-[18px]')}>
        frisbee
      </span>
    </Link>
  )
}
