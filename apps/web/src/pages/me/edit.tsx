import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Controller } from 'react-hook-form'
import { DEPARTMENTS, YEARS, basicsSchema, tagsSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Input, PageHeader, Select, Tabs, Textarea, useTabParam, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { saveAvailability, saveBasics, saveTags } from '@/features/profile/api'
import { AvatarUpload } from '@/features/profile/avatar-upload'
import { AvailabilityGrid } from '@/features/profile/availability-grid'
import { SkillPicker } from '@/features/profile/skill-picker'
import { TagPicker } from '@/features/profile/tag-picker'
import { useZodForm } from '@/lib/form'
import { friendlyError, yearLabel } from '@/lib/utils'

const TABS = ['basics', 'tags', 'availability'] as const

export default function EditProfilePage() {
  const [tab, setTab] = useTabParam(TABS, 'basics')
  return (
    <Page>
      <PageHeader title="Edit profile" back="/me" />
      <Tabs items={[{ id: 'basics', label: 'Basics' }, { id: 'tags', label: 'Tags' }, { id: 'availability', label: 'Availability' }]} value={tab} onChange={setTab} className="mb-5" />
      {tab === 'basics' && <BasicsForm />}
      {tab === 'tags' && <TagsForm />}
      {tab === 'availability' && <AvailabilityForm />}
    </Page>
  )
}

function useSave() {
  const { toast } = useToast()
  const navigate = useNavigate()
  return async (fn: () => Promise<void>) => {
    try {
      await fn()
      toast('Saved', 'success')
      navigate('/me')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }
}

function BasicsForm() {
  const me = useMe()
  const save = useSave()
  const [photo, setPhoto] = useState<string | null>(me.photoURL)
  const form = useZodForm(basicsSchema, {
    defaultValues: { displayName: me.displayName, department: me.department ?? undefined, year: me.year ?? undefined, bio: me.bio },
  })
  return (
    <form onSubmit={form.handleSubmit((v) => save(() => saveBasics(me.uid, v, photo)))} noValidate className="flex flex-col gap-5">
      <AvatarUpload name={me.displayName} uid={me.uid} value={photo} onChange={setPhoto} />
      <Input label="Name" error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Department" error={form.formState.errors.department?.message} {...form.register('department')}>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
        <Select label="Year" error={form.formState.errors.year?.message} {...form.register('year')}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {yearLabel(y)}
            </option>
          ))}
        </Select>
      </div>
      <Textarea label="Bio" rows={3} error={form.formState.errors.bio?.message} {...form.register('bio')} />
      <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="self-start">
        Save
      </Button>
    </form>
  )
}

function TagsForm() {
  const me = useMe()
  const save = useSave()
  const form = useZodForm(tagsSchema, {
    defaultValues: { skills: me.skills, canTeach: me.canTeach, wantsToLearn: me.wantsToLearn, interests: me.interests, hobbies: me.hobbies, careerGoals: me.careerGoals },
  })
  const skills = form.watch('skills')
  const e = form.formState.errors
  return (
    <form onSubmit={form.handleSubmit((v) => save(() => saveTags(me.uid, v, me)))} noValidate className="flex flex-col gap-6">
      <Controller control={form.control} name="skills" render={({ field }) => <SkillPicker value={field.value} onChange={field.onChange} error={e.skills?.message} />} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Controller control={form.control} name="canTeach" render={({ field }) => <TagPicker kind="skill" label="Can teach" only={skills.map((s) => s.tag)} max={6} value={field.value} onChange={field.onChange} error={e.canTeach?.message} />} />
        <Controller control={form.control} name="wantsToLearn" render={({ field }) => <TagPicker kind="skill" label="Wants to learn" max={6} value={field.value} onChange={field.onChange} error={e.wantsToLearn?.message} />} />
      </div>
      <Controller control={form.control} name="interests" render={({ field }) => <TagPicker kind="interest" label="Interests" value={field.value} onChange={field.onChange} error={e.interests?.message} />} />
      <Controller control={form.control} name="hobbies" render={({ field }) => <TagPicker kind="hobby" label="Hobbies" max={8} value={field.value} onChange={field.onChange} error={e.hobbies?.message} />} />
      <Controller control={form.control} name="careerGoals" render={({ field }) => <TagPicker kind="careerGoal" label="Career goals" max={4} value={field.value} onChange={field.onChange} error={e.careerGoals?.message} />} />
      <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="self-start">
        Save
      </Button>
    </form>
  )
}

function AvailabilityForm() {
  const me = useMe()
  const save = useSave()
  const [value, setValue] = useState(me.availability)
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex flex-col gap-5">
      <AvailabilityGrid value={value} onChange={setValue} />
      <Button
        size="lg"
        loading={busy}
        className="self-start"
        onClick={async () => {
          setBusy(true)
          await save(() => saveAvailability(me.uid, { availability: value, privacy: me.privacy }))
          setBusy(false)
        }}
      >
        Save
      </Button>
    </div>
  )
}
