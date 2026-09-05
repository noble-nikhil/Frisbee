import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'ghost' | 'primary' | 'secondary'
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = 'ghost', size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:text-ink-4',
        size === 'md' ? 'size-10' : 'size-8',
        variant === 'ghost' && 'text-ink-2 hover:bg-canvas active:bg-line',
        variant === 'primary' && 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-200 disabled:text-white',
        variant === 'secondary' && 'border border-line-strong bg-surface text-ink hover:bg-canvas',
        className,
      )}
      {...rest}
    />
  )
})
