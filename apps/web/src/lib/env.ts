const read = (key: keyof ImportMetaEnv) => (import.meta.env[key] ?? '').trim()

// Without these the Firebase SDK throws on import, so main.tsx checks `missing` first
// and shows a readable page instead of a blank one.
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export const env = {
  missing: REQUIRED.filter((key) => !read(key)) as string[],
  firebase: {
    apiKey: read('VITE_FIREBASE_API_KEY'),
    authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: read('VITE_FIREBASE_PROJECT_ID'),
    messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID') || undefined,
    appId: read('VITE_FIREBASE_APP_ID'),
    measurementId: read('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
  },
  cloudinary: {
    cloudName: read('VITE_CLOUDINARY_CLOUD_NAME'),
    uploadPreset: read('VITE_CLOUDINARY_UPLOAD_PRESET') || 'frisbee_unsigned',
  },
  // Absolute origin of the Node service (Render) — empty means same origin, which is what the
  // Vite dev server proxies. Trailing slash stripped so `${apiUrl}/api/...` is always right.
  apiUrl: read('VITE_API_URL').replace(/\/+$/, ''),
  collegeDomain: read('VITE_COLLEGE_DOMAIN') || 'srmap.edu.in',
  useEmulators: read('VITE_USE_EMULATORS') === 'true',
}

export const apiUrl = (path: string) => `${env.apiUrl}${path}`
