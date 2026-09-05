import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusTone = 'open' | 'closed' | 'pending' | 'danger' | 'live' | 'info'

const tones: Record<StatusTone, string> = {
  open: 'bg-teal-50 text-teal-700',
  closed: 'bg-canvas text-ink-2',
  pending: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  live: 'bg-brand-50 text-brand-700',
  info: 'bg-info-bg text-info',
}

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  selected?: boolean
  onRemove?: () => void
  icon?: ReactNode
}

/** Selectable / removable tag. Renders a button when interactive, a span otherwise. */
export function Chip({ children, selected, onRemove, icon, className, onClick, ...rest }: ChipProps) {
  const base = cn(
    'inline-flex h-7 max-w-full items-center gap-1 rounded-sm border px-2 text-small whitespace-nowrap',
    selected ? 'border-brand-200 bg-brand-50 text-brand-700 font-semibold' : 'border-line bg-canvas text-ink-2',
    onClick && 'transition-colors hover:border-line-strong',
    className,
  )
  const inner = (
    <>
      {icon}
      <span className="truncate">{children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          onKeyDown={(e) => e.key === 'Enter' && onRemove()}
          className="-mr-1 rounded-sm p-0.5 hover:bg-brand-100"
        >
          <X className="size-3" />
        </span>
      )}
    </>
  )
  if (onClick)
    return (
      <button type="button" aria-pressed={selected} onClick={onClick} className={base} {...rest}>
        {inner}
      </button>
    )
  return <span className={base}>{inner}</span>
}

export function StatusChip({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-sm px-2 text-micro font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}
