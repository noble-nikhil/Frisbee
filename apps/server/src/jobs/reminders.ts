import { db, FieldValue, Timestamp } from '../firebase'

type Window = { key: 'h24' | 'h2'; hours: number; label: string }
const WINDOWS: Window[] = [
  { key: 'h24', hours: 24, label: 'tomorrow' },
  { key: 'h2', hours: 2, label: 'in 2 hours' },
]

const notify = (uid: string, n: { type: string; title: string; body: string; link: string }) =>
  db.collection(`users/${uid}/notifications`).add({ ...n, read: false, createdAt: FieldValue.serverTimestamp() })

/**
 * Reminder sweep for tutoring sessions and support requests. Idempotent: each window
 * is marked on the document once sent. Meant to run every 15–30 minutes from an
 * external cron (Render free tier has no scheduler; cron-job.org hitting /api/cron works).
 */
export async function sendReminders(now = new Date()) {
  let sent = 0
  for (const w of WINDOWS) {
    const from = Timestamp.fromDate(now)
    const to = Timestamp.fromDate(new Date(now.getTime() + w.hours * 3600_000))

    const bookings = await db.collection('bookings').where('status', '==', 'confirmed').where('start', '>=', from).where('start', '<=', to).get()
    for (const snap of bookings.docs) {
      const b = snap.data()
      if (b.remindersSent?.[w.key]) continue
      const when = (b.start as Timestamp).toDate()
      const body = `${when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: '2-digit' })} · ${b.skill}`
      await Promise.all([
        notify(b.studentId, { type: 'tutoring', title: `Session with ${b.tutor.name} ${w.label}`, body, link: '/tutoring/bookings' }),
        notify(b.tutorId, { type: 'tutoring', title: `Session with ${b.student.name} ${w.label}`, body, link: '/tutoring/bookings' }),
        snap.ref.update({ [`remindersSent.${w.key}`]: true }),
      ])
      sent += 2
    }

    const support = await db.collection('supportRequests').where('status', '==', 'confirmed').where('start', '>=', from).where('start', '<=', to).get()
    for (const snap of support.docs) {
      const r = snap.data()
      if (r.remindersSent?.[w.key] || !r.volunteer) continue
      const body = `${r.course} · ${r.venue}`
      await Promise.all([
        notify(r.requester.uid, { type: 'support', title: `${r.volunteer.name} is helping you ${w.label}`, body, link: '/support' }),
        notify(r.volunteer.uid, { type: 'support', title: `You are helping ${r.requester.name} ${w.label}`, body, link: '/support?tab=volunteer' }),
        snap.ref.update({ [`remindersSent.${w.key}`]: true }),
      ])
      sent += 2
    }
  }
  return sent
}
