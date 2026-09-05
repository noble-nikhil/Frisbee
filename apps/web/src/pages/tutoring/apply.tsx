import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Controller } from 'react-hook-form'
import { Paperclip, Trash2, X } from 'lucide-react'
import { DAYS, DAY_LABELS, tutorApplicationSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Card, Field, Input, PageHeader, Select, StatusChip, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { VerifiedGate } from '@/features/auth/verified-gate'
import { TagPicker } from '@/features/profile/tag-picker'
import { applyAsTutor } from '@/features/tutoring/api'
import { useMyTutorApplication } from '@/features/tutoring/hooks'
import { resizeImage, uploadImage } from '@/lib/cloudinary'
import { useZodForm } from '@/lib/form'
import { friendlyError, timeAgo } from '@/lib/utils'

export default function TutorApplyPage() {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const existing = useMyTutorApplication(me.uid)
  const pending = existing.data.find((a) => a.status === 'pending')
  const last = [...existing.data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]
  const file = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const form = useZodForm(tutorApplicationSchema, {
    defaultValues: {
      bio: '',
      skills: me.canTeach.slice(0, 6),
      hourlyRate: 200,
      availability: [{ dow: 'sat', start: '10:00', end: '13:00' }],
      proofURLs: [],
    },
  })
  const windows = form.watch('availability')
  const proofs = form.watch('proofURLs') ?? []
  const errors = form.formState.errors

  const attach = async (f: File | undefined) => {
    if (!f || proofs.length >= 3) return
    setUploading(true)
    try {
      const url = await uploadImage(await resizeImage(f, 1600), 'proofs')
      form.setValue('proofURLs', [...proofs, url])
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setUploading(false)
    }
  }

  const submit = form.handleSubmit(async (v) => {
    try {
      await applyAsTutor(me, v)
      toast('Application sent. An admin will review it.', 'success')
      navigate('/tutoring')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })

  if (me.roles.tutor)
    return (
      <Page>
        <PageHeader title="Become a tutor" back="/tutoring" />
        <Card>You are already a verified tutor.</Card>
      </Page>
    )

  return (
    <Page className="flex flex-col gap-4">
      <PageHeader title="Become a tutor" description="Tell us what you can teach and when. An admin verifies every tutor before they appear in search." back="/tutoring" />
      {pending ? (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <div className="text-h3">Application under review</div>
            <div className="text-small text-ink-3">Sent {timeAgo(pending.createdAt)}. You will get a notification either way.</div>
          </div>
          <StatusChip tone="pending">Pending</StatusChip>
        </Card>
      ) : (
        <VerifiedGate what="apply as a tutor">
          {last?.status === 'rejected' && (
            <Card className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-h3">Previous application not approved</span>
                <StatusChip tone="danger">Rejected</StatusChip>
              </div>
              {last.note && <p className="text-small text-ink-2">Admin note: {last.note}</p>}
              <p className="text-small text-ink-3">You can apply again below.</p>
            </Card>
          )}
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Textarea label="About you as a tutor" required rows={4} hint="At least 30 characters. Courses you aced, how you teach, what to expect in a session." error={errors.bio?.message} {...form.register('bio')} />
            <Controller
              control={form.control}
              name="skills"
              render={({ field }) => <TagPicker kind="skill" label="Subjects" hint="Up to 6" max={6} value={field.value} onChange={field.onChange} error={errors.skills?.message} />}
            />
            <Input label="Hourly rate (₹)" required type="number" min={50} max={2000} step={10} hint="Between ₹50 and ₹2000. Students pay you directly." error={errors.hourlyRate?.message} {...form.register('hourlyRate')} />
            <Field label="Weekly availability" required hint="One-hour sessions are offered inside these windows." error={typeof errors.availability?.message === 'string' ? errors.availability.message : errors.availability?.root?.message}>
              {() => (
                <div className="flex flex-col gap-2">
                  {windows.map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2.25rem] gap-2">
                      <Select aria-label="Day" {...form.register(`availability.${i}.dow` as const)}>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {DAY_LABELS[d]}
                          </option>
                        ))}
                      </Select>
                      <Input aria-label="From" type="time" error={errors.availability?.[i]?.start?.message} {...form.register(`availability.${i}.start` as const)} />
                      <Input aria-label="To" type="time" error={errors.availability?.[i]?.end?.message} {...form.register(`availability.${i}.end` as const)} />
                      <Button type="button" variant="ghost" size="sm" aria-label="Remove window" disabled={windows.length === 1} className="h-11 w-9 px-0 md:h-10" onClick={() => form.setValue('availability', windows.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {windows.length < 7 && (
                    <Button type="button" size="sm" variant="secondary" className="self-start" onClick={() => form.setValue('availability', [...windows, { dow: 'sun', start: '10:00', end: '12:00' }])}>
                      Add a window
                    </Button>
                  )}
                </div>
              )}
            </Field>
            <Field label="Proof" hint="Optional but speeds things up: a grade card, certificate or project screenshot. Up to 3 images, seen only by admins.">
              {() => (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {proofs.map((u, i) => (
                      <span key={u} className="relative">
                        <img src={u} alt={`Proof ${i + 1}`} className="size-20 rounded-sm border border-line object-cover" />
                        <button type="button" aria-label="Remove proof" onClick={() => form.setValue('proofURLs', proofs.filter((x) => x !== u))} className="absolute -top-1.5 -right-1.5 rounded-full border border-line bg-surface p-0.5">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input ref={file} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0])} />
                  {proofs.length < 3 && (
                    <Button type="button" size="sm" variant="secondary" icon={<Paperclip className="size-4" />} loading={uploading} className="self-start" onClick={() => file.current?.click()}>
                      Attach image
                    </Button>
                  )}
                </div>
              )}
            </Field>
            <Button type="submit" size="lg" className="self-start" loading={form.formState.isSubmitting}>
              Send application
            </Button>
          </form>
        </VerifiedGate>
      )}
    </Page>
  )
}
