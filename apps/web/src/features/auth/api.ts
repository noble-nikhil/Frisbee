import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getDoc, updateDoc } from 'firebase/firestore'
import { tokenize, type User } from '@frisbee/shared'
import { auth, googleProvider } from '@/lib/firebase'
import { cols, doc, now, set } from '@/lib/firestore'
import { emailDomain } from '@/lib/utils'
import { apiUrl, env } from '@/lib/env'

const verifyUrl = () => ({ url: `${window.location.origin}/verify` })

export async function signUp(displayName: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await ensureUserDoc(cred.user, displayName)
  await sendEmailVerification(cred.user, verifyUrl()).catch(() => undefined)
  return cred.user
}

export async function logIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserDoc(cred.user)
  return cred.user
}

export async function logInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(cred.user)
  return cred.user
}

export const logOut = () => signOut(auth)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

export const resendVerification = () => auth.currentUser && sendEmailVerification(auth.currentUser, verifyUrl())

/**
 * Creates `users/{uid}` on first sign-in. Idempotent — safe to call on every
 * login, which also heals accounts whose doc creation failed mid-way.
 */
export async function ensureUserDoc(user: FirebaseUser, displayName?: string) {
  const ref = doc(cols.users, user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()

  const name = displayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'Student'
  const email = user.email ?? ''
  const fresh: Omit<User, 'uid' | 'createdAt' | 'updatedAt'> = {
    displayName: name,
    photoURL: user.photoURL ?? null,
    email,
    emailDomain: emailDomain(email),
    department: null,
    year: null,
    bio: '',
    roles: { verifiedStudent: false, tutor: false, volunteer: false, admin: false },
    skills: [],
    canTeach: [],
    wantsToLearn: [],
    interests: [],
    hobbies: [],
    careerGoals: [],
    availability: {},
    privacy: { profile: 'everyone', messages: 'everyone', requests: 'everyone', showAvailability: true },
    profileComplete: false,
    onboardingStep: 0,
    suspended: false,
    stats: { connections: 0, groups: 0 },
    searchTokens: tokenize(name),
  }
  await set(ref, { ...fresh, createdAt: now(), updatedAt: now() })
  return null
}

/**
 * Verified-student flag. The server mirrors it into a custom claim (for rules)
 * when it's up; the document flag alone is enough for the UI and for gating.
 */
export async function syncVerifiedStudent(user: FirebaseUser, profile: User) {
  await user.reload()
  const eligible = user.emailVerified && emailDomain(user.email ?? '') === env.collegeDomain
  if (eligible && !profile.roles.verifiedStudent) {
    await updateDoc(doc(cols.users, user.uid), { 'roles.verifiedStudent': true, updatedAt: now() })
    // best effort: ask the Node service to set the claim too (VITE_API_URL on Vercel, proxied in dev)
    fetch(apiUrl('/api/auth/refresh-claims'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    })
      .then(() => user.getIdToken(true))
      .catch(() => undefined)
  }
  return eligible
}
