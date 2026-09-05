import { useState } from 'react'
import { Link } from 'react-router'
import { ExternalLink, Inbox, Search, ShieldCheck } from 'lucide-react'
import {
  DAY_LABELS,
  SLOT_LABELS,
  SUPPORT_TYPE_LABELS,
  tagLabel,
  type Application,
  type CommunityRequest,
  type Report,
  type TutorPayload,
  type User,
  type VolunteerPayload,
} from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, EmptyState, Input, PageHeader, StatusChip, Tabs, Textarea, useTabParam, useToast } from '@/components/ui'
import { approveApplication, findUserByEmail, rejectApplication, resolveReport, setRole, setSuspended } from '@/features/admin/api'
import { useOpenReports, usePendingApplications, usePendingCommunityRequests, useRecentUsers } from '@/features/admin/hooks'
import { useMe } from '@/features/auth/auth-context'
import { approveCommunityRequest, rejectCommunityRequest } from '@/features/social/api'
import { friendlyError, timeAgo, when } from '@/lib/utils'

const TABS = ['queue', 'reports', 'users'] as const

export default function AdminPage() {
  const [tab, setTab] = useTabParam(TABS, 'queue')
  const communities = usePendingCommunityRequests(true)
  const applications = usePendingApplications(true)
  const reports = useOpenReports(true)
  const queueCount = communities.data.length + applications.data.length

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="Admin" description="Approvals, reports and roles. Every action here is logged on the document it touches." />
      <Tabs
        items={[
          { id: 'queue', label: 'Approvals', count: queueCount || undefined },
          { id: 'reports', label: 'Reports', count: reports.data.length || undefined },
          { id: 'users', label: 'Users' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'queue' && <Queue communities={communities.data} applications={applications.data} loading={communities.loading || applications.loading} />}
      {tab === 'reports' && <Reports reports={reports.data} loading={reports.loading} />}
      {tab === 'users' && <Users />}
    </Page>
  )
}

function useDecide() {
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const decide = async (key: string, fn: () => Promise<unknown>, ok: string) => {
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
  return { busy, decide }
}

// Approvals -------------------------------------------------------------------

function Queue({ communities, applications, loading }: { communities: CommunityRequest[]; applications: Application[]; loading: boolean }) {
  if (!loading && communities.length + applications.length === 0) return <EmptyState icon={Inbox} text="Nothing waiting. Community requests and tutor/volunteer applications land here." />
  return (
    <div className="flex flex-col gap-5">
      {applications.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Tutor and volunteer applications</h2>
          {applications.map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
        </section>
      )}
      {communities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Community requests</h2>
          {communities.map((r) => (
            <CommunityRequestCard key={r.id} req={r} />
          ))}
        </section>
      )}
    </div>
  )
}

function NoteAndButtons({ busy, onApprove, onReject, approveLabel = 'Approve' }: { busy: boolean; onApprove: (note: string) => void; onReject: (note: string) => void; approveLabel?: string }) {
  const [note, setNote] = useState('')
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <Textarea rows={2} placeholder="Note to the applicant (optional, sent with the decision)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" loading={busy} onClick={() => onReject(note.trim())}>
          Reject
        </Button>
        <Button size="sm" loading={busy} onClick={() => onApprove(note.trim())}>
          {approveLabel}
        </Button>
      </div>
    </div>
  )
}

