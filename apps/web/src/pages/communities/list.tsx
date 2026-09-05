import { useState } from 'react'
import { Link } from 'react-router'
import { limit, query, where } from 'firebase/firestore'
import { Globe, Plus } from 'lucide-react'
import { GROUP_CATEGORIES } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, Chip, EmptyState, ListRow, PageHeader, SkeletonList, StatusChip } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { useBrowse, useMyGroups } from '@/features/social/hooks'
import { useCollection } from '@/hooks/use-collection'
import { cols } from '@/lib/firestore'
import { plural } from '@/lib/utils'
import { GroupMark } from '../groups/list'

export default function CommunitiesPage() {
  const me = useMe()
  const [category, setCategory] = useState<string | null>(null)
  const browse = useBrowse('communities', category)
  const mine = useMyGroups('communities', me.uid)
  const myRequests = useCollection(query(cols.communityRequests, where('requester.uid', '==', me.uid), limit(20)), `my-community-requests:${me.uid}`)

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader
        title="Communities"
        description="Moderated spaces with posts, polls and channels."
        action={
          <Link to="/communities/request">
            <Button size="sm" icon={<Plus className="size-4" />}>
              Request
            </Button>
          </Link>
        }
      />

      {myRequests.data.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Your requests</h2>
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {myRequests.data.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                meta={r.status === 'rejected' && r.note ? r.note : r.category}
                trailing={<StatusChip tone={r.status === 'approved' ? 'open' : r.status === 'rejected' ? 'danger' : 'pending'}>{r.status === 'pending' ? 'Awaiting admin' : r.status}</StatusChip>}
              />
            ))}
          </div>
        </section>
      )}

      {mine.data.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Your communities</h2>
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {mine.data.map((c) => (
              <ListRow key={c.id} to={`/communities/${c.id}`} leading={<GroupMark name={c.name} />} title={c.name} meta={`${c.category} · ${plural(c.memberCount, 'member')}`} chevron />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">All communities</h2>
        <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <Chip selected={!category} onClick={() => setCategory(null)}>
            All
          </Chip>
          {GROUP_CATEGORIES.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        {browse.loading ? (
          <SkeletonList rows={4} card />
        ) : browse.data.length === 0 ? (
          <EmptyState
            icon={Globe}
            text="No communities yet. Request one and an admin will review it."
            action={
              <Link to="/communities/request">
                <Button variant="secondary" size="sm">
                  Request a community
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {browse.data.map((c) => (
              <Link key={c.id} to={`/communities/${c.id}`}>
                <Card interactive className="flex h-full gap-3">
                  <GroupMark name={c.name} />
                  <div className="min-w-0">
                    <div className="truncate text-h3">{c.name}</div>
                    <div className="text-small text-ink-3">
                      {c.category} · {plural(c.memberCount, 'member')}
                    </div>
                    <p className="mt-1 line-clamp-2 text-small text-ink-2">{c.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Page>
  )
}
