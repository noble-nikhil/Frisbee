import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import type { User } from '@frisbee/shared'
import { auth } from '@/lib/firebase'
import { cols, doc } from '@/lib/firestore'
import { emailDomain } from '@/lib/utils'
import { env } from '@/lib/env'
import { ensureUserDoc, syncVerifiedStudent } from './api'

interface AuthState {
  /** undefined while the first auth check runs */
  firebaseUser: FirebaseUser | null | undefined
  profile: User | null
  loading: boolean
  /** email ends with the college domain (verified or not) */
  isCollegeEmail: boolean
  isVerified: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined)
  // profile is keyed by uid so a sign-out/sign-in never shows the previous user's doc for a frame
  const [profileState, setProfileState] = useState<{ uid: string; profile: User | null; loaded: boolean }>({ uid: '', profile: null, loaded: false })

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), [])

  useEffect(() => {
    if (!firebaseUser) return
    const uid = firebaseUser.uid
    let cancelled = false
    // create-on-first-login, then live-subscribe so role/verification changes flow into the UI
    void ensureUserDoc(firebaseUser).catch(() => undefined)
    const unsub = onSnapshot(doc(cols.users, uid), (snap) => {
      if (cancelled) return
      const data = snap.exists() ? snap.data() : null
      setProfileState({ uid, profile: data, loaded: true })
      if (data && !data.roles.verifiedStudent && firebaseUser.emailVerified) {
        void syncVerifiedStudent(firebaseUser, data)
      }
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [firebaseUser])

  const current = firebaseUser && profileState.uid === firebaseUser.uid ? profileState : null
  const profile = current?.profile ?? null
  const profileLoaded = !!current?.loaded

  const value = useMemo<AuthState>(() => {
    const email = firebaseUser?.email ?? ''
    return {
      firebaseUser,
      profile,
      loading: firebaseUser === undefined || (!!firebaseUser && (!profileLoaded || !profile)),
      isCollegeEmail: emailDomain(email) === env.collegeDomain,
      isVerified: !!profile?.roles.verifiedStudent,
      isAdmin: !!profile?.roles.admin,
    }
  }, [firebaseUser, profile, profileLoaded])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** For pages behind the auth guard — the profile is guaranteed to exist. */
export function useMe(): User {
  const { profile } = useAuth()
  if (!profile) throw new Error('useMe called outside an authenticated route')
  return profile
}
