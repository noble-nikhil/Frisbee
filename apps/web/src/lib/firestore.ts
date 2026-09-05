import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  serverTimestamp,
  setDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
  type WithFieldValue,
} from 'firebase/firestore'
import type {
  Activity,
  Application,
  Booking,
  Comment,
  Community,
  CommunityRequest,
  Connection,
  ConnectionRequest,
  Event,
  Exchange,
  Group,
  Hangout,
  JoinRequest,
  Membership,
  Message,
  Notification,
  Poll,
  Post,
  Report,
  Review,
  Ride,
  Rsvp,
  Session,
  SupportRequest,
  Team,
  TeamApplication,
  Thread,
  Trip,
  TripItem,
  Tutor,
  TutorSlot,
  User,
  Volunteer,
} from '@frisbee/shared'
import { db } from './firebase'

/**
 * One generic converter: the document id is merged into the object on read
 * (as `id`, or `uid` for people-keyed docs) and stripped again on write.
 */
function converter<T extends DocumentData>(idKey: string): FirestoreDataConverter<T> {
  return {
    toFirestore(value: WithFieldValue<T> | PartialWithFieldValue<T>) {
      const { [idKey]: _id, ...rest } = value as Record<string, unknown>
      return rest
    },
    fromFirestore(snap: QueryDocumentSnapshot) {
      return { ...snap.data(), [idKey]: snap.id } as T
    },
  }
}

const col = <T extends DocumentData>(path: string, idKey = 'id') =>
  collection(db, path).withConverter(converter<T>(idKey)) as CollectionReference<T>

/** What you pass when creating a doc: everything except the id, Timestamps may be `serverTimestamp()`. */
export type Insert<T> = Omit<WithFieldValue<T>, 'id' | 'uid'>

export const add = <T extends DocumentData>(ref: CollectionReference<T>, data: Insert<T>) =>
  addDoc(ref, data as WithFieldValue<T>)

export const set = <T extends DocumentData>(ref: DocumentReference<T>, data: Insert<T>) =>
  setDoc(ref, data as WithFieldValue<T>)

// Top-level collections ------------------------------------------------------
export const cols = {
  users: col<User>('users', 'uid'),
  connectionRequests: col<ConnectionRequest>('connectionRequests'),
  connections: col<Connection>('connections'),
  threads: col<Thread>('threads'),
  groups: col<Group>('groups'),
  communities: col<Community>('communities'),
  communityRequests: col<CommunityRequest>('communityRequests'),
  exchanges: col<Exchange>('exchanges'),
  sessions: col<Session>('sessions'),
  activities: col<Activity>('activities'),
  hangouts: col<Hangout>('hangouts'),
  events: col<Event>('events'),
  rides: col<Ride>('rides'),
  trips: col<Trip>('trips'),
  teams: col<Team>('teams'),
  applications: col<Application>('applications'),
  tutors: col<Tutor>('tutors', 'uid'),
  bookings: col<Booking>('bookings'),
  volunteers: col<Volunteer>('volunteers', 'uid'),
  supportRequests: col<SupportRequest>('supportRequests'),
  reports: col<Report>('reports'),
}

export type Social = 'groups' | 'communities'

// Sub-collections (path strings keep the generics simple) --------------------
export const subs = {
  notifications: (uid: string) => col<Notification>(`users/${uid}/notifications`),
  blocks: (uid: string) => col<{ uid: string; createdAt: unknown }>(`users/${uid}/blocks`, 'uid'),
  messages: (threadId: string) => col<Message>(`threads/${threadId}/messages`),
  members: (kind: Social | 'hangouts' | 'teams', id: string) => col<Membership>(`${kind}/${id}/members`, 'uid'),
  joinRequests: (kind: Social | 'hangouts' | 'rides', id: string) => col<JoinRequest>(`${kind}/${id}/requests`, 'uid'),
  posts: (kind: Social, id: string) => col<Post>(`${kind}/${id}/posts`),
  comments: (kind: Social, id: string, postId: string) => col<Comment>(`${kind}/${id}/posts/${postId}/comments`),
  reactions: (kind: Social, id: string, postId: string) =>
    col<{ uid: string; kind: string }>(`${kind}/${id}/posts/${postId}/reactions`, 'uid'),
  polls: (communityId: string) => col<Poll>(`communities/${communityId}/polls`),
  votes: (communityId: string, pollId: string) =>
    col<{ uid: string; optionIds: string[] }>(`communities/${communityId}/polls/${pollId}/votes`, 'uid'),
  rsvps: (kind: 'activities' | 'events', id: string) => col<Rsvp>(`${kind}/${id}/rsvps`, 'uid'),
  eventUpdates: (id: string) => col<Comment>(`events/${id}/updates`),
  tripItems: (tripId: string) => col<TripItem>(`trips/${tripId}/items`),
  teamApplications: (teamId: string) => col<TeamApplication>(`teams/${teamId}/applications`, 'uid'),
  tutorSlots: (uid: string) => col<TutorSlot>(`tutors/${uid}/slots`),
  reviews: (uid: string) => col<Review>(`tutors/${uid}/reviews`),
}

export const groupOf = <T extends DocumentData>(name: string, idKey = 'id') =>
  collectionGroup(db, name).withConverter(converter<T>(idKey))

export const now = () => serverTimestamp()
export { doc }
