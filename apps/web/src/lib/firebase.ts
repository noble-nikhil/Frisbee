import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { env } from './env'

export const app = initializeApp(env.firebase)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Persistent cache = instant re-open + offline reads + queued writes.
// In emulator mode both emulators are reached through the dev server on the page's own
// origin (see the proxy table in vite.config.ts), so the app also works from a phone or a
// tunnelled preview URL, where 127.0.0.1 would point at the wrong machine.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ...(env.useEmulators
    ? { host: window.location.host, ssl: window.location.protocol === 'https:', experimentalForceLongPolling: true }
    : {}),
})

if (env.useEmulators) {
  connectAuthEmulator(auth, window.location.origin, { disableWarnings: true })
}

// Analytics is optional and not supported everywhere (iOS standalone, blockers).
if (env.firebase.measurementId && import.meta.env.PROD) {
  import('firebase/analytics').then(async ({ getAnalytics, isSupported }) => {
    if (await isSupported()) getAnalytics(app)
  })
}
