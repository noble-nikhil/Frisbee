// Runs a command with the Firebase emulator env vars set, on any OS.
// `FOO=bar cmd` only works in bash; this works in PowerShell/cmd too, without cross-env.
//
//   node scripts/with-emulators.mjs tsx scripts/seed.ts
//   node scripts/with-emulators.mjs tsx watch src/index.ts
import { spawn } from 'node:child_process'

const parts = process.argv.slice(2)
if (parts.length === 0) {
  console.error('usage: node scripts/with-emulators.mjs <command> [args...]')
  process.exit(2)
}

const env = {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  ...process.env,
}

// One command string through the shell so `tsx` resolves to tsx.cmd on Windows.
const child = spawn(parts.join(' '), { stdio: 'inherit', env, shell: true })
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
