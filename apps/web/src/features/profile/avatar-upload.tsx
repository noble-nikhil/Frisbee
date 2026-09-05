import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, Button, useToast } from '@/components/ui'
import { env } from '@/lib/env'
import { friendlyError } from '@/lib/utils'
import { uploadAvatar } from './api'

interface AvatarUploadProps {
  name: string
  uid: string
  value: string | null
  onChange: (url: string | null) => void
}

export function AvatarUpload({ name, uid, value, onChange }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const enabled = !!env.cloudinary.cloudName

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadAvatar(file))
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} seed={uid} src={value} size={96} />
      <div className="flex flex-col gap-2">
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="secondary" size="sm" icon={<Camera className="size-4" />} loading={busy} disabled={!enabled} onClick={() => input.current?.click()}>
          {value ? 'Change photo' : 'Add photo'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
        {!enabled && <p className="text-micro text-ink-3">Photo uploads are off until Cloudinary is configured.</p>}
      </div>
    </div>
  )
}
