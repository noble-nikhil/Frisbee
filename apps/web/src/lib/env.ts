const required = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key]
  if (!value) throw new Error(`Missing env var ${key} — copy apps/web/.env.example to .env.local`)
  return value
}

export const env = {
  firebase: {
    apiKey: required('VITE_FIREBASE_API_KEY'),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: required('VITE_FIREBASE_PROJECT_ID'),
    messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: required('VITE_FIREBASE_APP_ID'),
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'frisbee_unsigned',
  },
  collegeDomain: import.meta.env.VITE_COLLEGE_DOMAIN ?? 'srmap.edu.in',
  useEmulators: import.meta.env.VITE_USE_EMULATORS === 'true',
}
