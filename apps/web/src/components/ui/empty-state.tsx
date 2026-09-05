import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  text: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <Icon className="size-6 text-ink-3" strokeWidth={1.5} />
      <p className="max-w-xs text-body text-ink-2">{text}</p>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error | string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <AlertCircle className="size-6 text-danger" strokeWidth={1.5} />
      <p className="max-w-xs text-body text-ink-2">{typeof error === 'string' ? error : 'Could not load this. Check your connection.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
