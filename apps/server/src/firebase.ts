import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { env } from './env'

function init(): App {
  if (getApps().length) return getApps()[0]!
  if (env.serviceAccountB64) {
    const json = JSON.parse(Buffer.from(env.serviceAccountB64, 'base64').toString('utf8'))
    return initializeApp({ credential: cert(json), projectId: json.project_id ?? env.projectId })
  }
  if (env.usingEmulators && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Emulators accept unauthenticated admin access.
    return initializeApp({ projectId: env.projectId })
  }
  return initializeApp({ credential: applicationDefault(), projectId: env.projectId })
}

export const app = init()
export const auth = getAuth(app)
export const db = getFirestore(app)
export { FieldValue, Timestamp }
