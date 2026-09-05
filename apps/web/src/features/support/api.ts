import { Timestamp, arrayUnion, increment, limit, query, updateDoc, where } from 'firebase/firestore'
import type { SupportRequest, SupportRequestInput, User, Volunteer, VolunteerApplicationInput } from '@frisbee/shared'
import { toRef } from '@/features/connections/api'
import { notify } from '@/features/notifications/api'
import { add, cols, doc, now } from '@/lib/firestore'

// Volunteer applications --------------------------------------------------------

export async function applyAsVolunteer(me: User, input: VolunteerApplicationInput) {
  const { proofURLs, ...payload } = input
  const ref = await add(cols.applications, {
    kind: 'volunteer',
    applicant: toRef(me),
    payload,
    proofURLs,
    status: 'pending',
    reviewerId: null,
    note: '',
    createdAt: now(),
    decidedAt: null,
  })
  return ref.id
}

export const myVolunteerApplications = (uid: string) => query(cols.applications, where('applicant.uid', '==', uid), where('kind', '==', 'volunteer'), limit(5))

export const setVolunteerActive = (uid: string, active: boolean) => updateDoc(doc(cols.volunteers, uid), { active })

// Requests ----------------------------------------------------------------------

export async function createSupportRequest(me: User, input: SupportRequestInput) {
  const ref = await add(cols.supportRequests, {
    ...input,
    start: Timestamp.fromDate(input.start),
    end: Timestamp.fromDate(input.end),
    requester: toRef(me),
    status: 'open',
    candidateIds: [],
    volunteer: null,
    createdAt: now(),
  })
  return ref.id
}

export const cancelSupportRequest = (id: string) => updateDoc(doc(cols.supportRequests, id), { status: 'cancelled' })

/**
 * A volunteer takes an open request. First come, first served: the request flips to
 * "matched" with the volunteer attached; the requester confirms to lock it in.
 */
export async function volunteerFor(r: SupportRequest, v: Volunteer) {
  await updateDoc(doc(cols.supportRequests, r.id), { volunteer: { uid: v.uid, name: v.name, photo: v.photo }, status: 'matched', candidateIds: arrayUnion(v.uid) })
  await notify({ to: r.requester.uid, type: 'support', title: `${v.name} can help with ${r.course}`, body: 'Open the request to confirm.', link: '/support' })
}

export async function confirmVolunteer(r: SupportRequest) {
  if (!r.volunteer) return
  await updateDoc(doc(cols.supportRequests, r.id), { status: 'confirmed' })
  await notify({ to: r.volunteer.uid, type: 'support', title: `Confirmed: ${r.course}`, body: `${r.requester.name} confirmed you. Details are in Support → Volunteer.`, link: '/support?tab=volunteer' })
}

/** Requester turns down the offered volunteer; request goes back to open for others. */
export async function declineVolunteer(r: SupportRequest) {
  await updateDoc(doc(cols.supportRequests, r.id), { volunteer: null, status: 'open' })
  if (r.volunteer) await notify({ to: r.volunteer.uid, type: 'support', title: `${r.course}: not needed this time`, body: 'The requester chose someone else or no longer needs help.', link: '/support?tab=volunteer' })
}

/** Volunteer backs out before completion — request reopens and the requester is told. */
export async function withdrawVolunteer(r: SupportRequest) {
  await updateDoc(doc(cols.supportRequests, r.id), { volunteer: null, status: 'open' })
  await notify({ to: r.requester.uid, type: 'support', title: `${r.course}: volunteer withdrew`, body: 'Your request is open again and visible to other volunteers.', link: '/support' })
}

export async function completeSupport(r: SupportRequest) {
  await updateDoc(doc(cols.supportRequests, r.id), { status: 'completed' })
  if (r.volunteer) {
    await updateDoc(doc(cols.volunteers, r.volunteer.uid), { completedCount: increment(1) }).catch(() => undefined)
    await notify({ to: r.volunteer.uid, type: 'support', title: 'Thank you', body: `${r.requester.name} marked ${r.course} as done.`, link: '/support?tab=volunteer' })
  }
}
