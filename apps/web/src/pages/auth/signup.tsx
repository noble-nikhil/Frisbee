import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signUpSchema } from '@frisbee/shared'
import { Button, Input, useToast } from '@/components/ui'
import { logInWithGoogle, signUp } from '@/features/auth/api'
import { env } from '@/lib/env'
import { useZodForm } from '@/lib/form'
import { emailDomain, friendlyError } from '@/lib/utils'
import { AuthLayout, GoogleGlyph } from './auth-layout'

export default function SignupPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [googleBusy, setGoogleBusy] = useState(false)
  const form = useZodForm(signUpSchema, {
    defaultValues: { displayName: '', email: '', password: '' },
  })
  const email = form.watch('email')
  const college = emailDomain(email) === env.collegeDomain

  const submit = form.handleSubmit(async (v) => {
    try {
      await signUp(v.displayName, v.email, v.password)
      navigate('/onboarding', { replace: true })
    } catch (e) {
      form.setError('root', { message: friendlyError(e) })
    }
  })

  const google = async () => {
    setGoogleBusy(true)
    try {
      await logInWithGoogle()
      navigate('/home', { replace: true })
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle={`Use your @${env.collegeDomain} address to get verified.`}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Name" autoComplete="name" error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          hint={email && !college ? 'Any email works — college addresses unlock verified-only features.' : undefined}
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" error={form.formState.errors.password?.message} {...form.register('password')} />
        {form.formState.errors.root && <p className="text-small text-danger">{form.formState.errors.root.message}</p>}
        <Button type="submit" size="lg" full loading={form.formState.isSubmitting}>
          Continue
        </Button>
      </form>
      <Button variant="secondary" size="lg" full className="mt-3" icon={<GoogleGlyph />} loading={googleBusy} onClick={google}>
        Continue with Google
      </Button>
      <p className="mt-5 text-center text-small text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
