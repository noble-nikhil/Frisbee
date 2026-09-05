import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Avatar, Button, Card, IconButton, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { toRef } from '@/features/connections/api'
import { env } from '@/lib/env'
import type { Social } from '@/lib/firestore'
import { resizeImage, uploadImage } from '@/lib/cloudinary'
import { friendlyError } from '@/lib/utils'
import { createPost } from './api'

export function Composer({ kind, parentId, channelId }: { kind: Social; parentId: string; channelId?: string }) {
  const me = useMe()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'upload' | 'post' | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const attach = async (f: File | undefined) => {
    if (!f) return
    setBusy('upload')
    try {
      setImage(await uploadImage(await resizeImage(f, 1600), 'posts'))
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const submit = async () => {
    if (!text.trim()) return
    setBusy('post')
    try {
      await createPost(kind, parentId, toRef(me), { text: text.trim(), imageURL: image, channelId })
      setText('')
      setImage(null)
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card tight className="flex gap-3">
      <Avatar name={me.displayName} seed={me.uid} src={me.photoURL} size={32} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share something with the group"
          aria-label="New post"
          rows={text ? 3 : 1}
          maxLength={2000}
          className="w-full resize-none rounded-sm border border-transparent bg-transparent px-1 py-1.5 text-[16px] md:text-body placeholder:text-ink-4 focus:border-line-strong focus:outline-none"
        />
        {image && (
          <div className="relative w-fit">
            <img src={image} alt="" className="max-h-40 rounded-sm" />
            <IconButton size="sm" aria-label="Remove image" variant="secondary" className="absolute top-1 right-1" onClick={() => setImage(null)}>
              <X className="size-4" />
            </IconButton>
          </div>
        )}
        {(text || image) && (
          <div className="flex items-center justify-between">
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0])} />
            <IconButton size="sm" aria-label="Add image" disabled={!env.cloudinary.cloudName || busy === 'upload'} onClick={() => file.current?.click()}>
              <ImagePlus className="size-4" />
            </IconButton>
            <Button size="sm" loading={busy === 'post'} disabled={!text.trim()} onClick={submit}>
              Post
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
