import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { env } from '@/lib/env'

const root = createRoot(document.getElementById('root')!)

// A missing Firebase env var used to throw inside the SDK and leave a blank page — the most
// common "it works locally but not on Vercel" failure. Say what's missing instead.
if (env.missing.length) {
  root.render(
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-body">
      <h1 className="text-h1">frisbee is not configured</h1>
      <p className="text-ink-2">
        These environment variables are empty in this build:
      </p>
      <ul className="list-disc pl-5 font-mono text-small">
        {env.missing.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
      <p className="text-small text-ink-3">
        Local: copy <code>apps/web/.env.example</code> to <code>apps/web/.env.local</code> and fill it in.
        Vercel: Project → Settings → Environment Variables, then redeploy.
      </p>
    </main>,
  )
} else {
  // Everything below imports the Firebase SDK, which needs the config above to exist.
  void import('./app').then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
}
