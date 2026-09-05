import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from './auth-context'
import { env } from '@/lib/env'

/**
 * Wraps actions that need a verified @srmap.edu.in address (posting rides,
 * tutoring/volunteer/community applications). Renders a quiet notice instead
 * of the action when the user isn't verified.
 */
export function VerifiedGate({ children, what }: { children: ReactNode; what: string }) {
  const { isVerified, isCollegeEmail } = useAuth()
  if (isVerified) return <>{children}</>
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-warning-bg p-3 text-small">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="text-ink-2">
        {isCollegeEmail ? (
          <>
            Verify your college email to {what}.{' '}
            <Link to="/verify" className="font-semibold text-brand-700">
              Verify now
            </Link>
          </>
        ) : (
          <>Only verified @{env.collegeDomain} students can {what}. You can still browse.</>
        )}
      </div>
    </div>
  )
}
