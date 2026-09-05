import { useMemo, useState } from 'react'
import { CalendarDays, List, Plus, Sparkles } from 'lucide-react'
import { isSameDay } from 'date-fns'
import { ACTIVITY_TAGS, EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, HANGOUT_TYPES, type EventCategory } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Chip, EmptyState, PageHeader, Segmented, SkeletonList, Tabs, useTabParam } from '@/components/ui'
import { MonthCalendar } from '@/features/happening/calendar'
import { ActivityCard, EventCard, HangoutCard } from '@/features/happening/cards'
import { ActivitySheet, EventSheet, HangoutSheet } from '@/features/happening/forms'
import { useActivities, useEvents, useHangouts } from '@/features/happening/hooks'

const TABS = ['activities', 'hangouts', 'events'] as const

export default function HappeningPage() {
  const [tab, setTab] = useTabParam(TABS, 'activities')
  const [create, setCreate] = useState(false)
  const label = { activities: 'Activity', hangouts: 'Hangout', events: 'Event' }[tab]

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader
        title="Happening"
        description="Activities, small hangouts and campus events."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>
            {label}
          </Button>
        }
      />
      <Tabs
        items={[
          { id: 'activities', label: 'Activities' },
          { id: 'hangouts', label: 'Hangouts' },
          { id: 'events', label: 'Events' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'activities' && <ActivitiesTab onCreate={() => setCreate(true)} />}
      {tab === 'hangouts' && <HangoutsTab onCreate={() => setCreate(true)} />}
      {tab === 'events' && <EventsTab onCreate={() => setCreate(true)} />}

      <ActivitySheet open={create && tab === 'activities'} onClose={() => setCreate(false)} />
      <HangoutSheet open={create && tab === 'hangouts'} onClose={() => setCreate(false)} />
      <EventSheet open={create && tab === 'events'} onClose={() => setCreate(false)} />
    </Page>
  )
}

function FilterRow<T extends string>({ options, value, onChange, render }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; render?: (v: T) => string }) {
  return (
    <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
      <Chip selected={!value} onClick={() => onChange(null)}>
        All
      </Chip>
      {options.map((o) => (
        <Chip key={o} selected={value === o} onClick={() => onChange(value === o ? null : o)}>
          {render ? render(o) : o}
        </Chip>
      ))}
    </div>
  )
}

function ActivitiesTab({ onCreate }: { onCreate: () => void }) {
  const [tag, setTag] = useState<string | null>(null)
  const all = useActivities()
  const items = useMemo(() => (tag ? all.data.filter((a) => a.tags.includes(tag)) : all.data), [all.data, tag])
  return (
    <div className="flex flex-col gap-3">
      <FilterRow options={ACTIVITY_TAGS} value={tag} onChange={setTag} />
      {all.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          text={tag ? `Nothing tagged ${tag} coming up.` : 'Nothing coming up. Post something people can join.'}
          action={
            <Button variant="secondary" size="sm" onClick={onCreate}>
              New activity
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function HangoutsTab({ onCreate }: { onCreate: () => void }) {
  const [type, setType] = useState<string | null>(null)
  const [openOnly, setOpenOnly] = useState(true)
  const all = useHangouts()
  const items = useMemo(
    () => all.data.filter((h) => h.visibility === 'public' && (!type || h.type === type) && (!openOnly || h.status === 'open')),
    [all.data, type, openOnly],
  )
  return (
    <div className="flex flex-col gap-3">
      <FilterRow options={HANGOUT_TYPES} value={type} onChange={setType} />
      <label className="flex items-center gap-2 text-small text-ink-2">
        <input type="checkbox" className="size-4 accent-brand-500" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
        Only show hangouts with seats left
      </label>
      {all.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          text="No open hangouts right now. Start one, it takes ten seconds."
          action={
            <Button variant="secondary" size="sm" onClick={onCreate}>
              New hangout
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((h) => (
            <HangoutCard key={h.id} h={h} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventsTab({ onCreate }: { onCreate: () => void }) {
  const [category, setCategory] = useState<EventCategory | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [day, setDay] = useState<Date | null>(null)
  const all = useEvents()
  const byCategory = useMemo(() => (category ? all.data.filter((e) => e.category === category) : all.data), [all.data, category])
  const items = useMemo(() => (view === 'calendar' && day ? byCategory.filter((e) => isSameDay(e.start.toDate(), day)) : byCategory), [byCategory, view, day])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <FilterRow options={EVENT_CATEGORIES} value={category} onChange={setCategory} render={(c) => EVENT_CATEGORY_LABELS[c]} />
      </div>
      <Segmented
        className="self-start"
        options={[
          { id: 'list', label: 'List' },
          { id: 'calendar', label: 'Calendar' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'calendar' && <MonthCalendar events={byCategory} selected={day} onSelect={setDay} />}
      {all.loading ? (
        <SkeletonList rows={4} card />
      ) : items.length === 0 ? (
        <EmptyState
          icon={view === 'calendar' ? CalendarDays : List}
          text={day ? 'Nothing on this day.' : category ? `No ${EVENT_CATEGORY_LABELS[category].toLowerCase()} events coming up.` : 'No events yet. Organise one.'}
          action={
            <Button variant="secondary" size="sm" onClick={onCreate}>
              New event
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  )
}
