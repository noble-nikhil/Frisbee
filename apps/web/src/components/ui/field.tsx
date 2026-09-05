import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label + control + hint/error wiring. Every form control goes through this. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const messageId = error || hint ? `${id}-msg` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-small font-semibold text-ink-2">
          {label}
          {required && <span aria-hidden className="text-ink-3"> *</span>}
        </label>
      )}
      {children(id, messageId)}
      {(error || hint) && (
        <p id={messageId} aria-live="polite" className={cn('text-small', error ? 'text-danger' : 'text-ink-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
