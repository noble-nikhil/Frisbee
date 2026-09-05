import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { Accessibility, Calendar, HandHeart, MapPin, Plus } from 'lucide-react'
import { SUPPORT_TYPES, SUPPORT_TYPE_LABELS, supportRequestSchema, volunteerApplicationSchema, type SupportRequest } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, EmptyState, Field, Input, PageHeader, Select, Sheet, SkeletonList, StatusChip, Tabs, Textarea, useTabParam, useToast, type StatusTone } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { VerifiedGate } from '@/features/auth/verified-gate'
import { openDm } from '@/features/messaging/api'
import { AvailabilityGrid } from '@/features/profile/availability-grid'
import {
  applyAsVolunteer,
  cancelSupportRequest,
  completeSupport,
  confirmVolunteer,
  createSupportRequest,
  declineVolunteer,
  setVolunteerActive,
  volunteerFor,
  withdrawVolunteer,
} from '@/features/support/api'
import { useAssignedRequests, useMyRequests, useMyVolunteerApplication, useOpenRequests, useVolunteer } from '@/features/support/hooks'
import { useZodForm } from '@/lib/form'
import { friendlyError, timeAgo } from '@/lib/utils'

const TABS = ['requests', 'volunteer'] as const
const TONE: Record<SupportRequest['status'], StatusTone> = { open: 'pending', matched: 'info', confirmed: 'open', completed: 'closed', cancelled: 'closed' }
const LABEL: Record<SupportRequest['status'], string> = { open: 'Looking for a volunteer', matched: 'Volunteer offered', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }

