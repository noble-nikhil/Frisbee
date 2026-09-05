import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, loginSchema } from '@frisbee/shared'
import { Button, Input, useToast } from '@/components/ui'
import { logIn, logInWithGoogle } from '@/features/auth/api'
import { useZodForm } from '@/lib/form'
import { friendlyError } from '@/lib/utils'
import { AuthLayout, GoogleGlyph } from './auth-layout'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const { toast } = useToast()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const form = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } })

  const after = () => navigate(location.state?.from ?? '/home', { replace: true })

  const submit = form.handleSubmit(async ({ email, password }) => {
    try {
      await logIn(email, password)
      after()
    } catch (e) {
      form.setError('root', { message: friendlyError(e) })
    }
  })

  const google = async () => {
    setGoogleBusy(true)
    try {
      await logInWithGoogle()
      after()
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Welcome back.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" inputMode="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Input label="Password" type="password" autoComplete="current-password" error={form.formState.errors.password?.message} {...form.register('password')} />
        {form.formState.errors.root && <p className="text-small text-danger">{form.formState.errors.root.message}</p>}
        <Button type="submit" size="lg" full loading={form.formState.isSubmitting}>
          Log in
        </Button>
      </form>
      <Button variant="secondary" size="lg" full className="mt-3" icon={<GoogleGlyph />} loading={googleBusy} onClick={google}>
        Continue with Google
      </Button>
      <div className="mt-5 flex justify-between text-small">
        <Link to="/forgot" className="text-ink-2 hover:underline">
          Forgot password?
        </Link>
        <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
          Create account
        </Link>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <button type="button" onClick={() => setShowDemo((s) => !s)} className="text-small text-ink-3 hover:text-ink-2">
          {showDemo ? 'Hide demo accounts' : 'Judging? Use a demo account'}
        </button>
        {showDemo && (
          <ul className="mt-2 flex flex-col divide-y divide-line text-small">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold text-ink">{a.label}</div>
                  <div className="text-ink-3">{a.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    form.setValue('email', a.email)
                    form.setValue('password', DEMO_PASSWORD)
                    void submit()
                  }}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthLayout>
  )
}
