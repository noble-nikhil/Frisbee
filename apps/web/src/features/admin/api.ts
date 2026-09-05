import { getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore'
import type { Application, Report, TutorPayload, User, VolunteerPayload } from '@frisbee/shared'
import { tokenize, tagLabel } from '@frisbee/shared'
import { notify } from '@/features/notifications/api'
import { cols, doc, now, set } from '@/lib/firestore'

/**
 * Admin decisions. Everything here is also enforced by firestore.rules (isAdmin()).
 * Role flags live on users/{uid}.roles; the server mirrors them into custom claims
 * on the user's next /api/auth/refresh-claims call, rules accept either.
 */

export async function approveApplication(app: Application, admin: User, note = '') {
  const user = doc(cols.users, app.applicant.uid)
  if (app.kind === 'tutor') {
    const p = app.payload as TutorPayload
    await set(doc(cols.tutors, app.applicant.uid), {
      name: app.applicant.name,
      photo: app.applicant.photo,
      bio: p.bio,
      skills: p.skills,
      hourlyRate: p.hourlyRate,
      ratingAvg: 0,
      ratingCount: 0,
      availability: p.availability,
      blackoutDates: [],
      active: true,
      verifiedStudent: true,
      searchTokens: tokenize(app.applicant.name, p.skills.map(tagLabel), p.bio),
    })
    await updateDoc(user, { 'roles.tutor': true, updatedAt: now() })
  } else {
    const p = app.payload as VolunteerPayload
    await set(doc(cols.volunteers, app.applicant.uid), {
      name: app.applicant.name,
      photo: app.applicant.photo,
      subjects: p.subjects,
      types: p.types,
      languages: p.languages,
      availability: p.availability,
      active: true,
      completedCount: 0,
    })
    await updateDoc(user, { 'roles.volunteer': true, updatedAt: now() })
  }
  await updateDoc(doc(cols.applications, app.id), { status: 'approved', reviewerId: admin.uid, note, decidedAt: now() })
  await notify({
    to: app.applicant.uid,
    type: 'admin',
    title: app.kind === 'tutor' ? 'You are a verified tutor' : 'You are a verified volunteer',
    body: note || (app.kind === 'tutor' ? 'Your tutor profile is live. Students can book you now.' : 'You will be matched with support requests that fit your subjects.'),
    link: app.kind === 'tutor' ? `/tutoring/${app.applicant.uid}` : '/support?tab=volunteer',
  })
}

export async function rejectApplication(app: Application, admin: User, note = '') {
  await updateDoc(doc(cols.applications, app.id), { status: 'rejected', reviewerId: admin.uid, note, decidedAt: now() })
  await notify({ to: app.applicant.uid, type: 'admin', title: `${app.kind === 'tutor' ? 'Tutor' : 'Volunteer'} application not approved`, body: note || 'You can apply again with more detail.', link: app.kind === 'tutor' ? '/tutoring/apply' : '/support?tab=volunteer' })
}

export async function resolveReport(r: Report, admin: User, action: 'dismiss' | 'warn' | 'suspend', note = '') {
  await updateDoc(doc(cols.reports, r.id), { status: action === 'dismiss' ? 'dismissed' : 'actioned', action: action === 'dismiss' ? null : `${action}${note ? `: ${note}` : ''}`, reviewerId: admin.uid })
  if (action === 'warn') {
    await notify({ to: r.target.ownerId, type: 'admin', title: 'A moderator warning', body: note || `Content you posted ("${r.target.label}") was reported and reviewed. Please keep it respectful.`, link: '/me/settings' })
  }
  if (action === 'suspend') await setSuspended(r.target.ownerId, true)
}

export const setSuspended = (uid: string, suspended: boolean) => updateDoc(doc(cols.users, uid), { suspended, updatedAt: now() })

export const setRole = (uid: string, role: 'admin' | 'verifiedStudent' | 'tutor' | 'volunteer', on: boolean) =>
  updateDoc(doc(cols.users, uid), { [`roles.${role}`]: on, updatedAt: now() })

/** Admin user lookup by email (exact) — avoids listing the whole users collection. */
export async function findUserByEmail(email: string) {
  const snap = await getDocs(query(cols.users, where('email', '==', email.trim().toLowerCase()), limit(1)))
  return snap.docs[0]?.data() ?? null
}

export const recentUsersQuery = () => query(cols.users, orderBy('createdAt', 'desc'), limit(25))
