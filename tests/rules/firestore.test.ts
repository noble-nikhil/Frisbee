/**
 * Security-rules tests. Run with the emulator:
 *   pnpm test:rules   (wraps `firebase emulators:exec`)
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, collection, addDoc, runTransaction, arrayUnion, deleteDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

const PROJECT = 'frisbee-rules-test'
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8081').split(':')

const baseUser = (uid: string, over: Record<string, unknown> = {}) => ({
  displayName: `User ${uid}`,
  photoURL: null,
  email: `${uid}@srmap.edu.in`,
  emailDomain: 'srmap.edu.in',
  department: null,
  year: null,
  bio: '',
  roles: { verifiedStudent: false, tutor: false, volunteer: false, admin: false },
  skills: [],
  canTeach: [],
  wantsToLearn: [],
  interests: [],
  hobbies: [],
  careerGoals: [],
  availability: {},
  privacy: { profile: 'everyone', messages: 'everyone', requests: 'everyone', showAvailability: true },
  profileComplete: false,
  onboardingStep: 0,
  suspended: false,
  stats: { connections: 0, groups: 0 },
  searchTokens: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
})

const as = (uid: string, token: Record<string, unknown> = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@srmap.edu.in`, email_verified: true, ...token }).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: HOST!, port: Number(PORT), rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice'), baseUser('alice', { profileComplete: true }))
    await setDoc(doc(db, 'users/bob'), baseUser('bob', { profileComplete: true }))
    await setDoc(doc(db, 'users/carol'), baseUser('carol', { privacy: { profile: 'connections', messages: 'connections', requests: 'nobody', showAvailability: false } }))
    await setDoc(doc(db, 'users/admin'), baseUser('admin', { roles: { verifiedStudent: true, tutor: false, volunteer: false, admin: true } }))
  })
})

describe('users', () => {
  it('lets a user create their own doc with default roles, not admin', async () => {
    await assertSucceeds(setDoc(doc(as('dave'), 'users/dave'), baseUser('dave')))
    await assertFails(setDoc(doc(as('eve'), 'users/eve'), baseUser('eve', { roles: { verifiedStudent: false, tutor: false, volunteer: false, admin: true } })))
  })
  it('blocks writing someone else’s profile', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { bio: 'hacked' }))
  })
  it('lets a verified college email self-flag verifiedStudent but not tutor', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { 'roles.verifiedStudent': true }))
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { 'roles.tutor': true }))
    const gmail = env.authenticatedContext('bob', { email: 'bob@gmail.com', email_verified: true }).firestore()
    await assertFails(updateDoc(doc(gmail, 'users/bob'), { 'roles.verifiedStudent': true }))
  })
  it('hides connections-only profiles from strangers', async () => {
    await assertFails(getDoc(doc(as('alice'), 'users/carol')))
    await assertSucceeds(getDoc(doc(as('alice'), 'users/bob')))
    await assertSucceeds(getDoc(doc(as('admin', { admin: true }), 'users/carol')))
  })
  it('lets admins change roles', async () => {
    await assertSucceeds(updateDoc(doc(as('admin', { admin: true }), 'users/alice'), { 'roles.tutor': true, updatedAt: serverTimestamp() }))
  })
})

describe('notifications', () => {
  it('anyone can create one for someone else, only the owner can read', async () => {
    const payload = { type: 'system', title: 'hi', body: 'x', link: '/home', read: false, createdAt: serverTimestamp() }
    await assertSucceeds(addDoc(collection(as('alice'), 'users/bob/notifications'), payload))
    await assertFails(addDoc(collection(as('alice'), 'users/bob/notifications'), { ...payload, read: true }))
    await assertFails(getDoc(doc(as('alice'), 'users/bob/notifications/x')))
  })
})

describe('connections', () => {
  const request = () =>
    addDoc(collection(as('alice'), 'connectionRequests'), {
      from: 'alice',
      to: 'bob',
      fromRef: { uid: 'alice', name: 'Alice', photo: null },
      toRef: { uid: 'bob', name: 'Bob', photo: null },
      message: '',
      status: 'pending',
      createdAt: serverTimestamp(),
      respondedAt: null,
    })

  it('respects requests=nobody', async () => {
    await assertFails(
      addDoc(collection(as('alice'), 'connectionRequests'), {
        from: 'alice', to: 'carol', fromRef: { uid: 'alice', name: 'Alice', photo: null }, toRef: { uid: 'carol', name: 'C', photo: null },
        message: '', status: 'pending', createdAt: serverTimestamp(), respondedAt: null,
      }),
    )
  })

  it('recipient accepts inside a transaction that creates the connection', async () => {
    const ref = await request()
    const bob = as('bob')
    await assertSucceeds(
      runTransaction(bob, async (tx) => {
        tx.update(doc(bob, 'connectionRequests', ref.id), { status: 'accepted', respondedAt: serverTimestamp() })
        tx.set(doc(bob, 'connections/alice_bob'), { uids: ['alice', 'bob'], requestId: ref.id, since: serverTimestamp() })
      }),
    )
    // sender cannot accept their own request
    const ref2 = await addDoc(collection(as('alice'), 'connectionRequests'), {
      from: 'alice', to: 'bob', fromRef: { uid: 'alice', name: 'Alice', photo: null }, toRef: { uid: 'bob', name: 'Bob', photo: null },
      message: '', status: 'pending', createdAt: serverTimestamp(), respondedAt: null,
    })
    await assertFails(updateDoc(doc(as('alice'), 'connectionRequests', ref2.id), { status: 'accepted', respondedAt: serverTimestamp() }))
  })

  it('cannot forge a connection without an accepted request', async () => {
    await assertFails(setDoc(doc(as('alice'), 'connections/alice_bob'), { uids: ['alice', 'bob'], requestId: 'nope', since: serverTimestamp() }))
  })
})

describe('threads & messages', () => {
  const dm = (db: ReturnType<typeof as>, a: string, b: string) =>
    setDoc(doc(db, 'threads', a < b ? `${a}_${b}` : `${b}_${a}`), {
      kind: 'dm', members: [a, b], memberInfo: { [a]: { name: a, photo: null }, [b]: { name: b, photo: null } },
      lastMessage: null, unread: { [a]: 0, [b]: 0 }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })

  it('probing a not-yet-existing DM is allowed (openDm reads before it creates)', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'threads/alice_bob')))
  })
  it('DM requires messages=everyone or a connection; blocked users cannot open one', async () => {
    await assertSucceeds(dm(as('alice'), 'alice', 'bob'))
    await assertFails(dm(as('alice'), 'alice', 'carol'))
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'connections/alice_carol'), { uids: ['alice', 'carol'], requestId: 'seed', since: new Date() })
      await setDoc(doc(ctx.firestore(), 'users/bob/blocks/alice'), { createdAt: new Date() })
    })
    await assertSucceeds(dm(as('alice'), 'alice', 'carol'))
    await assertFails(dm(as('alice'), 'alice', 'bob')) // bob blocked alice (re-create fails)
  })

  it('only members read/write messages', async () => {
    await dm(as('alice'), 'alice', 'bob')
    const msg = { senderId: 'alice', type: 'text', text: 'hi', createdAt: serverTimestamp() }
    await assertSucceeds(addDoc(collection(as('alice'), 'threads/alice_bob/messages'), msg))
    await assertFails(addDoc(collection(as('carol'), 'threads/alice_bob/messages'), { ...msg, senderId: 'carol' }))
    await assertFails(addDoc(collection(as('bob'), 'threads/alice_bob/messages'), msg)) // spoofed sender
    await assertFails(getDoc(doc(as('carol'), 'threads/alice_bob')))
  })
})

describe('groups', () => {
  const group = {
    name: 'Chess club', category: 'Mind', description: 'We play chess on Thursdays.', coverURL: null, visibility: 'public',
    ownerId: 'alice', mods: [], memberIds: ['alice'], memberCount: 1, threadId: 't1', searchTokens: ['chess'], createdAt: serverTimestamp(),
  }
  it('join adds exactly the caller and bumps the counter by one', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'groups/g1'), group))
    await assertSucceeds(updateDoc(doc(as('bob'), 'groups/g1'), { memberIds: ['alice', 'bob'], memberCount: 2 }))
    await assertFails(updateDoc(doc(as('carol'), 'groups/g1'), { memberIds: ['alice', 'bob', 'carol'], memberCount: 5 }))
    await assertFails(updateDoc(doc(as('carol'), 'groups/g1'), { memberIds: ['alice', 'bob', 'carol', 'dave'], memberCount: 4 }))
    await assertFails(updateDoc(doc(as('bob'), 'groups/g1'), { name: 'Renamed by non-owner' }))
  })
  it('request-only groups need an approved request', async () => {
    await setDoc(doc(as('alice'), 'groups/g2'), { ...group, visibility: 'request' })
    await assertFails(updateDoc(doc(as('bob'), 'groups/g2'), { memberIds: ['alice', 'bob'], memberCount: 2 }))
    await assertSucceeds(setDoc(doc(as('bob'), 'groups/g2/requests/bob'), { name: 'Bob', photo: null, message: 'pls', status: 'pending', createdAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as('alice'), 'groups/g2/requests/bob'), { status: 'approved' }))
    await assertSucceeds(updateDoc(doc(as('bob'), 'groups/g2'), { memberIds: ['alice', 'bob'], memberCount: 2 }))
  })
})

describe('verified-only actions', () => {
  const ride = {
    from: 'Campus', to: 'Vijayawada', start: new Date(Date.now() + 86400000), vehicle: 'car', seats: 3, seatsTaken: 0, note: '', costNote: '',
    status: 'open', driver: { uid: 'alice', name: 'Alice', photo: null }, passengerIds: [], threadId: 't', searchTokens: [], createdAt: serverTimestamp(),
  }
  it('unverified users cannot post rides; verified (claim or doc flag) can', async () => {
    await assertFails(setDoc(doc(as('alice'), 'rides/r1'), ride))
    await assertSucceeds(setDoc(doc(as('alice', { verifiedStudent: true }), 'rides/r1'), ride))
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/alice'), { 'roles.verifiedStudent': true }))
    await assertSucceeds(setDoc(doc(as('alice'), 'rides/r2'), ride))
  })
})

describe('hangouts capacity', () => {
  it('memberCount cannot exceed the limit', async () => {
    const h = {
      title: 'Coffee', type: 'Coffee', venue: 'Cafe', start: new Date(Date.now() + 3600000), limit: 2, memberCount: 1, visibility: 'public',
      joinMode: 'instant', inviteCode: null, status: 'open', createdBy: { uid: 'alice', name: 'Alice', photo: null }, threadId: 't', searchTokens: [], createdAt: serverTimestamp(),
    }
    await assertSucceeds(setDoc(doc(as('alice'), 'hangouts/h1'), h))
    await assertSucceeds(updateDoc(doc(as('bob'), 'hangouts/h1'), { memberCount: 2, status: 'full' }))
    await assertFails(updateDoc(doc(as('carol'), 'hangouts/h1'), { memberCount: 3, status: 'full' }))
  })
})

describe('context threads', () => {
  it('a hangout member can add themselves to its thread without being able to read it first', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'threads/th1'), {
        kind: 'context', title: 'Coffee', members: ['alice'], memberInfo: { alice: { name: 'Alice', photo: null } },
        contextRef: { collection: 'hangouts', id: 'h1', title: 'Coffee' }, lastMessage: null, unread: { alice: 0 }, createdAt: new Date(), updatedAt: new Date(),
      })
      await setDoc(doc(db, 'hangouts/h1/members/bob'), { role: 'member', name: 'Bob', photo: null, joinedAt: new Date() })
    })
    await assertFails(getDoc(doc(as('bob'), 'threads/th1')))
    const join = (uid: string) =>
      updateDoc(doc(as(uid), 'threads/th1'), { members: arrayUnion(uid), [`memberInfo.${uid}`]: { name: 'X', photo: null }, [`unread.${uid}`]: 0, updatedAt: serverTimestamp() })
    await assertSucceeds(join('bob'))
    await assertFails(join('carol')) // not a member of the hangout
    await assertSucceeds(getDoc(doc(as('bob'), 'threads/th1')))
  })
})

describe('events waitlist', () => {
  const ev = {
    category: 'movie', title: 'Movie', description: '', venue: 'Amphitheatre', start: new Date(Date.now() + 86400000), end: new Date(Date.now() + 90000000),
    capacity: 2, goingCount: 0, waitlistCount: 0, organiser: { type: 'user', id: 'alice', name: 'Alice' }, coverURL: null, createdBy: 'alice', searchTokens: [], createdAt: serverTimestamp(),
  }
  const rsvp = (uid: string, status: 'going' | 'waitlisted', position: number | null) => ({ status, position, name: uid, photo: null, createdAt: serverTimestamp() })

  it('a cancelling attendee can promote the first waitlisted person inside a transaction', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'events/e1'), ev))
    await assertSucceeds(setDoc(doc(as('bob'), 'events/e1/rsvps/bob'), rsvp('bob', 'going', null)))
    await assertSucceeds(updateDoc(doc(as('bob'), 'events/e1'), { goingCount: 1 }))
    await assertSucceeds(setDoc(doc(as('carol'), 'events/e1/rsvps/carol'), rsvp('carol', 'waitlisted', 1)))
    await assertSucceeds(updateDoc(doc(as('carol'), 'events/e1'), { waitlistCount: 1 }))
    // bob leaves: delete own rsvp, flip carol to going, waitlist -1 (going stays 1)
    const db = as('bob')
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        tx.delete(doc(db, 'events/e1/rsvps/bob'))
        tx.update(doc(db, 'events/e1/rsvps/carol'), { status: 'going', position: null })
        tx.update(doc(db, 'events/e1'), { waitlistCount: 0 })
      }),
    )
    // nobody can demote a going attendee or write someone else's rsvp
    await assertFails(updateDoc(doc(as('dave'), 'events/e1/rsvps/carol'), { status: 'waitlisted', position: 1 }))
    await assertFails(deleteDoc(doc(as('dave'), 'events/e1/rsvps/carol')))
    // counters only move by one
    await assertFails(updateDoc(doc(as('dave'), 'events/e1'), { goingCount: 5 }))
  })
})

describe('errands', () => {
  const trip = {
    city: 'Vijayawada', date: new Date(Date.now() + 86400000), returnTime: '18:00', maxItems: 3, itemCount: 0, note: '',
    traveller: { uid: 'alice', name: 'Alice', photo: null }, requesterIds: [], status: 'open', searchTokens: [], createdAt: serverTimestamp(),
  }
  it('requesters attach items and register themselves; only the traveller moves status forward', async () => {
    await assertSucceeds(setDoc(doc(as('alice', { verifiedStudent: true }), 'trips/t1'), trip))
    const db = as('bob')
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        tx.set(doc(db, 'trips/t1/items/i1'), { requester: { uid: 'bob', name: 'Bob', photo: null }, item: 'Charger', qty: 1, approxCost: '', where: '', note: '', status: 'requested', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        tx.update(doc(db, 'trips/t1'), { itemCount: 1, requesterIds: arrayUnion('bob') })
      }),
    )
    // cannot smuggle someone else into requesterIds
    await assertFails(updateDoc(doc(as('carol'), 'trips/t1'), { itemCount: 2, requesterIds: arrayUnion('dave') }))
    await assertFails(updateDoc(doc(as('bob'), 'trips/t1/items/i1'), { status: 'accepted', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as('alice'), 'trips/t1/items/i1'), { status: 'accepted', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(as('bob'), 'trips/t1/items/i1'), { status: 'cancelled', updatedAt: serverTimestamp() }))
  })
})

describe('support requests', () => {
  const req = {
    requester: { uid: 'bob', name: 'Bob', photo: null }, type: 'scribe', course: 'MA101 midterm', start: new Date(Date.now() + 86400000), end: new Date(Date.now() + 90000000),
    venue: 'Exam hall 2', notes: '', status: 'open', candidateIds: [], volunteer: null, createdAt: serverTimestamp(),
  }
  it('only verified volunteers see the queue; they can take and release a request, but not steal one', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'supportRequests/s1'), req))
    await assertFails(getDoc(doc(as('carol'), 'supportRequests/s1')))
    const vol = as('vicky', { volunteer: true })
    await assertSucceeds(getDoc(doc(vol, 'supportRequests/s1')))
    await assertSucceeds(updateDoc(doc(vol, 'supportRequests/s1'), { volunteer: { uid: 'vicky', name: 'Vicky', photo: null }, status: 'matched', candidateIds: arrayUnion('vicky') }))
    // another volunteer cannot overwrite a matched request
    await assertFails(updateDoc(doc(as('wes', { volunteer: true }), 'supportRequests/s1'), { volunteer: { uid: 'wes', name: 'Wes', photo: null }, status: 'matched', candidateIds: arrayUnion('wes') }))
    // requester confirms; volunteer may still withdraw (reopens)
    await assertSucceeds(updateDoc(doc(as('bob'), 'supportRequests/s1'), { status: 'confirmed' }))
    await assertSucceeds(updateDoc(doc(vol, 'supportRequests/s1'), { volunteer: null, status: 'open' }))
  })
})

describe('teams', () => {
  const team = {
    name: 'Hack team', pitch: 'Build a thing', owner: { uid: 'alice', name: 'Alice', photo: null }, memberIds: ['alice'],
    roles: [{ id: 'r1', title: 'Designer', skills: [], count: 1, filled: 0 }], size: 3, deadline: null, status: 'open', threadId: 't1', searchTokens: [], createdAt: serverTimestamp(),
  }
  it('owner decides applications; members can leave (freeing their role) but cannot edit the team', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'teams/tm1'), team))
    await assertSucceeds(setDoc(doc(as('bob'), 'teams/tm1/applications/bob'), { roleId: 'r1', pitch: 'I design', status: 'pending', name: 'Bob', photo: null, createdAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(as('bob'), 'teams/tm1/applications/bob'), { status: 'accepted' }))
    await assertSucceeds(updateDoc(doc(as('alice'), 'teams/tm1/applications/bob'), { status: 'accepted' }))
    await assertSucceeds(updateDoc(doc(as('alice'), 'teams/tm1'), { memberIds: arrayUnion('bob'), roles: [{ id: 'r1', title: 'Designer', skills: [], count: 1, filled: 1 }] }))
    await assertFails(updateDoc(doc(as('bob'), 'teams/tm1'), { name: 'Renamed' }))
    await assertFails(updateDoc(doc(as('bob'), 'teams/tm1'), { memberIds: ['bob'] }))
    await assertSucceeds(updateDoc(doc(as('bob'), 'teams/tm1'), { memberIds: ['alice'], roles: [{ id: 'r1', title: 'Designer', skills: [], count: 1, filled: 0 }], status: 'open' }))
  })
})

describe('tutoring', () => {
  const tutorDoc = { uid: 'bob', name: 'Bob', photo: null, bio: 'x', skills: ['python'], hourlyRate: 250, availability: [], blackoutDates: [], ratingAvg: 0, ratingCount: 0, sessions: 0, active: true, verifiedStudent: true, searchTokens: [], createdAt: serverTimestamp() }
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'tutors/bob'), tutorDoc)
    })
  })
  it('applications are verified-only and decided by admins', async () => {
    const app = { kind: 'tutor', applicant: { uid: 'bob', name: 'Bob', photo: null }, payload: {}, proofURLs: [], status: 'pending', reviewerId: null, note: '', createdAt: serverTimestamp(), decidedAt: null }
    await assertFails(setDoc(doc(as('bob'), 'applications/a1'), app))
    await assertSucceeds(setDoc(doc(as('bob', { verifiedStudent: true }), 'applications/a1'), app))
    await assertFails(updateDoc(doc(as('bob', { verifiedStudent: true }), 'applications/a1'), { status: 'approved' }))
    await assertSucceeds(updateDoc(doc(as('admin', { admin: true }), 'applications/a1'), { status: 'approved', reviewerId: 'admin', decidedAt: serverTimestamp() }))
    // only admins mint tutor profiles (or the tutor themselves once flagged)
    await assertFails(setDoc(doc(as('carol'), 'tutors/carol'), { ...tutorDoc, uid: 'carol' }))
    await assertSucceeds(setDoc(doc(as('admin', { admin: true }), 'tutors/carol'), { ...tutorDoc, uid: 'carol' }))
  })
  it('booking locks the slot in one transaction; tutor cannot book themselves; rating rollup is a +1 step', async () => {
    const start = new Date(Date.now() + 86400000), end = new Date(start.getTime() + 3600000)
    const booking = (studentId: string) => ({ studentId, tutorId: 'bob', student: { uid: studentId, name: 'S', photo: null }, tutor: { uid: 'bob', name: 'Bob', photo: null }, skill: 'python', start, end, rate: 250, status: 'pending_payment', payment: { method: 'mock', paidAt: null }, reviewed: false, createdAt: serverTimestamp() })
    await assertFails(setDoc(doc(as('bob'), 'bookings/b0'), booking('bob')))
    const alice = as('alice')
    await assertSucceeds(runTransaction(alice, async (tx) => {
      tx.set(doc(alice, 'bookings/b1'), booking('alice'))
      tx.set(doc(alice, 'tutors/bob/slots/s1'), { bookingId: 'b1', studentId: 'alice', start, end })
    }))
    // a stranger cannot lock a slot pointing at someone else's booking
    await assertFails(setDoc(doc(as('carol'), 'tutors/bob/slots/s2'), { bookingId: 'b1', studentId: 'alice', start, end }))
    await assertFails(updateDoc(doc(alice, 'bookings/b1'), { rate: 1 }))
    await assertSucceeds(updateDoc(doc(alice, 'bookings/b1'), { status: 'confirmed', 'payment.paidAt': serverTimestamp() }))
    await assertFails(getDoc(doc(as('carol'), 'bookings/b1')))
    await assertSucceeds(getDoc(doc(as('bob'), 'bookings/b1')))
    // review: only the booking's student, and the tutor rating moves by exactly one count
    await assertFails(setDoc(doc(as('carol'), 'tutors/bob/reviews/b1'), { student: { uid: 'carol', name: 'C', photo: null }, rating: 5, text: '', createdAt: serverTimestamp() }))
    await assertSucceeds(runTransaction(alice, async (tx) => {
      tx.set(doc(alice, 'tutors/bob/reviews/b1'), { student: { uid: 'alice', name: 'Alice', photo: null }, rating: 5, text: 'Great', createdAt: serverTimestamp() })
      tx.update(doc(alice, 'tutors/bob'), { ratingAvg: 5, ratingCount: 1 })
      tx.update(doc(alice, 'bookings/b1'), { reviewed: true })
    }))
    await assertFails(updateDoc(doc(alice, 'tutors/bob'), { ratingAvg: 5, ratingCount: 3 }))
    await assertFails(updateDoc(doc(as('bob'), 'tutors/bob'), { ratingAvg: 1 }))
    await assertSucceeds(updateDoc(doc(as('bob', { tutor: true }), 'tutors/bob'), { hourlyRate: 300 }))
  })
})

describe('community polls', () => {
  it('members vote once via a transaction that writes votes/{uid} and bumps counts by one', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communities/c1'), { name: 'Film', ownerId: 'alice', mods: [], memberIds: ['alice'], memberCount: 1, visibility: 'public' })
    })
    const alice = as('alice')
    const poll = { question: 'Q', options: [{ id: 'a', text: 'A', count: 0 }, { id: 'b', text: 'B', count: 0 }], multi: false, anonymous: false, totalVotes: 0, createdBy: 'alice', closesAt: null, createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(as('bob'), 'communities/c1/polls/p1'), { ...poll, createdBy: 'bob' }))
    await assertSucceeds(setDoc(doc(alice, 'communities/c1/polls/p1'), poll))
    await assertFails(updateDoc(doc(alice, 'communities/c1/polls/p1'), { totalVotes: 1 }))
    await assertSucceeds(runTransaction(alice, async (tx) => {
      tx.set(doc(alice, 'communities/c1/polls/p1/votes/alice'), { optionIds: ['b'] })
      tx.update(doc(alice, 'communities/c1/polls/p1'), { options: [{ id: 'a', text: 'A', count: 0 }, { id: 'b', text: 'B', count: 1 }], totalVotes: 1 })
    }))
    await assertFails(setDoc(doc(as('bob'), 'communities/c1/polls/p1/votes/bob'), { optionIds: ['a'] }))
  })
})

describe('reports & admin', () => {
  it('anyone can report; only admins read the queue', async () => {
    const r = { reporterId: 'bob', target: { collection: 'users', id: 'alice', ownerId: 'alice', label: 'Alice' }, reason: 'spam', details: '', status: 'open', action: null, reviewerId: null, createdAt: serverTimestamp() }
    await assertSucceeds(addDoc(collection(as('bob'), 'reports'), r))
    await assertFails(addDoc(collection(as('bob'), 'reports'), { ...r, reporterId: 'alice' }))
    await assertFails(getDoc(doc(as('alice'), 'reports/x')))
  })
})

describe('anonymous access', () => {
  it('unauthenticated users cannot read profiles', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')))
  })
})
