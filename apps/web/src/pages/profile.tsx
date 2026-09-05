import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { ArrowLeftRight, Ban, Flag, MessageSquare, MoreHorizontal, UserMinus, UserPlus } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { exchangeProposalSchema, scoreMatch, tagLabel, type User } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Avatar, Button, Card, Chip, ErrorState, IconButton, MatchExplain, PageHeader, ScoreBar, Sheet, Skeleton, StatusChip, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { blockUser, removeConnection, sendConnectionRequest, toRef, unblockUser } from '@/features/connections/api'
import { useBlocks, useConnections, useOutgoingRequests } from '@/features/connections/hooks'
import { proposeExchange } from '@/features/exchange/api'
import { openDm } from '@/features/messaging/api'
import { AvailabilityGrid } from '@/features/profile/availability-grid'
import { TagPicker } from '@/features/profile/tag-picker'
import { ReportSheet } from '@/features/safety/report-sheet'
import { cols, doc } from '@/lib/firestore'
import { useZodForm } from '@/lib/form'
import { friendlyError, yearLabel } from '@/lib/utils'

export default function ProfilePage() {
  const { uid = '' } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const connections = useConnections(me.uid)
  const outgoing = useOutgoingRequests(me.uid)
  const blocks = useBlocks(me.uid)
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [swap, setSwap] = useState(params.get('swap') === '1')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (uid === me.uid) navigate('/me', { replace: true })
  }, [uid, me.uid, navigate])

  const user = useQuery({
    queryKey: ['user', uid],
    queryFn: async () => (await getDoc(doc(cols.users, uid))).data() ?? null,
    enabled: !!uid,
  })
  const mutualGroups = useQuery({
    queryKey: ['mutual-groups', me.uid, uid],
    queryFn: async () => {
      const [mine, theirs] = await Promise.all([
        getDocs(query(cols.groups, where('memberIds', 'array-contains', me.uid), limit(50))),
        getDocs(query(cols.groups, where('memberIds', 'array-contains', uid), limit(50))),
      ])
      const t = new Set(theirs.docs.map((d) => d.id))
      return mine.docs.filter((d) => t.has(d.id)).map((d) => d.data())
    },
    enabled: !!uid,
  })

  const u = user.data
  const connected = connections.set.has(uid)
  const requested = useMemo(() => outgoing.data.some((r) => r.to === uid), [outgoing.data, uid])
  const blocked = blocks.has(uid)
  const match = useMemo(() => (u ? scoreMatch(me, u) : null), [me, u])

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

  if (user.isLoading)
    return (
      <Page>
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </Page>
    )
  if (!u || user.error)
    return (
      <Page>
        <PageHeader title="Profile" back />
        <ErrorState error="This profile isn't available." />
      </Page>
    )

  const hiddenByPrivacy = u.privacy.profile === 'connections' && !connected
  const canMessage = connected || u.privacy.messages === 'everyone'

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader
        title=""
        back
        action={
          <div className="relative">
            <IconButton aria-label="More" onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal className="size-5" />
            </IconButton>
            {menu && (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-line bg-surface py-1 shadow-pop" onMouseLeave={() => setMenu(false)}>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-small hover:bg-canvas" onClick={() => { setMenu(false); setReport(true) }}>
                  <Flag className="size-4" /> Report
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-danger hover:bg-danger-bg"
                  onClick={() => {
                    setMenu(false)
                    void run('block', () => (blocked ? unblockUser(me.uid, uid) : blockUser(me.uid, uid)), blocked ? 'Unblocked' : 'Blocked')
                  }}
                >
                  <Ban className="size-4" /> {blocked ? 'Unblock' : 'Block'}
                </button>
                {connected && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-danger hover:bg-danger-bg"
                    onClick={() => {
                      setMenu(false)
                      void run('remove', () => removeConnection(me.uid, uid), 'Connection removed')
                    }}
                  >
                    <UserMinus className="size-4" /> Remove connection
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="-mt-6 flex items-start gap-4">
        <Avatar name={u.displayName} seed={u.uid} src={u.photoURL} size={96} verified={u.roles.verifiedStudent} />
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="text-h1">{u.displayName}</h1>
          <p className="text-body text-ink-2">
            {u.department}
            {u.year ? ` · ${yearLabel(u.year)}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.roles.verifiedStudent && <StatusChip tone="open">Verified student</StatusChip>}
            {u.roles.tutor && <StatusChip tone="info">Tutor</StatusChip>}
            {u.roles.volunteer && <StatusChip tone="info">Volunteer</StatusChip>}
            {connected && <StatusChip tone="closed">Connected</StatusChip>}
          </div>
        </div>
      </div>

      {blocked && <p className="rounded-md bg-danger-bg px-3 py-2 text-small text-danger">You've blocked this person. They can't message you or see you in matches.</p>}

      <div className="flex gap-2">
        {connected ? (
          <Button
            full
            icon={<MessageSquare className="size-4" />}
            loading={busy === 'dm'}
            onClick={() => run('dm', async () => navigate(`/messages/${await openDm(me, toRef(u))}`))}
          >
            Message
          </Button>
        ) : (
          <Button
            full
            icon={<UserPlus className="size-4" />}
            disabled={requested || u.privacy.requests === 'nobody' || blocked}
            loading={busy === 'connect'}
            onClick={() => run('connect', () => sendConnectionRequest(me, u), `Request sent to ${u.displayName}`)}
          >
            {requested ? 'Requested' : 'Connect'}
          </Button>
        )}
        {!connected && canMessage && (
          <Button variant="secondary" icon={<MessageSquare className="size-4" />} loading={busy === 'dm'} onClick={() => run('dm', async () => navigate(`/messages/${await openDm(me, toRef(u))}`))}>
            Message
          </Button>
        )}
        <Button variant="secondary" icon={<ArrowLeftRight className="size-4" />} onClick={() => setSwap(true)} aria-label="Propose a skill swap">
          <span className="hidden sm:inline">Swap</span>
        </Button>
      </div>

      {hiddenByPrivacy ? (
        <Card>
          <p className="text-small text-ink-2">{u.displayName} shares their full profile with connections only.</p>
        </Card>
      ) : (
        <>
          {match && match.score > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="eyebrow">Why you match</span>
                <span className="text-h3 tabular-nums">{match.score}%</span>
              </div>
              <ScoreBar score={match.score} className="mt-2" />
              <MatchExplain shared={match.shared} max={5} className="mt-3" />
            </Card>
          )}

          {u.bio && <p className="text-body whitespace-pre-line">{u.bio}</p>}

          <TagSection title="Skills" tags={u.skills.map((s) => tagLabel(s.tag))} levels={u.skills.map((s) => s.level)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TagSection title="Can teach" tags={u.canTeach.map(tagLabel)} />
            <TagSection title="Wants to learn" tags={u.wantsToLearn.map(tagLabel)} />
          </div>
          <TagSection title="Interests" tags={u.interests.map(tagLabel)} />
          <TagSection title="Hobbies" tags={u.hobbies.map(tagLabel)} />
          <TagSection title="Career goals" tags={u.careerGoals.map(tagLabel)} />

          {u.privacy.showAvailability && Object.values(u.availability).some((s) => s?.length) && (
            <section>
              <h2 className="eyebrow mb-2">Usually free</h2>
              <AvailabilityGrid value={u.availability} compact />
            </section>
          )}

          {mutualGroups.data && mutualGroups.data.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2">Groups in common</h2>
              <div className="flex flex-wrap gap-1.5">
                {mutualGroups.data.map((g) => (
                  <Link key={g.id} to={`/groups/${g.id}`}>
                    <Chip>{g.name}</Chip>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ReportSheet open={report} onClose={() => setReport(false)} target={{ collection: 'users', id: u.uid, ownerId: u.uid, label: u.displayName }} />
      <SwapSheet
        open={swap}
        onClose={() => {
          setSwap(false)
          if (params.get('swap')) setParams({}, { replace: true })
        }}
        other={u}
      />
    </Page>
  )
}

function TagSection({ title, tags, levels }: { title: string; tags: string[]; levels?: number[] }) {
  if (!tags.length) return null
  return (
    <section>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <Chip
            key={t}
            icon={
              levels ? (
                <span className="flex gap-0.5" aria-label={`level ${levels[i]}`}>
                  {[1, 2, 3].map((d) => (
                    <span key={d} className={`size-1.5 rounded-full ${d <= (levels[i] ?? 1) ? 'bg-teal-600' : 'bg-line-strong'}`} />
                  ))}
                </span>
              ) : undefined
            }
          >
            {t}
          </Chip>
        ))}
      </div>
    </section>
  )
}

function SwapSheet({ open, onClose, other }: { open: boolean; onClose: () => void; other: User }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const form = useZodForm(exchangeProposalSchema, {
    defaultValues: {
      bId: other.uid,
      aTeaches: me.canTeach.filter((t) => other.wantsToLearn.includes(t)).slice(0, 3),
      bTeaches: other.canTeach.filter((t) => me.wantsToLearn.includes(t)).slice(0, 3),
      message: '',
    },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      await proposeExchange(me, toRef(other), v)
      toast('Swap proposed', 'success')
      onClose()
      navigate('/messages')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Propose a skill swap"
      description={`You teach ${other.displayName.split(' ')[0]} something, they teach you something back.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Send proposal
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Controller
          control={form.control}
          name="aTeaches"
          render={({ field }) => (
            <TagPicker kind="skill" label="You teach" only={me.canTeach} max={3} value={field.value} onChange={field.onChange} error={form.formState.errors.aTeaches?.message} hint={me.canTeach.length ? undefined : 'Add skills you can teach in your profile first.'} />
          )}
        />
        <Controller
          control={form.control}
          name="bTeaches"
          render={({ field }) => (
            <TagPicker kind="skill" label="They teach" only={other.canTeach} max={3} value={field.value} onChange={field.onChange} error={form.formState.errors.bTeaches?.message} hint={other.canTeach.length ? undefined : `${other.displayName} hasn't listed teachable skills.`} />
          )}
        />
        <Textarea label="Message" rows={2} placeholder="When are you free? Any preference for where?" {...form.register('message')} />
      </form>
    </Sheet>
  )
}
