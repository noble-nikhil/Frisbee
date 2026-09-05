import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { format } from 'date-fns'
import { CalendarClock, ExternalLink, Flag, MessageSquare, Trash2, Users } from 'lucide-react'
import { tagLabel, teamApplicationSchema, type Team } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, ErrorState, IconButton, ListRow, PageHeader, Select, Sheet, Skeleton, StatusChip, Textarea, useToast } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { ReportSheet } from '@/features/safety/report-sheet'
import { accept, apply, deleteTeam, leaveTeam, reject, setTeamStatus, withdraw } from '@/features/teams/api'
import { useApplications, useMyApplication, useTeam, useTeamMembers } from '@/features/teams/hooks'
import { useZodForm } from '@/lib/form'
import { cn, friendlyError, timeAgo } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'

const tone: Record<Team['status'], { tone: 'open' | 'closed' | 'info'; label: string }> = {
  open: { tone: 'open', label: 'Recruiting' },
  filled: { tone: 'info', label: 'Team full' },
  closed: { tone: 'closed', label: 'Closed' },
}

export default function TeamDetailPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [report, setReport] = useState(false)
  const [applying, setApplying] = useState(false)
  const team = useTeam(id)
  const t = team.data
  const isOwner = !!t && t.owner.uid === me.uid
  const members = useTeamMembers(id)
  const apps = useApplications(id, isOwner)
  const now = useNow()
  const mine = useMyApplication(id, me.uid)

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  if (team.loading)
    return (
      <Page className="flex flex-col gap-3">
        <PageHeader title="" back="/teams" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </Page>
    )
  if (!t)
    return (
      <Page>
        <PageHeader title="" back="/teams" />
        <ErrorState error="This team was removed." />
      </Page>
    )
  const isMember = t.memberIds.includes(me.uid)
  const openRoles = t.roles.filter((r) => r.filled < r.count)
  const pending = apps.data.filter((a) => a.status === 'pending')
  const past = t.deadline.toMillis() < now
  const roleOf = (uid: string) => apps.data.find((a) => a.uid === uid)?.roleId ?? null

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader title="" back="/teams" />
      <div className="-mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusChip tone={tone[t.status].tone}>{tone[t.status].label}</StatusChip>
            <h1 className="mt-2 text-h1">{t.name}</h1>
          </div>
          <div className="flex gap-1">
            {!isOwner && (
              <IconButton aria-label="Report" size="sm" onClick={() => setReport(true)}>
                <Flag className="size-4" />
              </IconButton>
            )}
            {(isOwner || isAdmin) && (
              <IconButton aria-label="Delete" size="sm" onClick={() => run('delete', async () => (await deleteTeam(t.id), navigate('/teams')))}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-body text-ink-2">
          <CalendarClock className="size-4 text-ink-3" />
          <span>
            Apply by {format(t.deadline.toDate(), 'EEE d MMM, h:mm a')}
            {past ? ' (passed)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-body text-ink-2">
          <Users className="size-4 text-ink-3" />
          <span>
            {t.memberIds.length} of {t.teamSize} on board
          </span>
        </div>
        <p className="text-body whitespace-pre-line text-ink-2">{t.description}</p>
        {t.links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {t.links.map((l) => (
              <a key={l} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-small font-semibold text-teal-700">
                <ExternalLink className="size-3.5" /> {new URL(l).hostname.replace(/^www\./, '')}
              </a>
            ))}
          </div>
        )}
        <Link to={`/people/${t.owner.uid}`} className="flex items-center gap-2 text-small text-ink-2">
          <Avatar name={t.owner.name} seed={t.owner.uid} src={t.owner.photo} size={24} /> Owner: {t.owner.name}
        </Link>

        {isMember ? (
          <div className="flex gap-2">
            <Link to={`/messages/${t.threadId}`} className="flex-1">
              <Button full variant="secondary" icon={<MessageSquare className="size-4" />}>
                Team chat
              </Button>
            </Link>
            {!isOwner && (
              <Button variant="ghost" loading={busy === 'leave'} onClick={() => run('leave', () => leaveTeam(t, me.uid, mine.data?.roleId ?? null), 'You left the team')}>
                Leave
              </Button>
            )}
          </div>
        ) : mine.data?.status === 'pending' ? (
          <div className="flex gap-2">
            <Button variant="secondary" disabled full>
              Application sent
            </Button>
            <Button variant="ghost" loading={busy === 'withdraw'} onClick={() => run('withdraw', () => withdraw(t.id, me.uid), 'Application withdrawn')}>
              Withdraw
            </Button>
          </div>
        ) : mine.data?.status === 'rejected' ? (
          <p className="text-small text-ink-3">The owner went with someone else for that role.</p>
        ) : t.status === 'open' && openRoles.length > 0 && !past ? (
          <Button onClick={() => setApplying(true)}>Apply to join</Button>
        ) : (
          <p className="text-small text-ink-3">This team is not taking applications.</p>
        )}
      </div>

      <section>
        <h2 className="eyebrow mb-2">Roles</h2>
        <div className="flex flex-col gap-2">
          {t.roles.map((r) => (
            <Card key={r.id} className={cn('flex flex-col gap-1.5', r.filled >= r.count && 'opacity-70')}>
              <div className="flex items-center justify-between">
                <span className="text-h3">{r.title}</span>
                <span className="text-small tabular-nums text-ink-2">
                  {r.filled}/{r.count} filled
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.skills.map((s) => (
                  <Chip key={s} className="h-6" selected={me.skills.some((x) => x.tag === s)}>
                    {tagLabel(s)}
                  </Chip>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {isOwner && (
        <Card className="flex flex-col gap-3">
          <h2 className="eyebrow">Owner controls</h2>
          <div className="flex flex-wrap gap-2">
            {t.status === 'open' ? (
              <>
                <Button size="sm" variant="secondary" loading={busy === 'status'} onClick={() => run('status', () => setTeamStatus(t.id, 'filled'), 'Marked as filled')}>
                  Mark filled
                </Button>
                <Button size="sm" variant="ghost" loading={busy === 'status'} onClick={() => run('status', () => setTeamStatus(t.id, 'closed'), 'Listing closed')}>
                  Close listing
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" loading={busy === 'status'} onClick={() => run('status', () => setTeamStatus(t.id, 'open'), 'Recruiting again')}>
                Reopen
              </Button>
            )}
          </div>
        </Card>
      )}

      {isOwner && pending.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Applications ({pending.length})</h2>
          <div className="flex flex-col gap-2">
            {pending.map((a) => {
              const role = t.roles.find((r) => r.id === a.roleId)
              const roleFull = !!role && role.filled >= role.count
              return (
                <Card key={a.uid} className="flex flex-col gap-2">
                  <Link to={`/people/${a.uid}`} className="flex items-center gap-2">
                    <Avatar name={a.name} seed={a.uid} src={a.photo} size={32} />
                    <div className="min-w-0">
                      <div className="text-h3">{a.name}</div>
                      <div className="text-small text-ink-3">
                        For {role?.title ?? 'a role'} · {timeAgo(a.createdAt)} · tap to see their skill profile
                      </div>
                    </div>
                  </Link>
                  <p className="text-body whitespace-pre-line text-ink-2">{a.pitch}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={busy === a.uid} onClick={() => run(a.uid, () => reject(t, a))}>
                      Reject
                    </Button>
                    <Button size="sm" disabled={roleFull} loading={busy === a.uid} onClick={() => run(a.uid, () => accept(t, a), `${a.name} is on the team`)}>
                      {roleFull ? 'Role filled' : 'Accept'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-2">Team ({members.data.length})</h2>
        <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
          {members.data.map((m) => {
            const role = t.roles.find((r) => r.id === roleOf(m.uid))
            return (
              <ListRow
                key={m.uid}
                to={`/people/${m.uid}`}
                leading={<Avatar name={m.name} seed={m.uid} src={m.photo} size={32} />}
                title={m.name}
                meta={m.role === 'owner' ? 'Owner' : (role?.title ?? 'Member')}
                trailing={
                  isOwner &&
                  m.role !== 'owner' && (
                    <Button size="sm" variant="ghost" onClick={() => run(m.uid, () => leaveTeam(t, m.uid, roleOf(m.uid)), 'Removed from the team')}>
                      Remove
                    </Button>
                  )
                }
              />
            )
          })}
        </div>
      </section>

      <ApplySheet team={t} open={applying} onClose={() => setApplying(false)} />
      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'teams', id: t.id, ownerId: t.owner.uid, label: t.name }} />
    </Page>
  )
}

function ApplySheet({ team, open, onClose }: { team: Team; open: boolean; onClose: () => void }) {
  const me = useMe()
  const { toast } = useToast()
  const openRoles = team.roles.filter((r) => r.filled < r.count)
  const form = useZodForm(teamApplicationSchema, { defaultValues: { roleId: openRoles[0]?.id ?? '', pitch: '' } })
  const submit = form.handleSubmit(async (v) => {
    try {
      await apply(team, me, v.roleId, v.pitch)
      onClose()
      toast('Application sent', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Apply to ${team.name}`}
      description="The owner sees your pitch and your skill profile."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Send
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Select label="Role" required error={form.formState.errors.roleId?.message} {...form.register('roleId')}>
          {openRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {r.skills.map(tagLabel).join(', ')}
            </option>
          ))}
        </Select>
        <Textarea label="Pitch" required rows={5} placeholder="What you have built before, how many hours a week you can give, why this project." error={form.formState.errors.pitch?.message} {...form.register('pitch')} />
      </form>
    </Sheet>
  )
}
