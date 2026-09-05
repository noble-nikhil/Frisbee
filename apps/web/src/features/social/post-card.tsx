import { useState } from 'react'
import { Link } from 'react-router'
import { Flame, Heart, MessageCircle, Pin, ThumbsUp, Trash2 } from 'lucide-react'
import type { Post, ReactionKind } from '@frisbee/shared'
import { Avatar, Button, Card, IconButton, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import type { Social } from '@/lib/firestore'
import { cn, friendlyError, timeAgo } from '@/lib/utils'
import { addComment, deletePost, pinPost, react } from './api'
import { useComments, useMyReaction } from './hooks'
import { toRef } from '@/features/connections/api'

const REACTIONS: { kind: ReactionKind; icon: typeof ThumbsUp; label: string }[] = [
  { kind: 'like', icon: ThumbsUp, label: 'Like' },
  { kind: 'heart', icon: Heart, label: 'Love' },
  { kind: 'fire', icon: Flame, label: 'Fire' },
]

interface PostCardProps {
  kind: Social
  parentId: string
  post: Post
  canModerate: boolean
  isMember: boolean
}

export function PostCard({ kind, parentId, post, canModerate, isMember }: PostCardProps) {
  const me = useMe()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = useMyReaction(kind, parentId, post.id, me.uid)
  const comments = useComments(kind, parentId, post.id, open)
  const own = post.author.uid === me.uid

  const send = async () => {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await addComment(kind, parentId, post.id, toRef(me), draft.trim())
      setDraft('')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link to={`/people/${post.author.uid}`}>
          <Avatar name={post.author.name} seed={post.author.uid} src={post.author.photo} size={32} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/people/${post.author.uid}`} className="block truncate text-h3 hover:underline">
            {post.author.name}
          </Link>
          <div className="text-micro text-ink-3">
            {timeAgo(post.createdAt)}
            {post.pinned && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-teal-700">
                <Pin className="size-3" /> Pinned
              </span>
            )}
          </div>
        </div>
        {canModerate && (
          <IconButton size="sm" aria-label={post.pinned ? 'Unpin' : 'Pin'} onClick={() => pinPost(kind, parentId, post.id, !post.pinned)}>
            <Pin className={cn('size-4', post.pinned && 'fill-current')} />
          </IconButton>
        )}
        {(own || canModerate) && (
          <IconButton size="sm" aria-label="Delete post" onClick={() => deletePost(kind, parentId, post.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      <p className="text-body whitespace-pre-line">{post.text}</p>
      {post.imageURL && <img src={post.imageURL} alt="" className="max-h-96 w-full rounded-sm object-cover" loading="lazy" />}
      <div className="flex items-center gap-1 border-t border-line pt-2">
        {REACTIONS.map((r) => {
          const active = mine.data?.kind === r.kind
          return (
            <button
              key={r.kind}
              type="button"
              aria-label={r.label}
              aria-pressed={active}
              disabled={!isMember}
              onClick={() => react(kind, parentId, post.id, me.uid, r.kind).catch((e) => toast(friendlyError(e), 'error'))}
              className={cn(
                'flex h-8 items-center gap-1 rounded-sm px-2 text-small tabular-nums transition-colors disabled:opacity-60',
                active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-2 hover:bg-canvas',
              )}
            >
              <r.icon className="size-4" />
              {post.reactions[r.kind] || ''}
            </button>
          )
        })}
        <button type="button" aria-label="Comments" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="ml-auto flex h-8 items-center gap-1 rounded-sm px-2 text-small text-ink-2 hover:bg-canvas">
          <MessageCircle className="size-4" />
          {post.commentCount || ''}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          {comments.data.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.author.name} seed={c.author.uid} src={c.author.photo} size={24} />
              <div className="min-w-0 flex-1 rounded-sm bg-canvas px-2.5 py-1.5 text-small">
                <span className="font-semibold">{c.author.name}</span> <span className="text-ink-3">{timeAgo(c.createdAt)}</span>
                <p className="whitespace-pre-line text-ink">{c.text}</p>
              </div>
            </div>
          ))}
          {isMember && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
              className="flex gap-2"
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a comment" aria-label="Comment" maxLength={500} className="h-9 min-w-0 flex-1 rounded-sm border border-line-strong px-2.5 text-[16px] md:text-small focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              <Button size="sm" type="submit" loading={busy} disabled={!draft.trim()}>
                Post
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  )
}
