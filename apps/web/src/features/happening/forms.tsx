import { useNavigate } from 'react-router'
import { format, addHours } from 'date-fns'
import { ACTIVITY_TAGS, EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, HANGOUT_TYPES, LIMITS, activitySchema, eventSchema, hangoutSchema } from '@frisbee/shared'
import { Button, Chip, Field, Input, Select, Sheet, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { useZodForm } from '@/lib/form'
import { friendlyError } from '@/lib/utils'
import { createActivity, createEvent, createHangout } from './api'

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")
const nextHour = () => {
  const d = addHours(new Date(), 1)
  d.setMinutes(0, 0, 0)
  return d
}

interface SheetProps {
  open: boolean
  onClose: () => void
}

function Footer({ onClose, busy, onSubmit, label }: { onClose: () => void; busy: boolean; onSubmit: () => void; label: string }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button loading={busy} onClick={onSubmit}>
        {label}
      </Button>
    </>
  )
}

export function ActivitySheet({ open, onClose }: SheetProps) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const form = useZodForm(activitySchema, {
    defaultValues: { title: '', description: '', start: local(nextHour()), location: '', tags: [], capacity: null },
  })
  const tags = form.watch('tags')
  const toggle = (t: string) => form.setValue('tags', tags.includes(t) ? tags.filter((x) => x !== t) : tags.length < 4 ? [...tags, t] : tags, { shouldValidate: form.formState.isSubmitted })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createActivity(me, v)
      onClose()
      navigate(`/happening/activities/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet open={open} onClose={onClose} title="New activity" description="Anything people can show up to." footer={<Footer onClose={onClose} busy={form.formState.isSubmitting} onSubmit={submit} label="Publish" />}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Title" required maxLength={LIMITS.title} error={form.formState.errors.title?.message} {...form.register('title')} />
        <Input label="When" required type="datetime-local" error={form.formState.errors.start?.message} {...form.register('start')} />
        <Input label="Where" required placeholder="e.g. Main ground, Library lawn" error={form.formState.errors.location?.message} {...form.register('location')} />
        <Field label="Tags" hint="Up to 4" required error={form.formState.errors.tags?.message}>
          {(id, describedBy) => (
            <div id={id} role="group" aria-describedby={describedBy} className="flex flex-wrap gap-1.5">
              {ACTIVITY_TAGS.map((t) => (
                <Chip key={t} selected={tags.includes(t)} onClick={() => toggle(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
        </Field>
        <Input label="Limit" type="number" min={2} max={500} hint="Leave blank for no limit" error={form.formState.errors.capacity?.message} {...form.register('capacity', { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })} />
        <Textarea label="Details" rows={3} error={form.formState.errors.description?.message} {...form.register('description')} />
      </form>
    </Sheet>
  )
}

export function HangoutSheet({ open, onClose }: SheetProps) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const form = useZodForm(hangoutSchema, {
    defaultValues: { title: '', type: undefined, venue: '', start: local(nextHour()), limit: 4, visibility: 'public', joinMode: 'instant' },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createHangout(me, v)
      onClose()
      navigate(`/happening/hangouts/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet open={open} onClose={onClose} title="New hangout" description="Small, spontaneous, closes automatically when full." footer={<Footer onClose={onClose} busy={form.formState.isSubmitting} onSubmit={submit} label="Create" />}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Title" required placeholder="e.g. Chai at the food court" maxLength={LIMITS.title} error={form.formState.errors.title?.message} {...form.register('title')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" required placeholder="Select" defaultValue="" error={form.formState.errors.type?.message} {...form.register('type')}>
            {HANGOUT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input label="Seats" required type="number" min={2} max={LIMITS.hangoutMax} hint="Including you" error={form.formState.errors.limit?.message} {...form.register('limit')} />
        </div>
        <Input label="Venue" required error={form.formState.errors.venue?.message} {...form.register('venue')} />
        <Input label="When" required type="datetime-local" error={form.formState.errors.start?.message} {...form.register('start')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Who can see it" {...form.register('visibility')}>
            <option value="public">Everyone</option>
            <option value="invite">Invite link only</option>
          </Select>
          <Select label="Joining" {...form.register('joinMode')}>
            <option value="instant">Instant</option>
            <option value="request">I approve requests</option>
          </Select>
        </div>
      </form>
    </Sheet>
  )
}

export function EventSheet({ open, onClose }: SheetProps) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const start = nextHour()
  const form = useZodForm(eventSchema, {
    defaultValues: { category: undefined, title: '', description: '', venue: '', start: local(start), end: local(addHours(start, 2)), capacity: 50, coverURL: null },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createEvent(me, v, { type: 'user', id: me.uid, name: me.displayName })
      onClose()
      navigate(`/happening/events/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet open={open} onClose={onClose} title="New event" description="Capacity-limited, with a waitlist and organiser announcements." footer={<Footer onClose={onClose} busy={form.formState.isSubmitting} onSubmit={submit} label="Publish" />}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Select label="Category" required placeholder="Select" defaultValue="" error={form.formState.errors.category?.message} {...form.register('category')}>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EVENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Input label="Title" required maxLength={LIMITS.title} error={form.formState.errors.title?.message} {...form.register('title')} />
        <Input label="Venue" required error={form.formState.errors.venue?.message} {...form.register('venue')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starts" required type="datetime-local" error={form.formState.errors.start?.message} {...form.register('start')} />
          <Input label="Ends" required type="datetime-local" error={form.formState.errors.end?.message} {...form.register('end')} />
        </div>
        <Input label="Capacity" required type="number" min={2} max={LIMITS.eventMax} error={form.formState.errors.capacity?.message} {...form.register('capacity')} />
        <Textarea label="Details" rows={4} error={form.formState.errors.description?.message} {...form.register('description')} />
      </form>
    </Sheet>
  )
}
