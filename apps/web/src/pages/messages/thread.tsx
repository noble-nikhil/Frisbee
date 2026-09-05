import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ImagePlus, SendHorizontal } from 'lucide-react'
import type { Message } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, ErrorState, IconButton, PageHeader, Skeleton, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { markThreadRead, messagesQuery, sendMessage } from '@/features/messaging/api'
import { toRef } from '@/features/connections/api'
import { useCollection, useDoc } from '@/hooks/use-collection'
import { env } from '@/lib/env'
import { cols, doc } from '@/lib/firestore'
import { resizeImage, uploadImage } from '@/lib/cloudinary'
import { cn, friendlyError, timeAgo } from '@/lib/utils'
import { threadPhoto, threadTitle } from './list'

export default function ThreadPage() {
  const { threadId = '' } = useParams()
  const me = useMe()
  const { toast } = useToast()
  const thread = useDoc(doc(cols.threads, threadId), `thread:${threadId}`)
  const messages = useCollection(messagesQuery(threadId), `messages:${threadId}`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const ordered = useMemo(() => [...messages.data].reverse(), [messages.data])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [ordered.length])

  useEffect(() => {
    if (thread.data && (thread.data.unread?.[me.uid] ?? 0) > 0) void markThreadRead(threadId, me.uid)
  }, [thread.data, threadId, me.uid])

  const t = thread.data
  const isMember = !!t?.members.includes(me.uid)

  const send = async (imageURL?: string) => {
    if (!t || (!text.trim() && !imageURL)) return
    const body = text.trim()
    setText('')
    setBusy(true)
    try {
      await sendMessage(t, toRef(me), body, imageURL)
    } catch (e) {
      setText(body)
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const attach = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadImage(await resizeImage(file, 1280), 'posts')
      await send(url)
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  if (thread.loading)
    return (
      <Page>
        <Skeleton className="h-10 w-1/2" />
      </Page>
    )
  if (!t || thread.error || !isMember)
    return (
      <Page>
        <PageHeader title="Conversation" back="/messages" />
        <ErrorState error="This conversation isn't available." />
      </Page>
    )

  const title = threadTitle(t, me.uid)
  const other = t.kind === 'dm' ? t.members.find((m) => m !== me.uid) : undefined

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-tabs)-env(safe-area-inset-bottom))] w-full max-w-content flex-col lg:h-dvh">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-2 py-2">
        <PageHeader title="" back="/messages" />
        <Link to={other ? `/people/${other}` : t.contextRef ? `/${t.contextRef.collection}/${t.contextRef.id}` : '#'} className="-mt-4 flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={title} seed={t.id} src={threadPhoto(t, me.uid)} size={32} />
          <div className="min-w-0">
            <div className="truncate text-h3">{title}</div>
            {t.kind !== 'dm' && <div className="truncate text-micro text-ink-3">{t.members.length} members{t.contextRef ? ` · ${t.contextRef.collection}` : ''}</div>}
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : ordered.length === 0 ? (
          <p className="py-10 text-center text-small text-ink-3">No messages yet. Say hi.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {ordered.map((m, i) => (
              <Bubble key={m.id} m={m} mine={m.senderId === me.uid} showName={t.kind !== 'dm' && ordered[i - 1]?.senderId !== m.senderId} name={t.memberInfo[m.senderId]?.name} />
            ))}
          </ol>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="flex items-end gap-2 border-t border-line bg-surface px-3 py-2"
      >
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0])} />
        <IconButton aria-label="Attach image" disabled={!env.cloudinary.cloudName || busy} onClick={() => fileInput.current?.click()}>
          <ImagePlus className="size-5" />
        </IconButton>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          aria-label="Message"
          maxLength={2000}
          className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 text-[16px] placeholder:text-ink-4 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none md:text-body"
        />
        <IconButton aria-label="Send" type="submit" variant={text.trim() ? 'primary' : 'ghost'} disabled={!text.trim() || busy}>
          <SendHorizontal className="size-5" />
        </IconButton>
      </form>
    </div>
  )
}

function Bubble({ m, mine, showName, name }: { m: Message; mine: boolean; showName: boolean; name?: string }) {
  if (m.type === 'system')
    return (
      <li className="my-2 text-center text-small text-ink-3">{m.text}</li>
    )
  return (
    <li className={cn('flex max-w-[80%] flex-col', mine ? 'ml-auto items-end' : 'items-start')}>
      {showName && !mine && <span className="mb-0.5 px-1 text-micro text-ink-3">{name}</span>}
      <div
        className={cn(
          'rounded-md px-3 py-2 text-body break-words whitespace-pre-line',
          mine ? 'rounded-br-sm bg-brand-50 text-ink' : 'rounded-bl-sm border border-line bg-surface',
        )}
      >
        {m.imageURL && <img src={m.imageURL} alt="" className="mb-1 max-h-64 rounded-sm" loading="lazy" />}
        {m.text}
      </div>
      <span className="mt-0.5 px-1 text-micro text-ink-4">{timeAgo(m.createdAt)}</span>
    </li>
  )
}
