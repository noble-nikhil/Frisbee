import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

interface ListRowProps {
  leading?: ReactNode
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  className?: string
  chevron?: boolean
}

export function ListRow({ leading, title, meta, trailing, to, onClick, className, chevron }: ListRowProps) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-h3">{title}</div>
        {meta && <div className="mt-0.5 truncate text-small text-ink-2">{meta}</div>}
      </div>
      {trailing}
      {chevron && <ChevronRight className="size-4 shrink-0 text-ink-3" />}
    </>
  )
  const cls = cn(
    'flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left',
    (to || onClick) && 'transition-colors hover:bg-canvas active:bg-line',
    className,
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}