export default function SupportPage() {
  const me = useMe()
  const [tab, setTab] = useTabParam(TABS, 'requests')
  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="Support" description="Scribes, note-takers and mobility help from verified student volunteers." />
      <Tabs
        items={[
          { id: 'requests', label: 'Get help' },
          { id: 'volunteer', label: me.roles.volunteer ? 'Volunteer' : 'Volunteer with us' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'requests' ? <RequestsTab /> : <VolunteerTab />}
    </Page>
  )
}

function Row({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-small text-ink-2">
      <Icon className="size-3.5 shrink-0 text-ink-3" /> {children}
    </span>
  )
}

// Requests -----------------------------------------------------------------------

function RequestsTab() {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const mine = useMyRequests(me.uid)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const sorted = [...mine.data].sort((a, b) => b.start.toMillis() - a.start.toMillis())
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-small text-ink-2">Need a scribe for an exam, notes for a class you cannot attend, or a hand getting around campus? Ask here. Volunteers are verified by the accessibility office.</div>
        <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)} className="shrink-0">
          New request
        </Button>
      </Card>
      {mine.loading ? (
        <SkeletonList rows={2} card />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Accessibility} text="No requests yet. Only you, admins and verified volunteers can see what you post here." />
      ) : (
        sorted.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-micro font-semibold uppercase tracking-wide text-ink-3">{SUPPORT_TYPE_LABELS[r.type]}</div>
                <h3 className="text-h3">{r.course}</h3>
              </div>
              <StatusChip tone={TONE[r.status]}>{LABEL[r.status]}</StatusChip>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Row icon={Calendar}>
                {format(r.start.toDate(), 'EEE d MMM, h:mm a')} – {format(r.end.toDate(), 'h:mm a')}
              </Row>
              <Row icon={MapPin}>{r.venue}</Row>
            </div>
            {r.volunteer && (
              <div className="flex items-center gap-2 rounded-sm bg-canvas p-2">
                <Avatar name={r.volunteer.name} seed={r.volunteer.uid} src={r.volunteer.photo} size={32} />
                <div className="min-w-0 flex-1 text-small">
                  <span className="font-semibold">{r.volunteer.name}</span> {r.status === 'matched' ? 'offered to help' : 'is your volunteer'}
                </div>
                <Button size="sm" variant="secondary" onClick={() => openDm(me, r.volunteer!).then((id) => navigate(`/messages/${id}`)).catch((e) => toast(friendlyError(e), 'error'))}>
                  Message
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {r.status === 'matched' && (
                <>
                  <Button size="sm" loading={busy === r.id} onClick={() => run(r.id, () => confirmVolunteer(r), 'Confirmed. They have been told.')}>
                    Confirm {r.volunteer?.name.split(' ')[0]}
                  </Button>
                  <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => run(r.id, () => declineVolunteer(r), 'Request reopened')}>
                    Not this time
                  </Button>
                </>
              )}
              {r.status === 'confirmed' && (
                <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => run(r.id, () => completeSupport(r), 'Marked as done')}>
                  Mark done
                </Button>
              )}
              {(r.status === 'open' || r.status === 'matched' || r.status === 'confirmed') && (
                <Button size="sm" variant="ghost" className="text-danger" loading={busy === r.id} onClick={() => run(r.id, () => cancelSupportRequest(r.id), 'Request cancelled')}>
                  Cancel request
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
      <RequestSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function RequestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const { toast } = useToast()
  const [defaults] = useState(() => {
    const start = new Date(Date.now() + 86400_000)
    start.setMinutes(0, 0, 0)
    return { start: format(start, "yyyy-MM-dd'T'HH:mm"), end: format(new Date(start.getTime() + 2 * 3600_000), "yyyy-MM-dd'T'HH:mm") }
  })
  const form = useZodForm(supportRequestSchema, {
    defaultValues: {
      type: undefined,
      course: '',
      start: defaults.start,
      end: defaults.end,
      venue: '',
      notes: '',
    },
  })
  const e = form.formState.errors
  const submit = form.handleSubmit(async (v) => {
    try {
      await createSupportRequest(me, v)
      form.reset()
      onClose()
      toast('Request posted. Volunteers who match will be notified.', 'success')
    } catch (err) {
      toast(friendlyError(err), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Request support"
      description="Seen only by verified volunteers and admins."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Post request
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Select label="Kind of help" required placeholder="Select" defaultValue="" error={e.type?.message} {...form.register('type')}>
          {SUPPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {SUPPORT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input label="Course or exam" required placeholder="e.g. MA101 midterm" error={e.course?.message} {...form.register('course')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" required type="datetime-local" error={e.start?.message} {...form.register('start')} />
          <Input label="To" required type="datetime-local" error={e.end?.message} {...form.register('end')} />
        </div>
        <Input label="Where" required placeholder="Exam hall, classroom, hostel gate" error={e.venue?.message} {...form.register('venue')} />
        <Textarea label="Anything the volunteer should know" rows={3} hint="Subject specifics, accessibility needs, who to report to." error={e.notes?.message} {...form.register('notes')} />
      </form>
    </Sheet>
  )
}

// Volunteer ------------------------------------------------------------------------

function VolunteerTab() {
  const me = useMe()
  if (me.roles.volunteer) return <VolunteerDesk />
  return <VolunteerSignup />
}

function VolunteerDesk() {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const profile = useVolunteer(me.uid)
  const open = useOpenRequests(true)
  const assigned = useAssignedRequests(me.uid, true)
  const [busy, setBusy] = useState<string | null>(null)
  const v = profile.data
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }
  const fits = (r: SupportRequest) => !!v && (v.types.includes(r.type) || v.subjects.some((s) => r.course.toLowerCase().includes(s.toLowerCase())))
  const queue = [...open.data].sort((a, b) => Number(fits(b)) - Number(fits(a)) || a.start.toMillis() - b.start.toMillis())
  const mine = assigned.data.filter((r) => r.status === 'matched' || r.status === 'confirmed').sort((a, b) => a.start.toMillis() - b.start.toMillis())
  const done = assigned.data.filter((r) => r.status === 'completed')

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-center gap-3">
        <HandHeart className="size-5 text-teal-600" />
        <div className="min-w-0 flex-1 text-small">
          <div className="font-semibold">Verified volunteer</div>
          <div className="text-ink-3">
            {v ? `${v.completedCount} completed · ${v.types.map((t) => SUPPORT_TYPE_LABELS[t]).join(', ')}` : ''}
          </div>
        </div>
        {v && (
          <Button size="sm" variant="secondary" loading={busy === 'active'} onClick={() => run('active', () => setVolunteerActive(me.uid, !v.active), v.active ? 'You are paused' : 'You are active again')}>
            {v.active ? 'Pause' : 'Resume'}
          </Button>
        )}
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="eyebrow">Your commitments ({mine.length})</h2>
        {mine.length === 0 && <p className="text-small text-ink-3">Nothing assigned right now.</p>}
        {mine.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-micro font-semibold uppercase tracking-wide text-ink-3">{SUPPORT_TYPE_LABELS[r.type]}</div>
                <h3 className="text-h3">{r.course}</h3>
              </div>
              <StatusChip tone={TONE[r.status]}>{r.status === 'matched' ? 'Awaiting their confirmation' : 'Confirmed'}</StatusChip>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Row icon={Calendar}>
                {format(r.start.toDate(), 'EEE d MMM, h:mm a')} – {format(r.end.toDate(), 'h:mm a')}
              </Row>
              <Row icon={MapPin}>{r.venue}</Row>
            </div>
            {r.notes && <p className="text-small text-ink-2 whitespace-pre-line">{r.notes}</p>}
            <div className="flex items-center gap-2">
              <Avatar name={r.requester.name} seed={r.requester.uid} src={r.requester.photo} size={24} />
              <span className="text-small">{r.requester.name}</span>
              <span className="flex-1" />
              <Button size="sm" variant="secondary" onClick={() => openDm(me, r.requester).then((id) => navigate(`/messages/${id}`)).catch((e) => toast(friendlyError(e), 'error'))}>
                Message
              </Button>
              <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => run(r.id, () => withdrawVolunteer(r), 'You withdrew. The request is open again.')}>
                Withdraw
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="eyebrow">Open requests ({queue.length})</h2>
        {open.loading ? (
          <SkeletonList rows={2} card />
        ) : queue.length === 0 ? (
          <p className="text-small text-ink-3">No open requests. You will get a notification when one matches your subjects.</p>
        ) : (
          queue.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-micro font-semibold uppercase tracking-wide text-ink-3">{SUPPORT_TYPE_LABELS[r.type]}</div>
                  <h3 className="text-h3">{r.course}</h3>
                </div>
                {fits(r) && <StatusChip tone="open">Matches you</StatusChip>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Row icon={Calendar}>
                  {format(r.start.toDate(), 'EEE d MMM, h:mm a')} – {format(r.end.toDate(), 'h:mm a')}
                </Row>
                <Row icon={MapPin}>{r.venue}</Row>
              </div>
              {r.notes && <p className="text-small text-ink-2 whitespace-pre-line">{r.notes}</p>}
              <div className="flex items-center justify-between">
                <span className="text-small text-ink-3">Posted {timeAgo(r.createdAt)}</span>
                <Button size="sm" loading={busy === r.id} disabled={!v?.active} onClick={() => run(r.id, () => volunteerFor(r, v!), 'Offer sent. They will confirm.')}>
                  I can help
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Completed ({done.length})</h2>
          {done.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-small">
              <span>
                {SUPPORT_TYPE_LABELS[r.type]} · {r.course}
              </span>
              <span className="text-ink-3">{format(r.start.toDate(), 'd MMM')}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function VolunteerSignup() {
  const me = useMe()
  const { toast } = useToast()
  const existing = useMyVolunteerApplication(me.uid)
  const pending = existing.data.find((a) => a.status === 'pending')
  const last = [...existing.data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]
  const [subject, setSubject] = useState('')
  const [language, setLanguage] = useState('')
  const form = useZodForm(volunteerApplicationSchema, {
    defaultValues: { subjects: [], types: [], availability: me.availability, languages: [], note: '', proofURLs: [] },
  })
  const subjects = form.watch('subjects')
  const types = form.watch('types')
  const languages = form.watch('languages') ?? []
  const e = form.formState.errors
  const addTo = (field: 'subjects' | 'languages', value: string, clear: () => void, max: number) => {
    const v = value.trim()
    const list = form.getValues(field) ?? []
    if (!v || list.includes(v) || list.length >= max) return
    form.setValue(field, [...list, v], { shouldValidate: form.formState.isSubmitted })
    clear()
  }
  const submit = form.handleSubmit(async (v) => {
    try {
      await applyAsVolunteer(me, v)
      toast('Application sent. An admin will verify you.', 'success')
      form.reset()
    } catch (err) {
      toast(friendlyError(err), 'error')
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-small text-ink-2">
        Volunteers act as exam scribes, take notes, read material aloud or help someone get across campus. Every volunteer is verified by an admin from the accessibility office before they see any request.
      </Card>
      {pending ? (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <div className="text-h3">Application under review</div>
            <div className="text-small text-ink-3">Sent {timeAgo(pending.createdAt)}.</div>
          </div>
          <StatusChip tone="pending">Pending</StatusChip>
        </Card>
      ) : (
        <VerifiedGate what="volunteer">
          {last?.status === 'rejected' && (
            <Card className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-h3">Previous application not approved</span>
                <StatusChip tone="danger">Rejected</StatusChip>
              </div>
              {last.note && <p className="text-small text-ink-2">Admin note: {last.note}</p>}
            </Card>
          )}
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Field label="How you can help" required error={e.types?.message}>
              {() => (
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORT_TYPES.map((t) => (
                    <Chip key={t} selected={types.includes(t)} onClick={() => form.setValue('types', types.includes(t) ? types.filter((x) => x !== t) : [...types, t], { shouldValidate: form.formState.isSubmitted })}>
                      {SUPPORT_TYPE_LABELS[t]}
                    </Chip>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Subjects you are comfortable with" required hint="Course codes or names. Press Enter to add, up to 8." error={e.subjects?.message}>
              {(id) => (
                <div className="flex flex-col gap-2">
                  <Input
                    id={id}
                    value={subject}
                    placeholder="e.g. MA101, Data structures, Organic chemistry"
                    onChange={(ev) => setSubject(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault()
                        addTo('subjects', subject, () => setSubject(''), 8)
                      }
                    }}
                  />
                  {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((s) => (
                        <Chip key={s} onRemove={() => form.setValue('subjects', subjects.filter((x) => x !== s))}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
            <Field label="Languages" hint="Optional. Helps match scribes. Up to 5.">
              {(id) => (
                <div className="flex flex-col gap-2">
                  <Input
                    id={id}
                    value={language}
                    placeholder="e.g. Telugu, Hindi, English"
                    onChange={(ev) => setLanguage(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault()
                        addTo('languages', language, () => setLanguage(''), 5)
                      }
                    }}
                  />
                  {languages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {languages.map((s) => (
                        <Chip key={s} onRemove={() => form.setValue('languages', languages.filter((x) => x !== s))}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
            <Field label="When you are usually free" hint="Prefilled from your profile.">
              {() => <Controller control={form.control} name="availability" render={({ field }) => <AvailabilityGrid value={field.value} onChange={field.onChange} />} />}
            </Field>
            <Textarea label="Anything else" rows={3} hint="Prior experience, accessibility training, constraints." error={e.note?.message} {...form.register('note')} />
            <Button type="submit" size="lg" className="self-start" loading={form.formState.isSubmitting}>
              Apply to volunteer
            </Button>
          </form>
        </VerifiedGate>
      )}
    </div>
  )
}

