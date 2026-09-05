import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '@/components/ui'

/** "A new version is ready · Reload" — registerType is 'prompt' so we own the UX. */
export function UpdatePrompt() {
  const { toast } = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // check for a new build every hour while the tab is open
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast('A new version is ready', 'info', {
      sticky: true,
      action: {
        label: 'Reload',
        onClick: () => {
          setNeedRefresh(false)
          void updateServiceWorker(true)
        },
      },
    })
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker])

  return null
}
