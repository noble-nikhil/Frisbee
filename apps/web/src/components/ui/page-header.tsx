import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconButton } from './icon-button'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  back?: boolean | string
}

export function PageHeader({ title, description, action, back }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="mb-4 flex items-start gap-2">
      {back && (
        <IconButton
          aria-label="Back"
          className="-ml-2"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        >
          <ArrowLeft className="size-5" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-h1">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  )
}
