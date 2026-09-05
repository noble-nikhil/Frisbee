import { z } from 'zod'
import {
  DAYS,
  DEPARTMENTS,
  ERRAND_CITIES,
  EVENT_CATEGORIES,
  GROUP_CATEGORIES,
  HANGOUT_TYPES,
  LIMITS,
  REPORT_REASONS,
  SLOTS,
  SUPPORT_TYPES,
  VEHICLES,
  YEARS,
} from './constants'

// Small reusable pieces -------------------------------------------------------

const text = (max: number, min = 1) => z.string().trim().min(min, 'Required').max(max, `Max ${max} characters`)
const optionalText = (max: number) => z.string().trim().max(max, `Max ${max} characters`).default('')
const tagId = z.string().regex(/^[a-z0-9-]+$/, 'Invalid tag')
const tagList = (max: number = LIMITS.tagsPerType) => z.array(tagId).max(max, `Pick at most ${max}`)
const futureDate = z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, 'Must be in the future')
const timeHHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')

export const availabilitySchema = z.partialRecord(z.enum(DAYS), z.array(z.enum(SLOTS)))

export const privacySchema = z.object({
  profile: z.enum(['everyone', 'connections', 'hidden']),
  messages: z.enum(['everyone', 'connections']),
  requests: z.enum(['everyone', 'nobody']),
  showAvailability: z.boolean(),
})

// Auth ------------------------------------------------------------------------

export const signUpSchema = z.object({
  displayName: text(40, 2),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(72),
})

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
})

// Onboarding / profile --------------------------------------------------------

export const basicsSchema = z.object({
  displayName: text(40, 2),
  department: z.enum(DEPARTMENTS, { error: 'Pick your department' }),
  year: z.coerce.number<number>().pipe(z.union(YEARS.map((y) => z.literal(y)))),
  bio: optionalText(LIMITS.bio),
})

export const tagsSchema = z
  .object({
    skills: z
      .array(z.object({ tag: tagId, level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }))
      .min(1, 'Add at least one skill')
      .max(LIMITS.skills),
    canTeach: tagList(),
    wantsToLearn: tagList(),
    interests: tagList().min(1, 'Add at least one interest'),
    hobbies: tagList(),
    careerGoals: tagList(4),
  })
  .refine((v) => v.canTeach.every((t) => v.skills.some((s) => s.tag === t)), {
    message: 'You can only teach skills you listed',
    path: ['canTeach'],
  })

export const availabilityStepSchema = z.object({
  availability: availabilitySchema,
  privacy: privacySchema,
})

export const profileUpdateSchema = basicsSchema.partial().extend({
  photoURL: z.url().nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number')
    .or(z.literal(''))
    .optional(),
})

// Connections & messaging -----------------------------------------------------

export const connectionRequestSchema = z.object({
  to: z.string().min(1),
  message: optionalText(200),
})

export const messageSchema = z.object({
  text: text(LIMITS.message),
})

// Groups & communities --------------------------------------------------------

export const groupSchema = z.object({
  name: text(60, 3),
  category: z.enum(GROUP_CATEGORIES),
  description: text(LIMITS.description, 10),
  visibility: z.enum(['public', 'request']).default('public'),
})

export const postSchema = z.object({
  text: text(LIMITS.post),
  imageURL: z.url().nullable().default(null),
  channelId: z.string().optional(),
})

export const commentSchema = z.object({ text: text(LIMITS.comment) })

export const pollSchema = z.object({
  question: text(200, 5),
  options: z
    .array(text(60))
    .min(2, 'At least two options')
    .max(LIMITS.pollOptions)
    .refine((o) => new Set(o.map((s) => s.toLowerCase())).size === o.length, 'Options must be different'),
  multi: z.boolean().default(false),
  anonymous: z.boolean().default(false),
  closesAt: z.coerce.date().nullable().default(null),
})

export const communityRequestSchema = z.object({
  name: text(60, 3),
  purpose: text(600, 20),
  category: z.enum(GROUP_CATEGORIES),
  rules: optionalText(600),
})

// Skill exchange --------------------------------------------------------------

export const exchangeProposalSchema = z.object({
  bId: z.string().min(1),
  aTeaches: tagList(3).min(1, 'Pick what you will teach'),
  bTeaches: tagList(3).min(1, 'Pick what you want to learn'),
  message: optionalText(300),
})

export const scheduleSchema = z.object({
  start: futureDate,
  durationMin: z.coerce.number().int().min(30).max(180),
  place: text(80),
})

// Happening -------------------------------------------------------------------

export const activitySchema = z.object({
  title: text(LIMITS.title, 3),
  description: optionalText(LIMITS.description),
  start: futureDate,
  location: text(80),
  tags: z.array(z.string()).min(1, 'Pick at least one tag').max(4),
  capacity: z.coerce.number().int().min(2).max(500).nullable().default(null),
})

export const hangoutSchema = z.object({
  title: text(LIMITS.title, 3),
  type: z.enum(HANGOUT_TYPES),
  venue: text(80),
  start: futureDate,
  limit: z.coerce.number().int().min(2).max(LIMITS.hangoutMax),
  visibility: z.enum(['public', 'invite']).default('public'),
  joinMode: z.enum(['instant', 'request']).default('instant'),
})

