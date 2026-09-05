import type { Availability, MatchItem, SharedTags, User } from './types'
import { DAYS } from './constants'

/**
 * Weighted tag-overlap matching. Pure and synchronous so the same function runs
 * in the browser (instant "top matches") and on the server (matchCache recompute).
 *
 * Weights are deliberately simple enough to explain on a slide.
 */
export const WEIGHTS = {
  skill: 3,
  interest: 2,
  careerGoal: 2,
  hobby: 1,
  department: 1,
  year: 0.5,
  availabilityMax: 1,
} as const

type Candidate = Pick<
  User,
  | 'uid'
  | 'skills'
  | 'interests'
  | 'hobbies'
  | 'careerGoals'
  | 'department'
  | 'year'
  | 'availability'
  | 'canTeach'
  | 'wantsToLearn'
>

const intersect = (a: string[], b: string[]) => {
  const set = new Set(b)
  return a.filter((x) => set.has(x))
}

const availabilityOverlap = (a: Availability, b: Availability) => {
  let overlap = 0
  for (const day of DAYS) {
    const bs = new Set(b[day] ?? [])
    for (const slot of a[day] ?? []) if (bs.has(slot)) overlap++
  }
  return overlap
}

export function sharedTags(me: Candidate, other: Candidate): SharedTags {
  return {
    skills: intersect(
      me.skills.map((s) => s.tag),
      other.skills.map((s) => s.tag),
    ),
    interests: intersect(me.interests, other.interests),
    hobbies: intersect(me.hobbies, other.hobbies),
    careerGoals: intersect(me.careerGoals, other.careerGoals),
    sameDepartment: !!me.department && me.department === other.department,
    sameYear: !!me.year && me.year === other.year,
    availabilityOverlap: availabilityOverlap(me.availability, other.availability),
  }
}

const slotCount = (a: Availability) => Object.values(a).reduce((n, slots) => n + (slots?.length ?? 0), 0)

// Sharing up to 5 free slots earns the full availability point; more than that adds nothing.
const availabilityPoints = (overlap: number, mySlots: number) =>
  mySlots === 0 ? 0 : Math.min(WEIGHTS.availabilityMax, overlap / Math.min(mySlots, 5))

const rawScore = (s: SharedTags, mySlots: number) =>
  s.skills.length * WEIGHTS.skill +
  s.interests.length * WEIGHTS.interest +
  s.careerGoals.length * WEIGHTS.careerGoal +
  s.hobbies.length * WEIGHTS.hobby +
  (s.sameDepartment ? WEIGHTS.department : 0) +
  (s.sameYear ? WEIGHTS.year : 0) +
  availabilityPoints(s.availabilityOverlap, mySlots)

/**
 * The best possible score for `me` is when the other person shares every tag I
 * have; we normalise against that so a person with 3 tags can still hit 100.
 */
const maxScore = (me: Candidate) =>
  me.skills.length * WEIGHTS.skill +
  me.interests.length * WEIGHTS.interest +
  me.careerGoals.length * WEIGHTS.careerGoal +
  me.hobbies.length * WEIGHTS.hobby +
  (me.department ? WEIGHTS.department : 0) +
  (me.year ? WEIGHTS.year : 0) +
  (slotCount(me.availability) ? WEIGHTS.availabilityMax : 0)

export function scoreMatch(me: Candidate, other: Candidate): MatchItem {
  const shared = sharedTags(me, other)
  const max = maxScore(me)
  const score = max === 0 ? 0 : Math.round((rawScore(shared, slotCount(me.availability)) / max) * 100)
  return { uid: other.uid, score: Math.min(100, score), shared }
}

export function rankMatches(me: Candidate, others: Candidate[], limit = 20): MatchItem[] {
  return others
    .filter((o) => o.uid !== me.uid)
    .map((o) => scoreMatch(me, o))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Human explanation, grouped by type. Order = weight order so the strongest reason is first. */
export function explainMatch(shared: SharedTags): { label: string; tags: string[] }[] {
  const groups = [
    { label: 'Skills', tags: shared.skills },
    { label: 'Interests', tags: shared.interests },
    { label: 'Goals', tags: shared.careerGoals },
    { label: 'Hobbies', tags: shared.hobbies },
  ].filter((g) => g.tags.length > 0)
  const context: string[] = []
  if (shared.sameDepartment) context.push('Same department')
  if (shared.sameYear) context.push('Same year')
  if (shared.availabilityOverlap >= 3) context.push('Free at the same times')
  if (context.length) groups.push({ label: 'Also', tags: context })
  return groups
}

/** Reciprocal skill swap: I teach something they want AND they teach something I want. */
export function skillSwap(me: Candidate, other: Candidate) {
  const iTeach = intersect(me.canTeach, other.wantsToLearn)
  const theyTeach = intersect(other.canTeach, me.wantsToLearn)
  return iTeach.length && theyTeach.length ? { iTeach, theyTeach } : null
}
