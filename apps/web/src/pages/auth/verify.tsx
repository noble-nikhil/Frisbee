import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BadgeCheck } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/auth-context'
import { resendVerification, syncVerifiedStudent } from '@/features/auth/api'
import { env } from '@/lib/env'
import { friendlyError } from '@/lib/utils'
import { AuthLayout } from './auth-layout'

export default function VerifyPage() {
  const { firebaseUser, profile, isCollegeEmail, isVerified } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'resend' | 'check' | null>(null)

  if (!firebaseUser || !profile) return null

  if (isVerified)
    return (
      <AuthLayout title="You're verified">
        <p className="flex items-center gap-2 text-body text-ink-2">
          <BadgeCheck className="size-5 fill-teal-600 text-white" /> {firebaseUser.email} is a verified student address.
        </p>
        <Button className="mt-5" full size="lg" onClick={() => navigate(profile.profileComplete ? '/home' : '/onboarding')}>
          Continue
        </Button>
      </AuthLayout>
    )

  if (!isCollegeEmail)
    return (
      <AuthLayout title="College email needed" subtitle={`Verification is only for @${env.collegeDomain} addresses.`}>
        <p className="text-body text-ink-2">
          You're signed in as <strong className="font-semibold text-ink">{firebaseUser.email}</strong>. You can use most of frisbee
          without verifying; posting rides, tutoring and community requests need a college address.
        </p>
        <Button className="mt-5" variant="secondary" full onClick={() => navigate(-1)}>
          Back
        </Button>
      </AuthLayout>
    )

  const resend = async () => {
    setBusy('resend')
    try {
      await resendVerification()
      toast('Verification email sent', 'success')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const check = async () => {
    setBusy('check')
    try {
      const ok = await syncVerifiedStudent(firebaseUser, profile)
      if (!ok) toast('Not verified yet — open the link in the email first', 'info')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <AuthLayout title="Verify your college email" subtitle="Check your inbox (and spam) for a link from frisbee.">
      <p className="text-body text-ink-2">
        Sent to <strong className="font-semibold text-ink">{firebaseUser.email}</strong>.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button size="lg" full loading={busy === 'check'} onClick={check}>
          I've verified — continue
        </Button>
        <Button size="lg" variant="secondary" full loading={busy === 'resend'} onClick={resend}>
          Resend email
        </Button>
        <Button variant="ghost" full onClick={() => navigate(profile.profileComplete ? '/home' : '/onboarding')}>
          Do this later
        </Button>
      </div>
    </AuthLayout>
  )
}
