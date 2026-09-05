import cors from 'cors'
import express from 'express'
import { env } from './env'
import { authRouter } from './routes/auth'
import { mediaRouter } from './routes/media'
import { adminRouter } from './routes/admin'
import { sendReminders } from './jobs/reminders'

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '100kb' }))
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin (proxied) and server-to-server calls have no Origin header.
      if (!origin || env.allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`Origin ${origin} not allowed`))
    },
    credentials: true,
  }),
)

app.get('/api/health', (_req, res) => res.json({ ok: true, emulators: env.usingEmulators, time: new Date().toISOString() }))
app.use('/api/auth', authRouter)
app.use('/api/media', mediaRouter)
app.use('/api/admin', adminRouter)

// External cron pings this (e.g. every 15 min). Protected by a shared key.
app.post('/api/cron/reminders', async (req, res) => {
  if (!env.cronKey || req.query.key !== env.cronKey) return res.status(403).json({ error: 'Bad key' })
  res.json({ sent: await sendReminders() })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

app.listen(env.port, '0.0.0.0', () => {
  console.log(`frisbee api on :${env.port}${env.usingEmulators ? ' (emulators)' : ''}`)
})
