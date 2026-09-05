import { useState } from 'react'
import { useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { pollSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Chip, ErrorState, Input, PageHeader, Sheet, Skeleton, Tabs, useTabParam, useToast } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { addChannel, createPoll } from '@/features/social/api'
import { Composer } from '@/features/social/composer'
import { usePolls, usePosts, useSocial } from '@/features/social/hooks'
import { MembersTab } from '@/features/social/members'
import { PollCard } from '@/features/social/poll-card'
import { PostCard } from '@/features/social/post-card'
import { SocialHeader } from '@/features/social/social-header'
import { useZodForm } from '@/lib/form'
import { friendlyError } from '@/lib/utils'

const TABS = ['feed', 'polls', 'members', 'about'] as const

export default function CommunityDetailPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useTabParam(TABS, 'feed')
  const [channel, setChannel] = useState<string | undefined>(undefined)
  const [pollOpen, setPollOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)
  const community = useSocial('communities', id)
  const posts = usePosts('communities', id, channel)
  const polls = usePolls(id)

  if (community.loading)
    return (
      <Page>
        <Skeleton className="h-8 w-2/3" />
      </Page>
    )
  const c = community.data
  if (!c)
    return (
      <Page>
        <PageHeader title="Community" back="/communities" />
        <ErrorState error="This community doesn't exist." />
      </Page>
    )
  const isMember = c.memberIds.includes(me.uid)
  const isStaff = isAdmin || c.ownerId === me.uid || c.mods.includes(me.uid)
  const ordered = [...posts.data.filter((p) => p.pinned), ...posts.data.filter((p) => !p.pinned)]

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="" back="/communities" />
      <div className="-mt-6">
        <SocialHeader kind="communities" g={c} />
      </div>
      <Tabs
        items={[
          { id: 'feed', label: 'Feed' },
          { id: 'polls', label: 'Polls', count: polls.data.length || undefined },
          { id: 'members', label: 'Members', count: c.memberCount },
          { id: 'about', label: 'About' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'feed' && (
        <div className="flex flex-col gap-3">
          {(c.channels?.length ?? 0) > 0 && (
            <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
              <Chip selected={!channel} onClick={() => setChannel(undefined)}>
                All
              </Chip>
              {c.channels.map((ch) => (
                <Chip key={ch.id} selected={channel === ch.id} onClick={() => setChannel(ch.id)}>
                  # {ch.name}
                </Chip>
              ))}
              {isStaff && (
                <Chip icon={<Plus className="size-3" />} onClick={() => setChannelOpen(true)}>
                  Channel
                </Chip>
              )}
            </div>
          )}
          {isMember && <Composer kind="communities" parentId={c.id} channelId={channel} />}
          {ordered.map((p) => (
            <PostCard key={p.id} kind="communities" parentId={c.id} post={p} canModerate={isStaff} isMember={isMember} />
          ))}
          {!posts.loading && posts.data.length === 0 && <p className="py-8 text-center text-small text-ink-3">No posts here yet.</p>}
        </div>
      )}

      {tab === 'polls' && (
        <div className="flex flex-col gap-3">
          {isMember && (
            <Button variant="secondary" icon={<Plus className="size-4" />} className="self-start" onClick={() => setPollOpen(true)}>
              New poll
            </Button>
          )}
          {polls.data.map((p) => (
            <PollCard key={p.id} communityId={c.id} poll={p} isMember={isMember} canModerate={isStaff || p.createdBy === me.uid} />
          ))}
          {!polls.loading && polls.data.length === 0 && <p className="py-8 text-center text-small text-ink-3">No polls yet.</p>}
        </div>
      )}

      {tab === 'members' && <MembersTab kind="communities" g={c} isStaff={isStaff} />}

      {tab === 'about' && (
        <div className="flex flex-col gap-4">
          <section>
            <h2 className="eyebrow mb-1">Purpose</h2>
            <p className="text-body whitespace-pre-line">{c.description}</p>
          </section>
          <section>
            <h2 className="eyebrow mb-1">Rules</h2>
            <p className="text-body whitespace-pre-line text-ink-2">{c.rules || 'Be decent. Admins can remove posts and members.'}</p>
          </section>
        </div>
      )}

      <PollSheet communityId={c.id} open={pollOpen} onClose={() => setPollOpen(false)} />
      <ChannelSheet communityId={c.id} open={channelOpen} onClose={() => setChannelOpen(false)} />
    </Page>
  )
}

function PollSheet({ communityId, open, onClose }: { communityId: string; open: boolean; onClose: () => void }) {
  const me = useMe()
  const { toast } = useToast()
  const form = useZodForm(pollSchema, { defaultValues: { question: '', options: ['', ''], multi: false, anonymous: false, closesAt: null } })
  const options = form.watch('options')
  const submit = form.handleSubmit(async (v) => {
    try {
      await createPoll(communityId, me, v)
      form.reset()
      onClose()
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New poll"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Publish
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Question" required error={form.formState.errors.question?.message} {...form.register('question')} />
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-2">Options</span>
          {options.map((_, i) => (
            <Input key={i} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} error={form.formState.errors.options?.[i]?.message} {...form.register(`options.${i}` as const)} />
          ))}
          {form.formState.errors.options?.root?.message && <p className="text-small text-danger">{form.formState.errors.options.root.message}</p>}
          {typeof form.formState.errors.options?.message === 'string' && <p className="text-small text-danger">{form.formState.errors.options.message}</p>}
          {options.length < 6 && (
            <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => form.setValue('options', [...options, ''])}>
              Add option
            </Button>
          )}
        </div>
        <label className="flex items-center gap-3 text-body">
          <input type="checkbox" className="size-4 accent-brand-500" {...form.register('multi')} /> Allow multiple answers
        </label>
        <label className="flex items-center gap-3 text-body">
          <input type="checkbox" className="size-4 accent-brand-500" {...form.register('anonymous')} /> Anonymous
        </label>
      </form>
    </Sheet>
  )
}

function ChannelSheet({ communityId, open, onClose }: { communityId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New channel"
      footer={
        <Button
          loading={busy}
          disabled={name.trim().length < 2}
          onClick={async () => {
            setBusy(true)
            try {
              await addChannel(communityId, name.trim())
              setName('')
              onClose()
            } catch (e) {
              toast(friendlyError(e), 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          Add
        </Button>
      }
    >
      <Input label="Channel name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} hint="e.g. Announcements, Help, Off-topic" />
    </Sheet>
  )
}
