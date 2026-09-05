import { readFileSync } from 'node:fs'

// Tiny .env loader so we don't pull in dotenv just for local dev. Real deployments set env vars.
// Splits on \r?\n and trims: a file saved on Windows (CRLF) must not leave "\r" on every value.
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    const value = m[2]!.trim().replace(/^["']|["']$/g, '')
    if (process.env[m[1]!] === undefined) process.env[m[1]!] = value
  }
} catch {
  // no .env file — fine
}

const list = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export const env = {
  port: Number(process.env.PORT ?? 8787),
  allowedOrigins: list(process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173'),
  collegeDomain: process.env.COLLEGE_DOMAIN ?? 'srmap.edu.in',
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'frisbee-9fcfb',
  serviceAccountB64: process.env.FIREBASE_SERVICE_ACCOUNT,
  cronKey: process.env.CRON_KEY ?? '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  usingEmulators: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
}