function ApplicationCard({ app }: { app: Application }) {
  const me = useMe()
  const { busy, decide } = useDecide()
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/people/${app.applicant.uid}`} className="flex items-center gap-2">
          <Avatar name={app.applicant.name} seed={app.applicant.uid} src={app.applicant.photo} size={40} />
          <div>
            <div className="text-h3">{app.applicant.name}</div>
            <div className="text-small text-ink-3">
              {app.kind === 'tutor' ? 'Tutor' : 'Volunteer'} · applied {timeAgo(app.createdAt)}
            </div>
          </div>
        </Link>
        <StatusChip tone="pending">Pending</StatusChip>
      </div>
      {app.kind === 'tutor' ? <TutorSummary p={app.payload as TutorPayload} /> : <VolunteerSummary p={app.payload as VolunteerPayload} />}
      {app.proofURLs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {app.proofURLs.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-small font-semibold text-teal-700">
              <ExternalLink className="size-3.5" /> Proof {i + 1}
            </a>
          ))}
        </div>
      )}
      <NoteAndButtons
        busy={busy === app.id}
        onApprove={(note) => decide(app.id, () => approveApplication(app, me, note), `${app.applicant.name} approved`)}
        onReject={(note) => decide(app.id, () => rejectApplication(app, me, note), 'Application rejected')}
      />
    </Card>
  )
}

function TutorSummary({ p }: { p: TutorPayload }) {
  return (
    <div className="flex flex-col gap-2 text-small">
      <p className="text-body text-ink-2 whitespace-pre-line">{p.bio}</p>
      <div className="flex flex-wrap gap-1">
        {p.skills.map((s) => (
          <Chip key={s} className="h-6">
            {tagLabel(s)}
          </Chip>
        ))}
      </div>
      <div className="text-ink-2">
        ₹{p.hourlyRate}/hour · {p.availability.map((a) => `${DAY_LABELS[a.dow]} ${a.start}–${a.end}`).join(', ')}
      </div>
    </div>
  )
}

function VolunteerSummary({ p }: { p: VolunteerPayload }) {
  const days = Object.entries(p.availability).filter(([, slots]) => slots && slots.length > 0)
  return (
    <div className="flex flex-col gap-2 text-small">
      <div className="flex flex-wrap gap-1">
        {p.types.map((t) => (
          <Chip key={t} className="h-6" selected>
            {SUPPORT_TYPE_LABELS[t]}
          </Chip>
        ))}
        {p.subjects.map((s) => (
          <Chip key={s} className="h-6">
            {s}
          </Chip>
        ))}
      </div>
      {p.languages.length > 0 && <div className="text-ink-2">Languages: {p.languages.join(', ')}</div>}
      <div className="text-ink-2">
        {days.length === 0 ? 'No availability given' : days.map(([d, slots]) => `${DAY_LABELS[d as keyof typeof DAY_LABELS]} ${(slots ?? []).map((s) => SLOT_LABELS[s]).join('/')}`).join(' · ')}
      </div>
      {p.note && <p className="text-ink-2 whitespace-pre-line">{p.note}</p>}
    </div>
  )
}

function CommunityRequestCard({ req }: { req: CommunityRequest }) {
  const me = useMe()
  const { busy, decide } = useDecide()
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-h3">{req.name}</div>
          <div className="text-small text-ink-3">
            {req.category} · by{' '}
            <Link to={`/people/${req.requester.uid}`} className="font-semibold text-ink-2">
              {req.requester.name}
            </Link>{' '}
            · {timeAgo(req.createdAt)}
          </div>
        </div>
        <StatusChip tone="pending">Pending</StatusChip>
      </div>
      <p className="text-body text-ink-2 whitespace-pre-line">{req.purpose}</p>
      {req.rules && (
        <p className="text-small text-ink-3 whitespace-pre-line">
          <span className="font-semibold">Rules:</span> {req.rules}
        </p>
      )}
      <NoteAndButtons
        busy={busy === req.id}
        approveLabel="Approve and create"
        onApprove={(note) => decide(req.id, () => approveCommunityRequest(req, me, note), `${req.name} is live`)}
        onReject={(note) => decide(req.id, () => rejectCommunityRequest(req, me, note), 'Request declined')}
      />
    </Card>
  )
}

// Reports ---------------------------------------------------------------------

const targetLink = (t: Report['target']) => {
  switch (t.collection) {
    case 'users':
      return `/people/${t.id}`
    case 'groups':
    case 'communities':
    case 'rides':
    case 'teams':
      return `/${t.collection}/${t.id}`
    case 'trips':
      return `/errands/${t.id}`
    case 'activities':
    case 'hangouts':
    case 'events':
      return `/happening/${t.collection}/${t.id}`
    default:
      return null
  }
}

function Reports({ reports, loading }: { reports: Report[]; loading: boolean }) {
  const me = useMe()
  const { busy, decide } = useDecide()
  const [notes, setNotes] = useState<Record<string, string>>({})
  if (!loading && reports.length === 0) return <EmptyState icon={ShieldCheck} text="No open reports." />
  return (
    <div className="flex flex-col gap-2">
      {reports.map((r) => {
        const link = targetLink(r.target)
        const note = notes[r.id] ?? ''
        return (
          <Card key={r.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-h3">
                  {r.reason} · {r.target.collection.replace(/s$/, '')}
                </div>
                <div className="truncate text-small text-ink-3">
                  {link ? (
                    <Link to={link} className="font-semibold text-ink-2">
                      {r.target.label}
                    </Link>
                  ) : (
                    r.target.label
                  )}{' '}
                  · owner{' '}
                  <Link to={`/people/${r.target.ownerId}`} className="font-semibold text-ink-2">
                    profile
                  </Link>{' '}
                  · reported {timeAgo(r.createdAt)}
                </div>
              </div>
              <StatusChip tone="danger">Open</StatusChip>
            </div>
            {r.details && <p className="text-body text-ink-2 whitespace-pre-line">{r.details}</p>}
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <Input placeholder="Internal note / message to the user (optional)" value={note} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} maxLength={200} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => decide(r.id, () => resolveReport(r, me, 'dismiss', note), 'Dismissed')}>
                  Dismiss
                </Button>
                <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => decide(r.id, () => resolveReport(r, me, 'warn', note), 'Warning sent')}>
                  Warn user
                </Button>
                <Button size="sm" variant="danger" loading={busy === r.id} onClick={() => decide(r.id, () => resolveReport(r, me, 'suspend', note), 'Account suspended')}>
                  Suspend
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// Users -----------------------------------------------------------------------

function Users() {
  const me = useMe()
  const { toast } = useToast()
  const recent = useRecentUsers(true)
  const [q, setQ] = useState('')
  const [found, setFound] = useState<User | null | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)

  const lookup = async () => {
    if (!q.trim()) return setFound(undefined)
    setFound(await findUserByEmail(q))
  }
  const flip = async (u: User, fn: () => Promise<unknown>, ok: string) => {
    setBusy(u.uid)
    try {
      await fn()
      toast(ok, 'success')
      if (found?.uid === u.uid) setFound(await findUserByEmail(u.email))
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const row = (u: User) => (
    <Card key={u.uid} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={u.displayName} seed={u.uid} src={u.photoURL} size={40} />
        <div className="min-w-0 flex-1">
          <Link to={`/people/${u.uid}`} className="block truncate text-h3">
            {u.displayName}
          </Link>
          <div className="truncate text-small text-ink-3">
            {u.email} · joined {when(u.createdAt)}
          </div>
        </div>
        {u.suspended && <StatusChip tone="danger">Suspended</StatusChip>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(['verifiedStudent', 'tutor', 'volunteer', 'admin'] as const).map((role) => (
          <Chip key={role} selected={u.roles[role]} onClick={u.uid === me.uid && role === 'admin' ? undefined : () => flip(u, () => setRole(u.uid, role, !u.roles[role]), `${role} ${u.roles[role] ? 'removed' : 'granted'}`)}>
            {role === 'verifiedStudent' ? 'Verified student' : role[0]!.toUpperCase() + role.slice(1)}
          </Chip>
        ))}
        <span className="flex-1" />
        <Button size="sm" variant={u.suspended ? 'secondary' : 'ghost'} loading={busy === u.uid} disabled={u.uid === me.uid} onClick={() => flip(u, () => setSuspended(u.uid, !u.suspended), u.suspended ? 'Account restored' : 'Account suspended')}>
          {u.suspended ? 'Restore' : 'Suspend'}
        </Button>
      </div>
    </Card>
  )

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void lookup()
        }}
      >
        <Input aria-label="Email" type="email" placeholder="Find by exact email" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary" icon={<Search className="size-4" />} className="h-11 md:h-10">
          Find
        </Button>
      </form>
      {found === null && <p className="text-small text-ink-3">No account with that email.</p>}
      {found && row(found)}
      <section className="flex flex-col gap-2">
        <h2 className="eyebrow">Recent sign-ups</h2>
        {recent.data.filter((u) => u.uid !== found?.uid).map(row)}
        {!recent.loading && recent.data.length === 0 && <p className="text-small text-ink-3">Nobody yet.</p>}
      </section>
      <p className="text-small text-ink-3">Role changes apply on the user's next page load. Tutor and volunteer flags are normally granted through the approvals tab so the public profile is created too.</p>
    </div>
  )
}
