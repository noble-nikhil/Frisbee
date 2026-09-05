import { useParams } from 'react-router'
import { Page } from '@/components/layout/app-shell'
import { ErrorState, PageHeader, Skeleton, Tabs, useTabParam } from '@/components/ui'
import { useAuth, useMe } from '@/features/auth/auth-context'
import { Composer } from '@/features/social/composer'
import { useSocial, usePosts } from '@/features/social/hooks'
import { MembersTab } from '@/features/social/members'
import { PostCard } from '@/features/social/post-card'
import { SocialHeader } from '@/features/social/social-header'

const TABS = ['feed', 'members'] as const

export default function GroupDetailPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const { isAdmin } = useAuth()
  const [tab, setTab] = useTabParam(TABS, 'feed')
  const group = useSocial('groups', id)
  const posts = usePosts('groups', id)

  if (group.loading)
    return (
      <Page>
        <Skeleton className="h-8 w-2/3" />
      </Page>
    )
  const g = group.data
  if (!g)
    return (
      <Page>
        <PageHeader title="Group" back="/groups" />
        <ErrorState error="This group doesn't exist." />
      </Page>
    )
  const isMember = g.memberIds.includes(me.uid)
  const isStaff = isAdmin || g.ownerId === me.uid || g.mods.includes(me.uid)
  const pinned = posts.data.filter((p) => p.pinned)
  const rest = posts.data.filter((p) => !p.pinned)

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="" back="/groups" />
      <div className="-mt-6">
        <SocialHeader kind="groups" g={g} />
      </div>
      <Tabs items={[{ id: 'feed', label: 'Feed' }, { id: 'members', label: 'Members', count: g.memberCount }]} value={tab} onChange={setTab} />
      {tab === 'feed' && (
        <div className="flex flex-col gap-3">
          {isMember && <Composer kind="groups" parentId={g.id} />}
          {[...pinned, ...rest].map((p) => (
            <PostCard key={p.id} kind="groups" parentId={g.id} post={p} canModerate={isStaff} isMember={isMember} />
          ))}
          {!posts.loading && posts.data.length === 0 && <p className="py-8 text-center text-small text-ink-3">{isMember ? 'No posts yet. Start the conversation.' : 'No posts yet.'}</p>}
        </div>
      )}
      {tab === 'members' && <MembersTab kind="groups" g={g} isStaff={isStaff} />}
    </Page>
  )
}
