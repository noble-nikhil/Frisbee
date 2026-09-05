import { limit, query, where } from 'firebase/firestore'
import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router'
import type { Thread } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, CountBadge, EmptyState, ErrorState, ListRow, PageHeader, SkeletonList } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { useCollection } from '@/hooks/use-collection'
import { cols } from '@/lib/firestore'
import { timeAgo } from '@/lib/utils'

export function threadTitle(t: Thread, me: string) {
  if (t.kind === 'dm') {
    const other = t.members.find((m) => m !== me)
    return other ? (t.memberInfo[other]?.name ?? 'Student') : 'You'
  }
  return t.title ?? t.contextRef?.title ?? 'Group'
}

export function threadPhoto(t: Thread, me: string) {
  if (t.kind !== 'dm') return null
  const other = t.members.find((m) => m !== me)
  return other ? (t.memberInfo[other]?.photo ?? null) : null
}

export default function MessagesPage() {
  const me = useMe()
  const threads = useCollection(query(cols.threads, where('members', 'array-contains', me.uid), limit(100)), `threads-list:${me.uid}`)
  const orderedThreads = [...threads.data].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())

  return (
    <Page>
      <PageHeader title="Messages" />
      {threads.loading ? (
        <SkeletonList rows={6} />
      ) : threads.error ? (
        <ErrorState error={threads.error} />
      ) : threads.data.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          text="No conversations yet. Connect with someone or join a group to start one."
          action={
            <Link to="/discover">
              <Button variant="secondary" size="sm">
                Find people
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
          {orderedThreads.map((t) => {
            const unread = t.unread?.[me.uid] ?? 0
            const title = threadTitle(t, me.uid)
            return (
              <ListRow
                key={t.id}
                to={`/messages/${t.id}`}
                leading={<Avatar name={title} seed={t.id} src={threadPhoto(t, me.uid)} />}
                title={
                  <span className="flex items-center gap-2">
                    <span className={unread ? 'font-semibold' : ''}>{title}</span>
                    {t.contextRef && <span className="text-micro text-ink-3">{t.contextRef.collection}</span>}
                  </span>
                }
                meta={
                  t.lastMessage
                    ? `${t.lastMessage.senderId === me.uid ? 'You: ' : ''}${t.lastMessage.text}`
                    : 'Say hi'
                }
                trailing={
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-micro text-ink-3">{timeAgo(t.lastMessage?.at ?? t.updatedAt)}</span>
                    <CountBadge count={unread} />
                  </div>
                }
              />
            )
          })}
        </div>
      )}
    </Page>
  )
}
