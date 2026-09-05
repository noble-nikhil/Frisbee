import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { format } from 'date-fns'
import { Plus, Trash2, Users } from 'lucide-react'
import { LIMITS, teamSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, EmptyState, Field, Input, PageHeader, Sheet, SkeletonList, Tabs, Textarea, useTabParam, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { TagPicker } from '@/features/profile/tag-picker'
import { createTeam } from '@/features/teams/api'
import { TeamsBrowse } from '@/features/teams/browse'
import { useMyTeams } from '@/features/teams/hooks'
import { TeamCard } from '@/features/teams/team-card'
import { useZodForm } from '@/lib/form'
import { friendlyError } from '@/lib/utils'

const TABS = ['browse', 'mine'] as const

export default function TeamsPage() {
  const [tab, setTab] = useTabParam(TABS, 'browse')
  const [params, setParams] = useSearchParams()
  // /teams?new=1 opens the composer straight away (linked from Discover)
  const [create, setCreateState] = useState(() => params.get('new') === '1')
  const setCreate = (open: boolean) => {
    setCreateState(open)
    if (!open && params.get('new')) {
      params.delete('new')
      setParams(params, { replace: true })
    }
  }

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader
        title="Teams"
        description="Find teammates for hackathons, projects and competitions."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>
            Post
          </Button>
        }
      />
      <Tabs
        items={[
          { id: 'browse', label: 'Browse' },
          { id: 'mine', label: 'My teams' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'browse' ? <TeamsBrowse showPost={false} /> : <Mine />}
      <TeamSheet open={create} onClose={() => setCreate(false)} />
    </Page>
  )
}

function Mine() {
  const me = useMe()
  const mine = useMyTeams(me.uid)
  if (mine.loading) return <SkeletonList rows={3} card />
  if (mine.data.length === 0) return <EmptyState icon={Users} text="Teams you own or join show up here." />
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[...mine.data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).map((t) => (
        <TeamCard key={t.id} t={t} />
      ))}
    </div>
  )
}

function TeamSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nextWeek] = useState(() => format(new Date(Date.now() + 7 * 86400_000), "yyyy-MM-dd'T'23:59"))
  const form = useZodForm(teamSchema, {
    defaultValues: {
      name: '',
      description: '',
      roles: [{ title: '', skills: [], count: 1 }],
      deadline: nextWeek,
      links: [],
    },
  })
  const roles = form.watch('roles')
  const links = form.watch('links') ?? []
  const errors = form.formState.errors
  const submit = form.handleSubmit(async (v) => {
    try {
      const id = await createTeam(me, v)
      onClose()
      navigate(`/teams/${id}`)
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Post a team"
      description="Describe the project, list the roles you need, set a deadline."
      wide
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
        <Input label="Project name" required maxLength={LIMITS.title} placeholder="e.g. Campus lost & found bot" error={errors.name?.message} {...form.register('name')} />
        <Textarea label="Pitch" required rows={4} hint="What are you building, for which hackathon or course, and what is already done." error={errors.description?.message} {...form.register('description')} />
        <Field label="Roles you need" required error={typeof errors.roles?.message === 'string' ? errors.roles.message : errors.roles?.root?.message}>
          {() => (
            <div className="flex flex-col gap-3">
              {roles.map((r, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-md border border-line p-3">
                  <div className="grid grid-cols-[1fr_4.5rem_2.25rem] gap-2">
                    <Input aria-label={`Role ${i + 1} title`} placeholder="Role, e.g. Frontend dev" error={errors.roles?.[i]?.title?.message} {...form.register(`roles.${i}.title` as const)} />
                    <Input aria-label={`Role ${i + 1} count`} type="number" min={1} max={10} error={errors.roles?.[i]?.count?.message} {...form.register(`roles.${i}.count` as const)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove role"
                      disabled={roles.length === 1}
                      className="h-11 w-9 px-0 md:h-10"
                      onClick={() =>
                        form.setValue(
                          'roles',
                          roles.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <TagPicker
                    kind="skill"
                    label="Skills"
                    max={5}
                    value={r.skills}
                    onChange={(v) => form.setValue(`roles.${i}.skills` as const, v, { shouldValidate: form.formState.isSubmitted })}
                    error={errors.roles?.[i]?.skills?.message}
                  />
                </div>
              ))}
              {roles.length < 6 && (
                <Button type="button" size="sm" variant="secondary" className="self-start" onClick={() => form.setValue('roles', [...roles, { title: '', skills: [], count: 1 }])}>
                  Add another role
                </Button>
              )}
            </div>
          )}
        </Field>
        <Input label="Apply by" required type="datetime-local" error={errors.deadline?.message} {...form.register('deadline')} />
        <Field label="Links" hint="Repo, doc or hackathon page. Up to 3." error={errors.links?.message ?? errors.links?.[0]?.message}>
          {() => (
            <div className="flex flex-col gap-2">
              {[...links, ''].slice(0, 3).map((l, i) => (
                <Input
                  key={i}
                  aria-label={`Link ${i + 1}`}
                  type="url"
                  placeholder="https://"
                  value={l}
                  onChange={(e) => {
                    const next = [...links]
                    next[i] = e.target.value
                    form.setValue(
                      'links',
                      next.filter((x) => x.trim() !== ''),
                    )
                  }}
                />
              ))}
            </div>
          )}
        </Field>
      </form>
    </Sheet>
  )
}
