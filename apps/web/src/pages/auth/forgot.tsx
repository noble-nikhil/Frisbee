import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Input } from '@/components/ui'
import { resetPassword } from '@/features/auth/api'
import { friendlyError } from '@/lib/utils'
import { AuthLayout } from './auth-layout'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState<string>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('busy')
    setError(undefined)
    try {
      await resetPassword(email)
      setState('sent')
    } catch (err) {
      setError(friendlyError(err))
      setState('idle')
    }
  }

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a link.">
      {state === 'sent' ? (
        <p className="text-body text-ink-2">
          If an account exists for <strong className="font-semibold text-ink">{email}</strong>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" size="lg" full loading={state === 'busy'}>
            Send link
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-small">
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}
