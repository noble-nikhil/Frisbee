import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsTablet } from '@/hooks/use-media-query'
import { IconButton } from './icon-button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/**
 * Bottom sheet on phones, centred dialog from 768px up. Uses the native
 * <dialog> element so focus trapping, Esc and the top layer come for free.
 */
export function Sheet({ open, onClose, title, description, children, footer, wide }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const tablet = useIsTablet()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return createPortal(
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="sheet-title"
      className={cn(
        'fixed m-0 max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40',
        'open:flex open:flex-col',
        tablet ? 'inset-0 h-full items-center justify-center' : 'inset-x-0 top-auto bottom-0 justify-end',
      )}
    >
      <div
        className={cn(
          'sheet-enter flex max-h-[90dvh] w-full flex-col bg-surface shadow-pop',
          tablet ? cn('rounded-md', wide ? 'max-w-2xl' : 'max-w-md') : 'rounded-t-lg safe-bottom',
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="text-h2">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-small text-ink-2">{description}</p>}
          </div>
          <IconButton aria-label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <X className="size-5" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  )
}
