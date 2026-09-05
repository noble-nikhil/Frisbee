import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { CountBadge } from '@/components/ui'
import { TABS } from './nav'

export function BottomTabs({ unreadMessages }: { unreadMessages: number }) {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden"
    >
      <ul className="flex h-tabs">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 text-micro font-semibold',
                  isActive ? 'text-brand-500' : 'text-ink-3',
                )
              }
            >
              <t.icon className="size-6" strokeWidth={1.75} />
              {t.label}
              {t.to === '/messages' && (
                <CountBadge count={unreadMessages} className="absolute top-1.5 left-1/2 ml-1" />
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
