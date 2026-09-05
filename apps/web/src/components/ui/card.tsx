import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tight?: boolean
  interactive?: boolean
}

export function Card({ tight, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-surface shadow-card',
        tight ? 'p-3' : 'p-4',
        interactive && 'transition-colors hover:border-line-strong',
        className,
      )}
      {...rest}
    />
  )
}
