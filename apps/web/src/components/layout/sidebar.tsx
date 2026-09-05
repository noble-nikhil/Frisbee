import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { CountBadge } from '@/components/ui'
import { Credit } from './credit'
import { Wordmark } from './wordmark'
import { ADMIN_NAV, MODULES, NOTIFICATIONS_NAV, TABS, type NavItem } from './nav'

interface SidebarProps {
  isAdmin: boolean
  unreadMessages: number
  unreadNotifications: number
}

function Item({ item, count }: { item: NavItem; count?: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.to.includes('?')}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-3 rounded-sm px-3 text-small font-semibold transition-colors',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-canvas',
        )
      }
    >
      <item.icon className="size-5" strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {count !== undefined && <CountBadge count={count} />}
    </NavLink>
  )
}

export function Sidebar({ isAdmin, unreadMessages, unreadNotifications }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-topbar items-center px-5">
        <Wordmark />
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-0.5">
          {TABS.map((t) => (
            <Item key={t.to} item={t} count={t.to === '/messages' ? unreadMessages : undefined} />
          ))}
          <Item item={NOTIFICATIONS_NAV} count={unreadNotifications} />
        </div>
        <p className="eyebrow mt-5 mb-1.5 px-3">Modules</p>
        <div className="flex flex-col gap-0.5">
          {MODULES.map((m) => (
            <Item key={m.to} item={m} />
          ))}
          {isAdmin && <Item item={ADMIN_NAV} />}
        </div>
      </nav>
      <Credit className="border-t border-line py-3" />
    </aside>
  )
}
