import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'error'

interface Toast {
  id: number
  tone: Tone
  message: string
  action?: { label: string; onClick: () => void }
  sticky?: boolean
}

interface ToastApi {
  toast: (message: string, tone?: Tone, opts?: Pick<Toast, 'action' | 'sticky'>) => void
  dismiss: (id?: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const icons: Record<Tone, ReactNode> = {
  info: <Info className="size-4 shrink-0 text-ink-3" />,
  success: <CheckCircle2 className="size-4 shrink-0 text-teal-600" />,
  error: <AlertCircle className="size-4 shrink-0 text-danger" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id?: number) => setItems((l) => (id === undefined ? [] : l.filter((t) => t.id !== id))), [])

  const toast = useCallback<ToastApi['toast']>(
    (message, tone = 'info', opts) => {
      const id = ++seq.current
      setItems((l) => [...l.slice(-2), { id, tone, message, ...opts }])
      if (!opts?.sticky) setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+12px)] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-small text-ink shadow-pop',
            )}
          >
            {icons[t.tone]}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="font-semibold text-brand-700"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
