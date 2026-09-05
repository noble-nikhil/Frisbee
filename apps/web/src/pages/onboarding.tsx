import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Controller } from 'react-hook-form'
import {
  DEPARTMENTS,
  YEARS,
  availabilityStepSchema,
  basicsSchema,
  tagsSchema,
} from '@frisbee/shared'
import { Button, Input, Select, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { saveAvailability, saveBasics, saveTags } from '@/features/profile/api'
import { AvatarUpload } from '@/features/profile/avatar-upload'
import { AvailabilityGrid } from '@/features/profile/availability-grid'
import { SkillPicker } from '@/features/profile/skill-picker'
import { TagPicker } from '@/features/profile/tag-picker'
import { Credit } from '@/components/layout/credit'
import { useZodForm } from '@/lib/form'
import { env } from '@/lib/env'
import { friendlyError, yearLabel } from '@/lib/utils'

const STEPS = ['Basics', 'Tags', 'Availability'] as const

export default function OnboardingPage() {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  // resumable: land on the first unfinished step
  const [step, setStep] = useState<0 | 1 | 2>(Math.min(me.onboardingStep, 2) as 0 | 1 | 2)

  const fail = (e: unknown) => toast(friendlyError(e), 'error')

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-topbar w-full max-w-content items-center justify-between px-4">
          <span className="text-h3">Set up your profile</span>
          <span className="text-small text-ink-3">
            {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
        </div>
        <div className="h-0.5 w-full bg-line">
          <div className="h-full bg-brand-500 transition-[width] duration-200" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-content flex-1 px-4 py-6">
        {step === 0 && <BasicsStep onDone={() => setStep(1)} onError={fail} />}
        {step === 1 && <TagsStep onBack={() => setStep(0)} onDone={() => setStep(2)} onError={fail} />}
        {step === 2 && (
          <AvailabilityStep
            onBack={() => setStep(1)}
            onDone={() => navigate(me.emailDomain === env.collegeDomain && !me.roles.verifiedStudent ? '/verify' : '/home', { replace: true })}
            onError={fail}
          />
        )}
      </main>
      <Credit className="py-4" />
    </div>
  )
}

interface StepProps {
  onDone: () => void
  onError: (e: unknown) => void
  onBack?: () => void
}

function StepActions({ onBack, loading, last }: { onBack?: () => void; loading: boolean; last?: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-2 border-t border-line bg-canvas px-4 py-3 safe-bottom">
      <Button type="submit" size="lg" full loading={loading}>
        {last ? 'Finish' : 'Continue'}
      </Button>
      {onBack && (
        <Button type="button" variant="ghost" full onClick={onBack}>
          Back
        </Button>
      )}
    </div>
  )
}

function BasicsStep({ onDone, onError }: StepProps) {
  const me = useMe()
  const [photo, setPhoto] = useState<string | null>(me.photoURL)
  const form = useZodForm(basicsSchema, {
    defaultValues: {
      displayName: me.displayName,
      department: me.department ?? undefined,
      year: me.year ?? undefined,
      bio: me.bio,
    },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      await saveBasics(me.uid, v, photo)
      onDone()
    } catch (e) {
      onError(e)
    }
  })
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1">Who are you?</h1>
        <p className="mt-1 text-body text-ink-2">This is what other students see first.</p>
      </div>
      <AvatarUpload name={form.watch('displayName') || me.displayName} uid={me.uid} value={photo} onChange={setPhoto} />
      <Input label="Name" required autoComplete="name" error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Department" required placeholder="Select" defaultValue="" error={form.formState.errors.department?.message} {...form.register('department')}>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select label="Year" required placeholder="Select" defaultValue="" error={form.formState.errors.year?.message} {...form.register('year')}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {yearLabel(y)}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        label="Bio"
        hint="One or two lines. What are you into right now?"
        rows={3}
        error={form.formState.errors.bio?.message}
        {...form.register('bio')}
      />
      <StepActions loading={form.formState.isSubmitting} />
    </form>
  )
}

