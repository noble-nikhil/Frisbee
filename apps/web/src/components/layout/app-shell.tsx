import { Outlet } from 'react-router'
import { limit, query, where } from 'firebase/firestore'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { useCollection } from '@/hooks/use-collection'
import { cols, subs } from '@/lib/firestore'
import { BottomTabs } from './bottom-tabs'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { UpdatePrompt } from '@/features/pwa/update-prompt'

export function AppShell() {
  const me = useMe()
  const { isAdmin } = useAuth()

  const notifications = useCollection(
    query(subs.notifications(me.uid), where('read', '==', false), limit(50)),
    `unread-notifs:${me.uid}`,
  )
  const threads = useCollection(
    query(cols.threads, where('members', 'array-contains', me.uid), limit(100)),
    `threads:${me.uid}`,
  )
  const unreadMessages = threads.data.reduce((n, t) => n + (t.unread?.[me.uid] ?? 0), 0)

  return (
    <div className="min-h-dvh lg:pl-sidebar">
      <TopBar unreadNotifications={notifications.data.length} />
      <Sidebar isAdmin={isAdmin} unreadMessages={unreadMessages} unreadNotifications={notifications.data.length} />
      <main className="pb-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+16px)] lg:pb-8">
        <Outlet />
      </main>
      <BottomTabs unreadMessages={unreadMessages} />
      <UpdatePrompt />
    </div>
  )
}

/** Page container: 640px column with gutters; `wide` for admin/calendar. */
export function Page({ children, wide, className = '' }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={`mx-auto w-full px-4 py-4 md:px-6 md:py-6 ${wide ? 'max-w-wide' : 'max-w-content'} ${className}`}>
      {children}
    </div>
  )
}
