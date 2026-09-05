export const COLLEGE_DOMAIN = 'srmap.edu.in'

export const DEPARTMENTS = [
  'Computer Science',
  'Electronics & Communication',
  'Electrical',
  'Mechanical',
  'Civil',
  'Biotechnology',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Economics',
  'Liberal Arts',
  'Management',
  'Law',
] as const

export const YEARS = [1, 2, 3, 4, 5] as const

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const DAY_LABELS: Record<Day, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}
export const SLOTS = ['morning', 'afternoon', 'evening'] as const
export const SLOT_LABELS: Record<Slot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

export const GROUP_CATEGORIES = [
  'Tech',
  'Arts & music',
  'Sports & fitness',
  'Gaming',
  'Books & film',
  'Entrepreneurship',
  'Culture & languages',
  'Social causes',
  'Academics',
  'Other',
] as const

export const EVENT_CATEGORIES = ['movie', 'karaoke', 'jamming', 'sports', 'talk', 'other'] as const
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  movie: 'Movie night',
  karaoke: 'Karaoke',
  jamming: 'Jamming',
  sports: 'Sports',
  talk: 'Talk',
  other: 'Other',
}

export const HANGOUT_TYPES = [
  'Coffee',
  'Food',
  'Study',
  'Walk',
  'Sports',
  'Gaming',
  'Movie',
  'Music',
  'Other',
] as const

export const ACTIVITY_TAGS = [
  'study',
  'sports',
  'music',
  'food',
  'outdoors',
  'gaming',
  'arts',
  'volunteering',
  'tech',
  'social',
] as const

export const VEHICLES = ['car', 'auto', 'bike', 'cab'] as const
export const VEHICLE_LABELS: Record<Vehicle, string> = {
  car: 'Car',
  auto: 'Auto',
  bike: 'Bike',
  cab: 'Shared cab',
}

export const RIDE_PLACES = [
  'SRM AP campus gate',
  'Vijayawada junction',
  'Vijayawada bus stand',
  'Vijayawada airport',
  'Mangalagiri',
  'Guntur',
  'Amaravati',
  'Tenali',
  'PVP mall',
] as const

export const ERRAND_CITIES = ['Vijayawada', 'Mangalagiri', 'Guntur'] as const

export const SUPPORT_TYPES = ['scribe', 'note_taking', 'mobility', 'reading', 'other'] as const
export const SUPPORT_TYPE_LABELS: Record<SupportType, string> = {
  scribe: 'Exam scribe',
  note_taking: 'Note-taking',
  mobility: 'Mobility assistance',
  reading: 'Reading assistance',
  other: 'Other',
}

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'scam',
  'other',
] as const

export const LIMITS = {
  bio: 300,
  title: 80,
  description: 1000,
  message: 2000,
  post: 2000,
  comment: 500,
  pitch: 600,
  tagsPerType: 12,
  skills: 12,
  hangoutMax: 30,
  eventMax: 2000,
  rideSeats: 6,
  errandItems: 10,
  pollOptions: 6,
  searchTokens: 10,
  avatarBytes: 1_000_000,
  imageBytes: 3_000_000,
  proofBytes: 5_000_000,
} as const

export const DEMO_ACCOUNTS = [
  { email: 'judge1@srmap.edu.in', label: 'Verified student' },
  { email: 'meera.tutor@srmap.edu.in', label: 'Verified tutor' },
  { email: 'admin@srmap.edu.in', label: 'Platform admin' },
  { email: 'guest@gmail.com', label: 'Unverified guest' },
] as const
export const DEMO_PASSWORD = 'frisbee-demo'

// type helpers derived from the tuples above
export type Department = (typeof DEPARTMENTS)[number]
export type Year = (typeof YEARS)[number]
export type Day = (typeof DAYS)[number]
export type Slot = (typeof SLOTS)[number]
export type GroupCategory = (typeof GROUP_CATEGORIES)[number]
export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type HangoutType = (typeof HANGOUT_TYPES)[number]
export type ActivityTag = (typeof ACTIVITY_TAGS)[number]
export type Vehicle = (typeof VEHICLES)[number]
export type ErrandCity = (typeof ERRAND_CITIES)[number]
export type SupportType = (typeof SUPPORT_TYPES)[number]
export type ReportReason = (typeof REPORT_REASONS)[number]
