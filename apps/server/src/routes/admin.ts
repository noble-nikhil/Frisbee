import { Router } from 'express'
import { requireAdmin, requireUser } from '../auth-middleware'
import { auth, db } from '../firebase'

export const adminRouter = Router()
adminRouter.use(requireUser, requireAdmin)

/** Force-refresh claims for another user after the admin panel changed their roles. */
adminRouter.post('/users/:uid/claims', async (req, res) => {
  const uid = req.params.uid
  const snap = await db.doc(`users/${uid}`).get()
  if (!snap.exists) return res.status(404).json({ error: 'No such user' })
  const roles = (snap.data()?.roles ?? {}) as Record<string, boolean>
  const claims = { admin: !!roles.admin, tutor: !!roles.tutor, volunteer: !!roles.volunteer, verifiedStudent: !!roles.verifiedStudent }
  await auth.setCustomUserClaims(uid, claims)
  res.json({ claims })
})

/** Suspending revokes refresh tokens so the session dies within an hour. */
adminRouter.post('/users/:uid/suspend', async (req, res) => {
  const uid = req.params.uid
  const suspended = req.body?.suspended !== false
  await Promise.all([
    db.doc(`users/${uid}`).update({ suspended }),
    auth.updateUser(uid, { disabled: suspended }),
    suspended ? auth.revokeRefreshTokens(uid) : Promise.resolve(),
  ])
  res.json({ uid, suspended })
})