function TagsStep({ onBack, onDone, onError }: StepProps) {
  const me = useMe()
  const form = useZodForm(tagsSchema, {
    defaultValues: {
      skills: me.skills,
      canTeach: me.canTeach,
      wantsToLearn: me.wantsToLearn,
      interests: me.interests,
      hobbies: me.hobbies,
      careerGoals: me.careerGoals,
    },
  })
  const skills = form.watch('skills')
  const errors = form.formState.errors
  const submit = form.handleSubmit(async (v) => {
    try {
      await saveTags(me.uid, v, me)
      onDone()
    } catch (e) {
      onError(e)
    }
  })
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">What are you about?</h1>
        <p className="mt-1 text-body text-ink-2">Tags power your matches. You can change them any time.</p>
      </div>
      <Controller control={form.control} name="skills" render={({ field }) => <SkillPicker value={field.value} onChange={field.onChange} error={errors.skills?.message} />} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="canTeach"
          render={({ field }) => (
            <TagPicker kind="skill" label="Can teach" hint="From your skills" only={skills.map((s) => s.tag)} max={6} value={field.value} onChange={field.onChange} error={errors.canTeach?.message} />
          )}
        />
        <Controller
          control={form.control}
          name="wantsToLearn"
          render={({ field }) => <TagPicker kind="skill" label="Wants to learn" max={6} value={field.value} onChange={field.onChange} error={errors.wantsToLearn?.message} />}
        />
      </div>
      <Controller control={form.control} name="interests" render={({ field }) => <TagPicker kind="interest" label="Interests" value={field.value} onChange={field.onChange} error={errors.interests?.message} />} />
      <Controller control={form.control} name="hobbies" render={({ field }) => <TagPicker kind="hobby" label="Hobbies" max={8} value={field.value} onChange={field.onChange} error={errors.hobbies?.message} />} />
      <Controller control={form.control} name="careerGoals" render={({ field }) => <TagPicker kind="careerGoal" label="Career goals" max={4} value={field.value} onChange={field.onChange} error={errors.careerGoals?.message} />} />
      <StepActions onBack={onBack} loading={form.formState.isSubmitting} />
    </form>
  )
}

function AvailabilityStep({ onBack, onDone, onError }: StepProps) {
  const me = useMe()
  const form = useZodForm(availabilityStepSchema, {
    defaultValues: { availability: me.availability, privacy: me.privacy },
  })
  const submit = form.handleSubmit(async (v) => {
    try {
      await saveAvailability(me.uid, v)
      onDone()
    } catch (e) {
      onError(e)
    }
  })
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">When are you free?</h1>
        <p className="mt-1 text-body text-ink-2">Roughly. It helps match people who can actually meet.</p>
      </div>
      <Controller control={form.control} name="availability" render={({ field }) => <AvailabilityGrid value={field.value} onChange={field.onChange} />} />

      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
        <h2 className="text-h3">Privacy</h2>
        <Select label="Who can see your profile" {...form.register('privacy.profile')}>
          <option value="everyone">Everyone on frisbee</option>
          <option value="connections">Only my connections</option>
          <option value="hidden">Hidden from search and matches</option>
        </Select>
        <Select label="Who can message you" {...form.register('privacy.messages')}>
          <option value="everyone">Anyone</option>
          <option value="connections">Only connections</option>
        </Select>
        <Select label="Connection requests" {...form.register('privacy.requests')}>
          <option value="everyone">Anyone can send</option>
          <option value="nobody">Nobody</option>
        </Select>
        <label className="flex items-center gap-3 text-body">
          <input type="checkbox" className="size-4 accent-brand-500" {...form.register('privacy.showAvailability')} />
          Show my availability on my profile
        </label>
      </div>
      <StepActions onBack={onBack} loading={form.formState.isSubmitting} last />
    </form>
  )
}
