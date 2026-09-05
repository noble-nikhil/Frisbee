import {
  ArrowLeftRight,
  BellRing,
  CalendarCheck,
  CarFront,
  CircleUser,
  Coffee,
  Globe,
  GraduationCap,
  Hammer,
  HandHelping,
  House,
  Layers,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const TABS: NavItem[] = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/discover', label: 'Discover', icon: Users },
  { to: '/happening', label: 'Happening', icon: CalendarCheck },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/me', label: 'Me', icon: CircleUser },
]

/** Every module, in the order the sidebar and the Home grid show them. */
export const MODULES: NavItem[] = [
  { to: '/discover', label: 'People', icon: Users },
  { to: '/discover?tab=swap', label: 'Skill swap', icon: ArrowLeftRight },
  { to: '/groups', label: 'Groups', icon: Layers },
  { to: '/communities', label: 'Communities', icon: Globe },
  { to: '/happening', label: 'Activities', icon: CalendarCheck },
  { to: '/happening?tab=hangouts', label: 'Hangouts', icon: Coffee },
  { to: '/happening?tab=events', label: 'Events', icon: Ticket },
  { to: '/rides', label: 'Rides', icon: CarFront },
  { to: '/errands', label: 'Errands', icon: ShoppingBag },
  { to: '/teams', label: 'Teams', icon: Hammer },
  { to: '/tutoring', label: 'Tutoring', icon: GraduationCap },
  { to: '/support', label: 'Support', icon: HandHelping },
]

export const ADMIN_NAV: NavItem = { to: '/admin', label: 'Admin', icon: ShieldCheck }
export const NOTIFICATIONS_NAV: NavItem = { to: '/notifications', label: 'Notifications', icon: BellRing }
