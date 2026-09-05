import { useNavigate } from 'react-router'
import { GROUP_CATEGORIES, communityRequestSchema } from '@frisbee/shared'
import { Page } from '@/components/layout/app-shell'
import { Button, Input, PageHeader, Select, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/auth-context'
import { VerifiedGate } from '@/features/auth/verified-gate'
import { requestCommunity } from '@/features/social/api'
import { useZodForm } from '@/lib/form'
import { friendlyError } from '@/lib/utils'

export default function RequestCommunityPage() {
  const me = useMe()
  const navigate = useNavigate()
  const { toast } = useToast()
  const form = useZodForm(communityRequestSchema, { defaultValues: { name: '', purpose: '', category: undefined, rules: '' } })
  const submit = form.handleSubmit(async (v) => {
    try {
      await requestCommunity(me, v)
      toast('Request sent. An admin will review it.', 'success')
      navigate('/communities')
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  })
  return (
    <Page>
      <PageHeader title="Request a community" description="Communities are moderated spaces. An admin approves each one and you become its first admin." back="/communities" />
      <VerifiedGate what="request a community">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input label="Name" required error={form.formState.errors.name?.message} {...form.register('name')} />
          <Select label="Category" required placeholder="Select" defaultValue="" error={form.formState.errors.category?.message} {...form.register('category')}>
            {GROUP_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Textarea label="Purpose" required rows={4} hint="Who is it for and what will happen there? At least a couple of sentences." error={form.formState.errors.purpose?.message} {...form.register('purpose')} />
          <Textarea label="Rules" rows={3} hint="Optional. Shown to every member." error={form.formState.errors.rules?.message} {...form.register('rules')} />
          <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="self-start">
            Send request
          </Button>
        </form>
      </VerifiedGate>
    </Page>
  )
}
