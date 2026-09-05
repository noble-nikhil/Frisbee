import { Bell, Search } from 'lucide-react'
import { Link } from 'react-router'
import { CountBadge } from '@/components/ui'
import { Wordmark } from './wordmark'

const iconLink =
  'relative flex size-10 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-canvas active:bg-line'

export function TopBar({ unreadNotifications }: { unreadNotifications: number }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
      <div className="flex h-topbar items-center justify-between px-3">
        <Wordmark className="pl-1" />
        <div className="flex items-center">
          <Link to="/search" aria-label="Search" className={iconLink}>
            <Search className="size-5" strokeWidth={1.75} />
          </Link>
          <Link to="/notifications" aria-label="Notifications" className={iconLink}>
            <Bell className="size-5" strokeWidth={1.75} />
            <CountBadge count={unreadNotifications} className="absolute top-1 right-0.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
