import { Link } from 'react-router'
import { CalendarClock, ChevronRight, GraduationCap, HandHelping, LogOut, Pencil, Settings, ShieldCheck } from 'lucide-react'
import { tagLabel } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Chip, ListRow, StatusChip } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { logOut } from '@/features/auth/api'
import { AvailabilityGrid } from '@/features/profile/availability-grid'
import { yearLabel } from '@/lib/utils'

export default function MePage() {
  const me = useMe()
  const { isAdmin, isCollegeEmail, isVerified } = useAuth()

  return (
    <Page className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar name={me.displayName} seed={me.uid} src={me.photoURL} size={96} verified={isVerified} />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-h1">{me.displayName}</h1>
          <p className="text-body text-ink-2">
            {me.department}
            {me.year ? ` · ${yearLabel(me.year)}` : ''}
          </p>
          <p className="truncate text-small text-ink-3">{me.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isVerified ? <StatusChip tone="open">Verified student</StatusChip> : isCollegeEmail ? <StatusChip tone="pending">Not verified</StatusChip> : <StatusChip tone="closed">Guest</StatusChip>}
            {me.roles.tutor && <StatusChip tone="info">Tutor</StatusChip>}
            {me.roles.volunteer && <StatusChip tone="info">Volunteer</StatusChip>}
            {isAdmin && <StatusChip tone="live">Admin</StatusChip>}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/me/edit" className="flex-1">
          <Button variant="secondary" full icon={<Pencil className="size-4" />}>
            Edit profile
          </Button>
        </Link>
        <Link to="/me/settings" className="flex-1">
          <Button variant="secondary" full icon={<Settings className="size-4" />}>
            Settings
          </Button>
        </Link>
      </div>

      {me.bio && <p className="text-body whitespace-pre-line">{me.bio}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Connections" value={me.stats.connections} />
        <Stat label="Groups" value={me.stats.groups} />
      </div>

      <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
        <ListRow to="/tutoring/bookings" leading={<CalendarClock className="size-5 text-ink-2" />} title="My sessions" meta="Tutoring bookings and swaps" trailing={<ChevronRight className="size-4 text-ink-3" />} />
        <ListRow to="/tutoring/apply" leading={<GraduationCap className="size-5 text-ink-2" />} title={me.roles.tutor ? 'Tutor profile' : 'Become a tutor'} meta={me.roles.tutor ? 'Manage your rate and slots' : 'Apply — verified by admins'} trailing={<ChevronRight className="size-4 text-ink-3" />} />
        <ListRow to="/support?tab=volunteer" leading={<HandHelping className="size-5 text-ink-2" />} title={me.roles.volunteer ? 'Volunteer profile' : 'Volunteer as a scribe or note-taker'} meta="Accessibility support" trailing={<ChevronRight className="size-4 text-ink-3" />} />
        {!isVerified && isCollegeEmail && <ListRow to="/verify" leading={<ShieldCheck className="size-5 text-warning" />} title="Verify college email" meta="Unlocks rides, tutoring, communities" trailing={<ChevronRight className="size-4 text-ink-3" />} />}
        {isAdmin && <ListRow to="/admin" leading={<ShieldCheck className="size-5 text-ink-2" />} title="Admin panel" meta="Queues, reports, roles" trailing={<ChevronRight className="size-4 text-ink-3" />} />}
      </div>

      <Tags title="Skills" tags={me.skills.map((s) => tagLabel(s.tag))} />
      <Tags title="Can teach" tags={me.canTeach.map(tagLabel)} />
      <Tags title="Wants to learn" tags={me.wantsToLearn.map(tagLabel)} />
      <Tags title="Interests" tags={me.interests.map(tagLabel)} />
      <Tags title="Career goals" tags={me.careerGoals.map(tagLabel)} />

      <section>
        <h2 className="eyebrow mb-2">Availability</h2>
        <AvailabilityGrid value={me.availability} compact />
      </section>

      <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => logOut()} className="self-start">
        Log out
      </Button>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <div className="text-h2 tabular-nums">{value}</div>
      <div className="text-small text-ink-2">{label}</div>
    </div>
  )
}

function Tags({ title, tags }: { title: string; tags: string[] }) {
  if (!tags.length) return null
  return (
    <section>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </section>
  )
}
