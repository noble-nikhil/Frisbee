import type { NextFunction, Request, Response } from 'express'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { auth } from './firebase'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express types are namespace-based
  namespace Express {
    interface Request {
      user?: DecodedIdToken
    }
  }
}

/** Verifies the Firebase ID token from `Authorization: Bearer <token>`. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })
  try {
    req.user = await auth.verifyIdToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.admin === true) return next()
  res.status(403).json({ error: 'Admin only' })
}
