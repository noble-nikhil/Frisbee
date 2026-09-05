import { limit, orderBy, query } from 'firebase/firestore'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Page } from '@/components/layout/app-shell'
import { Button, Dot, EmptyState, ListRow, PageHeader, SkeletonList } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { markAllRead, markRead } from '@/features/notifications/api'
import { useCollection } from '@/hooks/use-collection'
import { subs } from '@/lib/firestore'
import { cn, timeAgo } from '@/lib/utils'

export default function NotificationsPage() {
  const me = useMe()
  const navigate = useNavigate()
  const items = useCollection(query(subs.notifications(me.uid), orderBy('createdAt', 'desc'), limit(50)), `notifs:${me.uid}`)
  const unread = items.data.filter((n) => !n.read).length

  return (
    <Page>
      <PageHeader
        title="Notifications"
        action={
          unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => markAllRead(me.uid)}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      {items.loading ? (
        <SkeletonList rows={5} />
      ) : items.data.length === 0 ? (
        <EmptyState icon={Bell} text="Nothing yet. Requests, replies and reminders show up here." />
      ) : (
        <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
          {items.data.map((n) => (
            <ListRow
              key={n.id}
              onClick={() => {
                if (!n.read) void markRead(me.uid, n.id)
                navigate(n.link)
              }}
              leading={<span className="flex w-3 justify-center">{!n.read && <Dot />}</span>}
              title={<span className={cn(!n.read && 'font-semibold')}>{n.title}</span>}
              meta={n.body}
              trailing={<span className="text-micro text-ink-3">{timeAgo(n.createdAt)}</span>}
            />
          ))}
        </div>
      )}
    </Page>
  )
}
