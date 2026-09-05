import { Router } from 'express'
import { requireUser } from '../auth-middleware'
import { auth, db, FieldValue } from '../firebase'
import { env } from '../env'

export const authRouter = Router()

/**
 * Mirrors `users/{uid}.roles` into custom claims so security rules can check roles
 * without an extra document read. Also grants `verifiedStudent` when the account's
 * college email is verified. The client calls this after sign-in and after any
 * role change; it is idempotent.
 */
authRouter.post('/refresh-claims', requireUser, async (req, res) => {
  const uid = req.user!.uid
  const [record, snap] = await Promise.all([auth.getUser(uid), db.doc(`users/${uid}`).get()])
  const roles = (snap.data()?.roles ?? {}) as Record<string, boolean>

  const collegeVerified = Boolean(record.emailVerified && record.email?.toLowerCase().endsWith(`@${env.collegeDomain}`))
  const claims = {
    admin: roles.admin === true,
    tutor: roles.tutor === true,
    volunteer: roles.volunteer === true,
    verifiedStudent: roles.verifiedStudent === true || collegeVerified,
  }

  await auth.setCustomUserClaims(uid, claims)
  if (collegeVerified && roles.verifiedStudent !== true && snap.exists) {
    await snap.ref.update({ 'roles.verifiedStudent': true, updatedAt: FieldValue.serverTimestamp() })
  }
  res.json({ claims })
})
