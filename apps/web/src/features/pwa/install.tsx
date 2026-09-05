import { Download, Share, SquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Sheet } from '@/components/ui'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

const DISMISS_KEY = 'frisbee.install.dismissed'
const VISITS_KEY = 'frisbee.visits'

/**
 * Home card shown from the second visit onwards until installed or dismissed.
 * Android → native prompt. iOS → manual steps sheet (Safari has no prompt API).
 */
export function InstallCard() {
  const { canInstall, installed, ios, install } = useInstallPrompt()
  const [iosOpen, setIosOpen] = useState(false)
  // Second visit onwards, until dismissed. The counter is bumped once per page load.
  const [visible, setVisible] = useState(() => Number(localStorage.getItem(VISITS_KEY) ?? 0) >= 1 && !localStorage.getItem(DISMISS_KEY))
  useEffect(() => {
    localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1))
  }, [])

  if (installed || !visible || (!canInstall && !ios)) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <>
      <Card className="flex items-center gap-3">
        <Download className="size-5 shrink-0 text-ink-2" />
        <p className="flex-1 text-small text-ink-2">
          Add frisbee to your home screen — opens full-screen, works offline.
        </p>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" onClick={() => (ios ? setIosOpen(true) : install().then(dismiss))}>
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </Card>
      <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  )
}

export function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Install frisbee" description="Two taps in Safari.">
      <ol className="flex flex-col gap-4">
        <li className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas text-small font-semibold">1</span>
          <span className="flex items-center gap-2 text-body">
            Tap <strong className="font-semibold">Share</strong>
            <Share className="size-5 text-info" />
            in the toolbar
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas text-small font-semibold">2</span>
          <span className="flex items-center gap-2 text-body">
            Choose <strong className="font-semibold">Add to Home Screen</strong>
            <SquarePlus className="size-5 text-ink-2" />
          </span>
        </li>
      </ol>
    </Sheet>
  )
}

/** Settings row: works on every platform (prompt on Android, steps on iOS, hint elsewhere). */
export function InstallRow() {
  const { canInstall, installed, ios, install } = useInstallPrompt()
  const [iosOpen, setIosOpen] = useState(false)
  if (installed) return <p className="text-small text-ink-3">frisbee is installed on this device.</p>
  return (
    <>
      <Button
        variant="secondary"
        icon={<Download className="size-4" />}
        disabled={!canInstall && !ios}
        onClick={() => (ios ? setIosOpen(true) : install())}
      >
        Install app
      </Button>
      {!canInstall && !ios && (
        <p className="mt-2 text-small text-ink-3">Open this site in Chrome or Safari on your phone to install it.</p>
      )}
      <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  )
}
