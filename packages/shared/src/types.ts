import type {
  Day,
  Department,
  ErrandCity,
  EventCategory,
  GroupCategory,
  HangoutType,
  ReportReason,
  Slot,
  SupportType,
  Vehicle,
  Year,
} from './constants'

/**
 * Firestore document shapes as they are READ back from the database.
 * Both the web SDK and firebase-admin produce Timestamps that satisfy this
 * structural type, so the shared package doesn't depend on either SDK.
 */
export interface Timestamp {
  seconds: number
  nanoseconds: number
  toDate(): Date
  toMillis(): number
}

export type Availability = Partial<Record<Day, Slot[]>>

export interface Roles {
  verifiedStudent: boolean
  tutor: boolean
  volunteer: boolean
  admin: boolean
}

export type ProfileVisibility = 'everyone' | 'connections' | 'hidden'
export type MessagePolicy = 'everyone' | 'connections'
export type RequestPolicy = 'everyone' | 'nobody'

export interface Privacy {
  profile: ProfileVisibility
  messages: MessagePolicy
  requests: RequestPolicy
  showAvailability: boolean
}

export interface SkillEntry {
  tag: string
  level: 1 | 2 | 3
}

export interface User {
  uid: string
  displayName: string
  photoURL: string | null
  email: string
  emailDomain: string
  department: Department | null
  year: Year | null
  bio: string
  roles: Roles
  skills: SkillEntry[]
  canTeach: string[]
  wantsToLearn: string[]
  interests: string[]
  hobbies: string[]
  careerGoals: string[]
  availability: Availability
  privacy: Privacy
  phone?: string
  profileComplete: boolean
  onboardingStep: 0 | 1 | 2 | 3
  suspended: boolean
  stats: { connections: number; groups: number }
  searchTokens: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** The subset of a user that gets denormalised onto posts, messages, members etc. */
export interface UserRef {
  uid: string
  name: string
  photo: string | null
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'message'
  | 'group'
  | 'event'
  | 'hangout'
  | 'ride'
  | 'errand'
  | 'team'
  | 'exchange'
  | 'tutoring'
  | 'support'
  | 'community'
  | 'admin'
  | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string
  read: boolean
  createdAt: Timestamp
}

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

export interface ConnectionRequest {
  id: string
  from: string
  to: string
  fromRef: UserRef
  toRef: UserRef
  message: string
  status: ConnectionRequestStatus
  createdAt: Timestamp
  respondedAt: Timestamp | null
}

export interface Connection {
  id: string // `${a}_${b}` with a < b
  uids: [string, string]
  requestId: string
  since: Timestamp
}

export type ThreadKind = 'dm' | 'group' | 'context'

export interface Thread {
  id: string
  kind: ThreadKind
  members: string[]
  memberInfo: Record<string, { name: string; photo: string | null }>
  title?: string
  contextRef?: { collection: string; id: string; title: string }
  lastMessage: { text: string; senderId: string; at: Timestamp } | null
  unread: Record<string, number>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type MessageType = 'text' | 'image' | 'system'

export interface Message {
  id: string
  senderId: string
  type: MessageType
  text: string
  imageURL?: string
  createdAt: Timestamp
}

export type MemberRole = 'owner' | 'mod' | 'member'

export interface Membership {
  uid: string
  role: MemberRole
  name: string
  photo: string | null
  joinedAt: Timestamp
}

export interface Group {
  id: string
  name: string
  category: GroupCategory
  description: string
  coverURL: string | null
  visibility: 'public' | 'request'
  ownerId: string
  mods: string[]
  memberIds: string[]
  memberCount: number
  threadId: string
  searchTokens: string[]
  createdAt: Timestamp
}

export type ReactionKind = 'like' | 'heart' | 'fire'

export interface Post {
  id: string
  author: UserRef
  text: string
  imageURL: string | null
  reactions: Record<ReactionKind, number>
  commentCount: number
  pinned: boolean
  channelId?: string
  createdAt: Timestamp
}

export interface Comment {
  id: string
  author: UserRef
  text: string
  createdAt: Timestamp
}

export interface Community extends Group {
  rules: string
  channels: { id: string; name: string }[]
}

export interface Poll {
  id: string
  question: string
  options: { id: string; text: string; count: number }[]
  multi: boolean
  anonymous: boolean
  closesAt: Timestamp | null
  totalVotes: number
  createdBy: string
  createdAt: Timestamp
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface CommunityRequest {
  id: string
  name: string
  purpose: string
  category: GroupCategory
  rules: string
  requester: UserRef
  status: ReviewStatus
  reviewerId: string | null
  note: string
  createdAt: Timestamp
  decidedAt: Timestamp | null
}

export type ExchangeStatus = 'proposed' | 'accepted' | 'scheduled' | 'completed' | 'cancelled'

export interface Exchange {
  id: string
  aId: string
  bId: string
  participants: [string, string]
  refs: Record<string, UserRef>
  aTeaches: string[]
  bTeaches: string[]
  message: string
  status: ExchangeStatus
  slot: { start: Timestamp; end: Timestamp; place: string } | null
  threadId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type SessionKind = 'exchange' | 'tutoring' | 'support'

export interface Session {
  id: string
  kind: SessionKind
  refId: string
  participants: string[]
  title: string
  start: Timestamp
  end: Timestamp
  place: string
  status: 'scheduled' | 'completed' | 'cancelled'
  remindersSent: { h24: boolean; h2: boolean }
}

export interface Activity {
  id: string
  title: string
  description: string
  start: Timestamp
  location: string
  tags: string[]
  capacity: number | null
  goingCount: number
  createdBy: UserRef
  searchTokens: string[]
  createdAt: Timestamp
}

export type HangoutStatus = 'open' | 'full' | 'closed' | 'cancelled'

export interface Hangout {
  id: string
  title: string
  type: HangoutType
  venue: string
  start: Timestamp
  limit: number
  memberCount: number
  visibility: 'public' | 'invite'
  joinMode: 'instant' | 'request'
  inviteCode: string | null
  status: HangoutStatus
  createdBy: UserRef
  threadId: string
  searchTokens: string[]
  createdAt: Timestamp
}

export interface Event {
  id: string
  category: EventCategory
  title: string
  description: string
  venue: string
  start: Timestamp
  end: Timestamp
  capacity: number
  goingCount: number
  waitlistCount: number
  organiser: { type: 'user' | 'group' | 'community'; id: string; name: string }
  coverURL: string | null
  createdBy: string
  searchTokens: string[]
  createdAt: Timestamp
}

export interface Rsvp {
  uid: string
  status: 'going' | 'waitlisted'
  position: number | null
  name: string
  photo: string | null
  createdAt: Timestamp
}

export type RideStatus = 'open' | 'full' | 'departed' | 'cancelled'

export interface Ride {
  id: string
  from: string
  to: string
  start: Timestamp
  vehicle: Vehicle
  seats: number
  seatsTaken: number
  note: string
  costNote: string
  status: RideStatus
  driver: UserRef
  passengerIds: string[]
  threadId: string
  searchTokens: string[]
  createdAt: Timestamp
}

export type JoinRequestStatus = 'pending' | 'approved' | 'declined'

export interface JoinRequest {
  uid: string
  name: string
  photo: string | null
  message: string
  status: JoinRequestStatus
  createdAt: Timestamp
}

export type TripStatus = 'open' | 'closed' | 'done'

export interface Trip {
  id: string
  city: ErrandCity
  date: Timestamp
  returnTime: string
  maxItems: number
  itemCount: number
  note: string
  traveller: UserRef
  requesterIds: string[]
  status: TripStatus
  searchTokens: string[]
  createdAt: Timestamp
}

export type ItemStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

export interface TripItem {
  id: string
  requester: UserRef
  item: string
  qty: number
  approxCost: string
  where: string
  note: string
  status: ItemStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TeamRole {
  id: string
  title: string
  skills: string[]
  count: number
  filled: number
}

export type TeamStatus = 'open' | 'filled' | 'closed'

export interface Team {
  id: string
  name: string
  description: string
  roles: TeamRole[]
  teamSize: number
  deadline: Timestamp
  links: string[]
  owner: UserRef
  memberIds: string[]
  status: TeamStatus
  threadId: string
  searchTokens: string[]
  createdAt: Timestamp
}

export interface TeamApplication {
  uid: string
  name: string
  photo: string | null
  roleId: string
  pitch: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Timestamp
}

export type ApplicationKind = 'tutor' | 'volunteer'

export interface TutorPayload {
  bio: string
  skills: string[]
  hourlyRate: number
  availability: { dow: Day; start: string; end: string }[]
}

export interface VolunteerPayload {
  subjects: string[]
  types: SupportType[]
  availability: Availability
  languages: string[]
  note: string
}

export interface Application {
  id: string
  kind: ApplicationKind
  applicant: UserRef
  payload: TutorPayload | VolunteerPayload
  proofURLs: string[]
  status: ReviewStatus
  reviewerId: string | null
  note: string
  createdAt: Timestamp
  decidedAt: Timestamp | null
}

export interface Tutor {
  uid: string
  name: string
  photo: string | null
  bio: string
  skills: string[]
  hourlyRate: number
  ratingAvg: number
  ratingCount: number
  availability: { dow: Day; start: string; end: string }[]
  blackoutDates: string[]
  active: boolean
  verifiedStudent: boolean
  searchTokens: string[]
}

export interface TutorSlot {
  id: string // YYYY-MM-DD_HHmm
  bookingId: string
  start: Timestamp
  end: Timestamp
}

export interface Review {
  id: string // bookingId
  student: UserRef
  rating: number
  text: string
  createdAt: Timestamp
}

export type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled'

export interface Booking {
  id: string
  tutorId: string
  tutor: UserRef
  studentId: string
  student: UserRef
  skill: string
  start: Timestamp
  end: Timestamp
  rate: number
  status: BookingStatus
  payment: { mode: 'mock'; paidAt: Timestamp | null }
  reviewed: boolean
  remindersSent: { h24: boolean; h2: boolean }
  createdAt: Timestamp
}

export interface Volunteer {
  uid: string
  name: string
  photo: string | null
  subjects: string[]
  types: SupportType[]
  languages: string[]
  availability: Availability
  active: boolean
  completedCount: number
}

export type SupportStatus = 'open' | 'matched' | 'confirmed' | 'completed' | 'cancelled'

export interface SupportRequest {
  id: string
  requester: UserRef
  type: SupportType
  course: string
  start: Timestamp
  end: Timestamp
  venue: string
  notes: string
  status: SupportStatus
  candidateIds: string[]
  volunteer: UserRef | null
  createdAt: Timestamp
}

export type ReportStatus = 'open' | 'dismissed' | 'actioned'

export interface Report {
  id: string
  reporterId: string
  target: { collection: string; id: string; ownerId: string; label: string }
  reason: ReportReason
  details: string
  status: ReportStatus
  action: string | null
  reviewerId: string | null
  createdAt: Timestamp
}

export interface MatchItem {
  uid: string
  score: number
  shared: SharedTags
}

export interface SharedTags {
  skills: string[]
  interests: string[]
  hobbies: string[]
  careerGoals: string[]
  sameDepartment: boolean
  sameYear: boolean
  availabilityOverlap: number
}
