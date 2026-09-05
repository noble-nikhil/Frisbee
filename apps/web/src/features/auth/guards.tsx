import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './auth-context'
import { SplashScreen } from '@/components/layout/splash'

/** Signed-in + onboarding complete. */
export function RequireAuth() {
  const { firebaseUser, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <SplashScreen />
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profile && !profile.profileComplete && !location.pathname.startsWith('/onboarding'))
    return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Signed-in but onboarding may be incomplete (the onboarding route itself). */
export function RequireSession() {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!firebaseUser) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Login/signup: bounce signed-in users to the app. */
export function RedirectIfAuthed() {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (firebaseUser) return <Navigate to="/home" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!isAdmin) return <Navigate to="/home" replace />
  return <Outlet />
}
