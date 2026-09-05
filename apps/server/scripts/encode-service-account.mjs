// Turns a Firebase service-account JSON into the single-line base64 string that
// FIREBASE_SERVICE_ACCOUNT expects (Render, or apps/server/.env). Cross-platform —
// Windows has no `base64 -w0`.
//
//   pnpm --filter @frisbee/server encode-service-account C:\Users\me\Downloads\frisbee-9fcfb-xxxx.json
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: pnpm --filter @frisbee/server encode-service-account <path-to-service-account.json>')
  process.exit(2)
}

const raw = readFileSync(file, 'utf8')
const json = JSON.parse(raw)
if (json.type !== 'service_account' || !json.private_key || !json.client_email) {
  console.error('That file is not a Firebase service-account key (expected type=service_account, private_key, client_email).')
  process.exit(1)
}

const encoded = Buffer.from(raw, 'utf8').toString('base64')
console.log(`# project: ${json.project_id}   account: ${json.client_email}`)
console.log('# Copy the line below (it is one long line) into FIREBASE_SERVICE_ACCOUNT:')
console.log(encoded)
