// `pnpm doctor` — checks the local setup and the third-party config the app depends on,
// and says exactly what to fix. Safe to run any time; it only reads env files and makes
// a few tiny HTTPS requests (one 1x1 PNG upload to Cloudinary when a cloud name is set).
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const results = []
const ok = (msg) => results.push(['ok', msg])
const warn = (msg, fix) => results.push(['warn', msg, fix])
const fail = (msg, fix) => results.push(['fail', msg, fix])

function readEnvFile(file) {
  const out = {}
  if (!existsSync(file)) return null
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

function version(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- toolchain
const [major, minor] = process.versions.node.split('.').map(Number)
if (major > 20 || (major === 20 && minor >= 19)) ok(`Node ${process.version}`)
else fail(`Node ${process.version} is too old`, 'Install Node 22 LTS from https://nodejs.org (or 24), then reopen the terminal.')
if (major >= 25) warn(`Node ${process.version} no longer bundles Corepack`, 'Run: npm install -g corepack@latest && corepack enable')

const pnpm = version('pnpm -v')
if (!pnpm) fail('pnpm not found', 'Run in an Administrator terminal: corepack enable   (or: npm install -g pnpm@10)')
else if (!pnpm.startsWith('10.')) warn(`pnpm ${pnpm} (repo pins 10.x)`, 'Run: corepack enable && corepack prepare pnpm@10.34.5 --activate')
else ok(`pnpm ${pnpm}`)

const java = version('java -version 2>&1')
const javaMajor = java ? Number((java.match(/version "(\d+)/) ?? [])[1]) : 0
if (!java) warn('Java not found (only needed for the Firestore emulator)', 'Install Temurin 21 JRE: https://adoptium.net/temurin/releases/?version=21')
else if (javaMajor < 21) warn(`Java ${javaMajor} found; the emulator needs 21+`, 'Install Temurin 21 and make sure it comes first on PATH.')
else ok(`Java ${javaMajor}`)

// ---------------------------------------------------------------- web env
const web = readEnvFile(path.join(root, 'apps/web/.env.local'))
if (!web) {
  fail('apps/web/.env.local is missing', 'Copy apps/web/.env.example to apps/web/.env.local and fill it in.')
} else {
  const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
  const missing = required.filter((k) => !web[k])
  if (missing.length) fail(`apps/web/.env.local is missing ${missing.join(', ')}`, 'Firebase console → Project settings → General → Your apps → SDK setup and configuration.')
  else ok('Firebase web config present')
  if (web.VITE_USE_EMULATORS === 'true') warn('VITE_USE_EMULATORS=true — the app talks to the local emulators', 'Fine for dev. Set false to use the live Firebase project; never true on Vercel.')
  else ok('VITE_USE_EMULATORS=false (live Firebase project)')
  if (web.VITE_API_URL && web.VITE_API_URL.endsWith('/')) warn('VITE_API_URL ends with a slash', 'Remove the trailing slash.')
}

// ---------------------------------------------------------------- server env
const server = readEnvFile(path.join(root, 'apps/server/.env'))
if (!server) warn('apps/server/.env is missing (only needed to run the API locally or to seed the live project)', 'Copy apps/server/.env.example to apps/server/.env.')
else {
  if (!server.FIREBASE_SERVICE_ACCOUNT && !server.GOOGLE_APPLICATION_CREDENTIALS) warn('No Firebase admin credential in apps/server/.env', 'Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON path (or FIREBASE_SERVICE_ACCOUNT to its base64).')
  else if (server.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(server.GOOGLE_APPLICATION_CREDENTIALS)) fail(`GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist: ${server.GOOGLE_APPLICATION_CREDENTIALS}`, 'Use the full path to the downloaded service-account JSON.')
  else if (server.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const j = JSON.parse(Buffer.from(server.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
      if (j.type === 'service_account') ok(`Service account (base64) for ${j.project_id}`)
      else fail('FIREBASE_SERVICE_ACCOUNT decodes but is not a service account', 'Re-run: pnpm --filter @frisbee/server encode-service-account <file.json>')
    } catch {
      fail('FIREBASE_SERVICE_ACCOUNT is not valid base64 JSON', 'Re-run: pnpm --filter @frisbee/server encode-service-account <file.json> and paste the whole single line.')
    }
  } else ok('Service account file configured')
  if (server.CLOUDINARY_CLOUD_NAME && web?.VITE_CLOUDINARY_CLOUD_NAME && server.CLOUDINARY_CLOUD_NAME !== web.VITE_CLOUDINARY_CLOUD_NAME) {
    fail('Cloudinary cloud name differs between apps/web/.env.local and apps/server/.env', 'They must be the same account.')
  }
}

// ---------------------------------------------------------------- live checks
const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function checkCloudinary(cloudName, preset) {
  if (!cloudName) {
    warn('VITE_CLOUDINARY_CLOUD_NAME is empty — photo uploads are disabled in the app', 'Cloudinary console → Settings → API keys → copy "Cloud name" (a short word, not the numeric API key).')
    return
  }
  if (/^\d+$/.test(cloudName)) {
    fail(`VITE_CLOUDINARY_CLOUD_NAME="${cloudName}" looks like the API key, not the cloud name`, 'The cloud name is the short word shown next to "Cloud name" in Settings → API keys.')
    return
  }
  const body = new FormData()
  body.append('file', pngDataUrl)
  body.append('upload_preset', preset)
  body.append('folder', 'frisbee/doctor')
  let res
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body })
  } catch (e) {
    warn(`Could not reach api.cloudinary.com (${e.message})`, 'Check your internet connection / proxy.')
    return
  }
  const json = await res.json().catch(() => ({}))
  const msg = (json.error?.message ?? '').toLowerCase()
  if (res.ok) ok(`Cloudinary: unsigned upload works (cloud "${cloudName}", preset "${preset}") → ${json.secure_url}`)
  else if (res.status === 401 || msg.includes('unknown api key')) fail(`Cloudinary cloud name "${cloudName}" does not exist`, 'Copy the exact Cloud name from Settings → API keys (case-sensitive).')
  else if (msg.includes('upload preset not found')) fail(`Cloudinary preset "${preset}" does not exist in cloud "${cloudName}"`, 'Settings → Upload → Upload presets → Add upload preset → name it exactly that → Signing mode: Unsigned → Save.')
  else if (msg.includes('whitelisted for unsigned')) fail(`Cloudinary preset "${preset}" exists but is Signed`, 'Edit the preset → Signing mode → Unsigned → Save.')
  else fail(`Cloudinary rejected the test upload: ${json.error?.message ?? res.status}`, 'Open the preset and check it allows png and a folder under frisbee/.')
}

async function checkFirebase(apiKey, projectId) {
  if (!apiKey || !projectId) return
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`)
    const json = await res.json()
    if (!res.ok) {
      fail(`Firebase rejected VITE_FIREBASE_API_KEY (${json.error?.message ?? res.status})`, 'Re-copy the web config from the Firebase console.')
      return
    }
    ok(`Firebase Auth reachable; authorized domains: ${json.authorizedDomains.join(', ')}`)
    const hasVercel = json.authorizedDomains.some((d) => d.endsWith('.vercel.app') || (!d.includes('firebase') && !d.includes('web.app') && d !== 'localhost'))
    if (!hasVercel) warn('No Vercel/custom domain in Firebase Authorized domains yet', 'Firebase console → Authentication → Settings → Authorized domains → Add domain → your-app.vercel.app (needed for Google sign-in and email links).')
  } catch (e) {
    warn(`Could not reach Firebase (${e.message})`, 'Check your internet connection.')
  }
}

await checkFirebase(web?.VITE_FIREBASE_API_KEY, web?.VITE_FIREBASE_PROJECT_ID)
await checkCloudinary(web?.VITE_CLOUDINARY_CLOUD_NAME, web?.VITE_CLOUDINARY_UPLOAD_PRESET || 'frisbee_unsigned')

// ---------------------------------------------------------------- report
const icon = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL' }
let failures = 0
for (const [level, msg, fix] of results) {
  if (level === 'fail') failures++
  console.log(`${icon[level]}  ${msg}`)
  if (fix) console.log(`      → ${fix}`)
}
console.log(failures ? `\n${failures} problem(s) to fix.` : '\nAll good.')
process.exit(failures ? 1 : 0)
