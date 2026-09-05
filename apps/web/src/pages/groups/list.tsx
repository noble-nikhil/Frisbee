import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Layers, Plus } from 'lucide-react'
import { GROUP_CATEGORIES, groupSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, Chip, EmptyState, Input, ListRow, PageHeader, Select, Sheet, SkeletonList, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { createGroup } from '@/features/social/api'
import { useBrowse, useMyGroups } from '@/features/social/hooks'
import { useZodForm } from '@/lib/form'
import { friendlyError, plural } from '@/lib/utils'

export default function GroupsPage() {
  const me = useMe()
  const [category, setCategory] = useState<string | null>(null)
  const [create, setCreate] = useState(false)
  const browse = useBrowse('groups', category)
  const mine = useMyGroups('groups', me.uid)

  return (
    <Page className="flex flex-col gap-5">
      <PageHeader
        title="Groups"
        description="Interest groups with a feed and a chat."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>
            New
          </Button>
        }
      />

      {mine.data.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Your groups</h2>
          <div className="divide-y divide-line rounded-md border border-line bg-surface px-3">
            {mine.data.map((g) => (
              <ListRow key={g.id} to={`/groups/${g.id}`} leading={<GroupMark name={g.name} />} title={g.name} meta={`${g.category} · ${plural(g.memberCount, 'member')}`} chevron />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Discover</h2>
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
          <SkeletonList rows={5} card />
        ) : browse.data.length === 0 ? (
          <EmptyState
            icon={Layers}
            text={category ? `No ${category.toLowerCase()} groups yet.` : 'No groups yet. Start the first one.'}
            action={
              <Button variant="secondary" size="sm" onClick={() => setCreate(true)}>
                Create a group
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {browse.data.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`}>
                <Card interactive className="flex h-full gap-3">
                  <GroupMark name={g.name} />
                  <div className="min-w-0">
                    <div className="truncate text-h3">{g.name}</div>
                    <div className="text-small text-ink-3">
                      {g.category} · {plural(g.memberCount, 'member')}
                    </div>
                    <p className="mt-1 line-clamp-2 text-small text-ink-2">{g.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateGroupSheet open={create} onClose={() => setCreate(false)} />
    </Page>
  )
}

export function GroupMark({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas text-h3 text-ink-2" aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const form = useZodForm(groupSchema, { defaultValues: { name: '', category: undefined, description: '', visibility: 'public' } })
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createGroup(me, v)
      onClose()
      navigate(`/groups/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New group"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={form.formState.isSubmitting} onClick={submit}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Name" required error={form.formState.errors.name?.message} {...form.register('name')} />
        <Select label="Category" required placeholder="Select" defaultValue="" error={form.formState.errors.category?.message} {...form.register('category')}>
          {GROUP_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Textarea label="What is it about?" required rows={3} error={form.formState.errors.description?.message} {...form.register('description')} />
        <Select label="Joining" {...form.register('visibility')}>
          <option value="public">Anyone can join</option>
          <option value="request">Approve requests</option>
        </Select>
      </form>
    </Sheet>
  )
}