export const eventSchema = z
  .object({
    category: z.enum(EVENT_CATEGORIES),
    title: text(LIMITS.title, 3),
    description: optionalText(LIMITS.description),
    venue: text(80),
    start: futureDate,
    end: z.coerce.date(),
    capacity: z.coerce.number().int().min(2).max(LIMITS.eventMax),
    coverURL: z.url().nullable().default(null),
  })
  .refine((v) => v.end > v.start, { message: 'End must be after start', path: ['end'] })

export const eventUpdateSchema = z.object({ text: text(500) })

// Rides -----------------------------------------------------------------------

export const rideSchema = z
  .object({
    from: text(60),
    to: text(60),
    start: futureDate,
    vehicle: z.enum(VEHICLES),
    seats: z.coerce.number().int().min(1).max(LIMITS.rideSeats),
    note: optionalText(300),
    costNote: optionalText(80),
  })
  .refine((v) => v.from.toLowerCase() !== v.to.toLowerCase(), {
    message: 'Pick two different places',
    path: ['to'],
  })

export const joinRequestSchema = z.object({ message: optionalText(200) })

// Errands ---------------------------------------------------------------------

export const tripSchema = z.object({
  city: z.enum(ERRAND_CITIES),
  date: futureDate,
  returnTime: timeHHmm,
  maxItems: z.coerce.number().int().min(1).max(LIMITS.errandItems),
  note: optionalText(300),
})

export const tripItemSchema = z.object({
  item: text(80),
  qty: z.coerce.number().int().min(1).max(20).default(1),
  approxCost: optionalText(30),
  where: optionalText(80),
  note: optionalText(200),
})

// Teams -----------------------------------------------------------------------

export const teamSchema = z.object({
  name: text(LIMITS.title, 3),
  description: text(LIMITS.description, 20),
  roles: z
    .array(
      z.object({
        title: text(40),
        skills: tagList(5),
        count: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1, 'Add at least one role')
    .max(6),
  deadline: futureDate,
  links: z.array(z.url()).max(3).default([]),
})

export const teamApplicationSchema = z.object({
  roleId: z.string().min(1, 'Pick a role'),
  pitch: text(LIMITS.pitch, 20),
})

// Tutoring & volunteering -----------------------------------------------------

export const tutorAvailabilitySchema = z
  .object({ dow: z.enum(DAYS), start: timeHHmm, end: timeHHmm })
  .refine((v) => v.start < v.end, { message: 'End must be after start', path: ['end'] })

export const tutorApplicationSchema = z.object({
  bio: text(400, 30),
  skills: tagList(6).min(1, 'Pick at least one subject'),
  hourlyRate: z.coerce.number().int().min(50).max(2000),
  availability: z.array(tutorAvailabilitySchema).min(1, 'Add at least one weekly window'),
  proofURLs: z.array(z.url()).max(3).default([]),
})

export const volunteerApplicationSchema = z.object({
  subjects: z.array(z.string().trim().min(1)).min(1, 'Add at least one subject').max(8),
  types: z.array(z.enum(SUPPORT_TYPES)).min(1, 'Pick at least one kind of help'),
  availability: availabilitySchema,
  languages: z.array(z.string()).max(5).default([]),
  note: optionalText(300),
  proofURLs: z.array(z.url()).max(3).default([]),
})

export const bookingSchema = z.object({
  tutorId: z.string().min(1),
  skill: tagId,
  slotId: z.string().regex(/^\d{4}-\d{2}-\d{2}_\d{4}$/),
})

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: optionalText(400),
})

export const supportRequestSchema = z
  .object({
    type: z.enum(SUPPORT_TYPES),
    course: text(80),
    start: futureDate,
    end: z.coerce.date(),
    venue: text(80),
    notes: optionalText(500),
  })
  .refine((v) => v.end > v.start, { message: 'End must be after start', path: ['end'] })

// Safety ----------------------------------------------------------------------

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: optionalText(500),
})

export const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: optionalText(300),
})

// Inferred input types (what forms produce) -----------------------------------

export type SignUpInput = z.infer<typeof signUpSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type BasicsInput = z.infer<typeof basicsSchema>
export type TagsInput = z.infer<typeof tagsSchema>
export type AvailabilityStepInput = z.infer<typeof availabilityStepSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type GroupInput = z.infer<typeof groupSchema>
export type PostInput = z.infer<typeof postSchema>
export type PollInput = z.infer<typeof pollSchema>
export type CommunityRequestInput = z.infer<typeof communityRequestSchema>
export type ExchangeProposalInput = z.infer<typeof exchangeProposalSchema>
export type ScheduleInput = z.infer<typeof scheduleSchema>
export type ActivityInput = z.infer<typeof activitySchema>
export type HangoutInput = z.infer<typeof hangoutSchema>
export type EventInput = z.infer<typeof eventSchema>
export type RideInput = z.infer<typeof rideSchema>
export type TripInput = z.infer<typeof tripSchema>
export type TripItemInput = z.infer<typeof tripItemSchema>
export type TeamInput = z.infer<typeof teamSchema>
export type TeamApplicationInput = z.infer<typeof teamApplicationSchema>
export type TutorApplicationInput = z.infer<typeof tutorApplicationSchema>
export type VolunteerApplicationInput = z.infer<typeof volunteerApplicationSchema>
export type BookingInput = z.infer<typeof bookingSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type SupportRequestInput = z.infer<typeof supportRequestSchema>
export type ReportInput = z.infer<typeof reportSchema>
export type DecisionInput = z.infer<typeof decisionSchema>
