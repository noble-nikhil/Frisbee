/**
 * Demo data for judges and local development.
 *
 *   pnpm --filter @frisbee/server seed:emulator   # against the local emulators
 *   pnpm --filter @frisbee/server seed            # against the live project (needs service account)
 *
 * Idempotent: users are keyed by email, everything else by a fixed id, so re-running
 * updates in place instead of duplicating. Every demo password is `frisbee-demo`.
 */
import { tokenize } from '@frisbee/shared'
import { auth, db, FieldValue, Timestamp } from '../src/firebase'

const PASSWORD = 'frisbee-demo'
const DOMAIN = 'srmap.edu.in'
const now = () => FieldValue.serverTimestamp()
const at = (daysFromNow: number, hour: number, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return Timestamp.fromDate(d)
}
const ref = (u: SeedUser) => ({ uid: u.uid, name: u.name, photo: null })
const week = (...days: string[]) => Object.fromEntries(days.map((d) => [d, ['evening']]))

type SeedUser = {
  key: string
  uid: string
  name: string
  email: string
  department: string
  year: number
  bio: string
  skills: { tag: string; level: 1 | 2 | 3 }[]
  canTeach: string[]
  wantsToLearn: string[]
  interests: string[]
  hobbies: string[]
  careerGoals: string[]
  availability: Record<string, string[]>
  roles?: Partial<{ verifiedStudent: boolean; tutor: boolean; volunteer: boolean; admin: boolean }>
}

const USERS: SeedUser[] = [
  {
    key: 'judge', uid: '', name: 'Judge One', email: `judge1@${DOMAIN}`, department: 'Computer Science', year: 3,
    bio: 'Here to see what frisbee can do. Into hackathons, football and bad puns.',
    skills: [{ tag: 'python', level: 2 }, { tag: 'react', level: 2 }, { tag: 'figma', level: 1 }],
    canTeach: ['python'], wantsToLearn: ['machine-learning', 'guitar', 'public-speaking'],
    interests: ['hackathons', 'football', 'startups', 'film'], hobbies: ['gaming', 'photography'], careerGoals: ['software-engineer', 'founder'],
    availability: week('mon', 'wed', 'fri', 'sat'), roles: { verifiedStudent: true },
  },
  {
    key: 'meera', uid: '', name: 'Meera Nair', email: `meera.tutor@${DOMAIN}`, department: 'Computer Science', year: 4,
    bio: 'Final year, TA for Data Structures. I tutor DSA and Python — patient, structured, lots of practice problems.',
    skills: [{ tag: 'python', level: 3 }, { tag: 'java', level: 3 }, { tag: 'machine-learning', level: 2 }, { tag: 'sql', level: 2 }],
    canTeach: ['python', 'java', 'sql'], wantsToLearn: ['german', 'guitar'],
    interests: ['competitive-programming', 'ai', 'music', 'quizzing'], hobbies: ['reading', 'singing'], careerGoals: ['software-engineer', 'higher-studies-abroad'],
    availability: week('tue', 'thu', 'sat', 'sun'), roles: { verifiedStudent: true, tutor: true },
  },
  {
    key: 'arjun', uid: '', name: 'Arjun Reddy', email: `arjun.r@${DOMAIN}`, department: 'Mechanical', year: 2,
    bio: 'Robotics club, weekend trekker, owns a car and drives to Vijayawada most Fridays.',
    skills: [{ tag: 'arduino', level: 3 }, { tag: '3d-modelling', level: 2 }, { tag: 'python', level: 1 }],
    canTeach: ['arduino', '3d-modelling'], wantsToLearn: ['python', 'video-editing'],
    interests: ['trekking', 'cricket', 'hackathons', 'open-source'], hobbies: ['cycling', 'photography'], careerGoals: ['core-engineering', 'founder'],
    availability: week('mon', 'tue', 'fri', 'sat'), roles: { verifiedStudent: true },
  },
  {
    key: 'sana', uid: '', name: 'Sana Sheikh', email: `sana.s@${DOMAIN}`, department: 'Liberal Arts', year: 1,
    bio: 'First year, still finding my people. Write poetry, play guitar badly, want to learn to code.',
    skills: [{ tag: 'content-writing', level: 3 }, { tag: 'public-speaking', level: 2 }, { tag: 'english', level: 3 }],
    canTeach: ['content-writing', 'public-speaking', 'guitar'], wantsToLearn: ['python', 'figma'],
    interests: ['writing', 'music', 'film', 'debating', 'theatre'], hobbies: ['guitar', 'journaling', 'reading'], careerGoals: ['creator-media', 'civil-services'],
    availability: week('mon', 'wed', 'thu', 'sun'), roles: { verifiedStudent: true, volunteer: true },
  },
  {
    key: 'dev', uid: '', name: 'Dev Patel', email: `dev.p@${DOMAIN}`, department: 'Electronics & Communication', year: 3,
    bio: 'Building a campus IoT startup. Looking for a designer and a backend person.',
    skills: [{ tag: 'iot', level: 3 }, { tag: 'embedded-c', level: 3 }, { tag: 'node-js', level: 2 }, { tag: 'pitching', level: 2 }],
    canTeach: ['embedded-c', 'iot'], wantsToLearn: ['figma', 'react', 'finance'],
    interests: ['startups', 'hackathons', 'blockchain', 'badminton'], hobbies: ['podcasts', 'gaming'], careerGoals: ['founder', 'product-manager'],
    availability: week('tue', 'wed', 'sat', 'sun'), roles: { verifiedStudent: true },
  },
  {
    key: 'priya', uid: '', name: 'Priya Iyer', email: `priya.i@${DOMAIN}`, department: 'Biotechnology', year: 2,
    bio: 'Bharatanatyam dancer, movie club regular, learning German for a semester abroad.',
    skills: [{ tag: 'statistics', level: 2 }, { tag: 'excel', level: 3 }, { tag: 'photography', level: 2 }],
    canTeach: ['excel', 'photography'], wantsToLearn: ['german', 'python'],
    interests: ['dance', 'film', 'travel', 'volunteering', 'yoga'], hobbies: ['cooking', 'photography'], careerGoals: ['research-phd', 'higher-studies-abroad'],
    availability: week('mon', 'thu', 'fri', 'sun'), roles: { verifiedStudent: true },
  },
  {
    key: 'rohan', uid: '', name: 'Rohan Das', email: `rohan.d@${DOMAIN}`, department: 'Computer Science', year: 3,
    bio: 'Backend and cloud. Organise the Friday football and the odd karaoke night.',
    skills: [{ tag: 'go', level: 2 }, { tag: 'docker', level: 3 }, { tag: 'aws', level: 2 }, { tag: 'sql', level: 3 }],
    canTeach: ['docker', 'sql', 'aws'], wantsToLearn: ['react', 'machine-learning'],
    interests: ['football', 'open-source', 'music', 'gym'], hobbies: ['singing', 'gaming'], careerGoals: ['software-engineer'],
    availability: week('mon', 'wed', 'fri', 'sat'), roles: { verifiedStudent: true },
  },
  {
    key: 'admin', uid: '', name: 'Campus Admin', email: `admin@${DOMAIN}`, department: 'Management', year: 5,
    bio: 'Student affairs. Approves communities, verifies tutors and volunteers.',
    skills: [{ tag: 'product-management', level: 2 }], canTeach: [], wantsToLearn: [],
    interests: ['volunteering', 'environment'], hobbies: ['gardening'], careerGoals: ['consultant'],
    availability: week('mon', 'tue', 'wed', 'thu', 'fri'), roles: { verifiedStudent: true, admin: true },
  },
  {
    key: 'guest', uid: '', name: 'Guest User', email: 'guest@gmail.com', department: 'Economics', year: 1,
    bio: 'Signed up with a personal email — can browse, but verified-only actions are locked.',
    skills: [{ tag: 'economics', level: 2 }], canTeach: [], wantsToLearn: ['python'],
    interests: ['chess', 'anime', 'startups'], hobbies: ['board-games'], careerGoals: ['finance-analyst'],
    availability: week('sat', 'sun'),
  },
]

async function ensureAuthUser(u: SeedUser) {
  const verified = u.email.endsWith(`@${DOMAIN}`)
  try {
    const existing = await auth.getUserByEmail(u.email)
    await auth.updateUser(existing.uid, { displayName: u.name, password: PASSWORD, emailVerified: verified })
    return existing.uid
  } catch {
    const created = await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.name, emailVerified: verified })
    return created.uid
  }
}

async function seedUsers() {
  for (const u of USERS) {
    u.uid = await ensureAuthUser(u)
    const roles = { verifiedStudent: false, tutor: false, volunteer: false, admin: false, ...u.roles }
    await auth.setCustomUserClaims(u.uid, roles)
    const snap = await db.doc(`users/${u.uid}`).get()
    await db.doc(`users/${u.uid}`).set(
      {
        displayName: u.name,
        photoURL: null,
        email: u.email,
        emailDomain: u.email.split('@')[1],
        department: u.department,
        year: u.year,
        bio: u.bio,
        roles,
        skills: u.skills,
        canTeach: u.canTeach,
        wantsToLearn: u.wantsToLearn,
        interests: u.interests,
        hobbies: u.hobbies,
        careerGoals: u.careerGoals,
        availability: u.availability,
        privacy: { profile: 'everyone', messages: 'everyone', requests: 'everyone', showAvailability: true },
        profileComplete: true,
        onboardingStep: 3,
        suspended: false,
        stats: snap.exists ? snap.data()!.stats : { connections: 0, groups: 0 },
        searchTokens: tokenize(u.name, u.department, u.bio),
        createdAt: snap.exists ? snap.data()!.createdAt : now(),
        updatedAt: now(),
      },
      { merge: true },
    )
  }
  console.log(`users: ${USERS.length}`)
}

const U = (key: string) => USERS.find((u) => u.key === key)!

async function thread(id: string, kind: 'group' | 'context', title: string, members: SeedUser[], contextRef?: { collection: string; id: string; title: string }) {
  await db.doc(`threads/${id}`).set({
    kind,
    title,
    members: members.map((m) => m.uid),
    memberInfo: Object.fromEntries(members.map((m) => [m.uid, { name: m.name, photo: null }])),
    ...(contextRef ? { contextRef } : {}),
    lastMessage: null,
    unread: Object.fromEntries(members.map((m) => [m.uid, 0])),
    createdAt: now(),
    updatedAt: now(),
  })
  return id
}

async function members(path: string, owner: SeedUser, rest: SeedUser[]) {
  await db.doc(`${path}/${owner.uid}`).set({ role: 'owner', name: owner.name, photo: null, joinedAt: now() })
  for (const m of rest) await db.doc(`${path}/${m.uid}`).set({ role: 'member', name: m.name, photo: null, joinedAt: now() })
}

async function seedGroups() {
  const groups = [
    { id: 'g-hack-club', name: 'SRM AP Hack Club', category: 'Tech', description: 'Weekly build nights, hackathon teams and demo days. Beginners welcome — bring a laptop and an idea.', owner: 'judge', members: ['meera', 'dev', 'rohan', 'arjun'] },
    { id: 'g-friday-football', name: 'Friday Football', category: 'Sports & fitness', description: '7-a-side on the main ground every Friday at 6. First come first play, subs rotate.', owner: 'rohan', members: ['judge', 'arjun'] },
    { id: 'g-open-mic', name: 'Open Mic & Poetry', category: 'Arts & music', description: 'Monthly open mic at the amphitheatre. Poetry, stand-up, acoustic sets. No judging, just clapping.', owner: 'sana', members: ['priya', 'meera'] },
    { id: 'g-german', name: 'German Learners', category: 'Culture & languages', description: 'A1 to B1 study circle. We meet twice a week and practise speaking. Duolingo streaks optional.', owner: 'priya', members: ['meera', 'sana'] },
  ]
  for (const g of groups) {
    const owner = U(g.owner), rest = g.members.map(U)
    const threadId = await thread(`t-${g.id}`, 'group', g.name, [owner, ...rest], { collection: 'groups', id: g.id, title: g.name })
    await db.doc(`groups/${g.id}`).set({
      name: g.name, category: g.category, description: g.description, coverURL: null, visibility: 'public',
      ownerId: owner.uid, mods: [], memberIds: [owner.uid, ...rest.map((m) => m.uid)], memberCount: 1 + rest.length, threadId,
      searchTokens: tokenize(g.name, g.category, g.description), createdAt: now(),
    })
    await members(`groups/${g.id}/members`, owner, rest)
  }
  await db.collection('groups/g-hack-club/posts').doc('p1').set({
    author: ref(U('judge')), text: 'Build night this Thursday, 7 pm, Lab 204. Theme: campus tools. Teams of 2–4, pizza at 9.', imageURL: null,
    reactions: { like: 4, heart: 1, fire: 2 }, commentCount: 0, pinned: true, createdAt: now(),
  })
  console.log(`groups: ${groups.length}`)
}

async function seedCommunities() {
  const communities = [
    { id: 'c-film-society', name: 'SRM AP Film Society', category: 'Books & film', description: 'Weekly screenings, discussion threads for every film we watch and polls to pick the next one.', rules: 'No spoilers in post titles. Be kind about taste.', owner: 'priya', members: ['judge', 'sana', 'meera'], channels: [{ id: 'general', name: 'General' }, { id: 'screenings', name: 'Screenings' }] },
    { id: 'c-founders', name: 'Founders Circle', category: 'Entrepreneurship', description: 'Students building things. Share progress, find co-founders, get brutal feedback on pitches.', rules: 'Ship before you pitch. No MLM.', owner: 'dev', members: ['judge', 'arjun', 'rohan'], channels: [{ id: 'general', name: 'General' }, { id: 'show-and-tell', name: 'Show and tell' }] },
  ]
  for (const c of communities) {
    const owner = U(c.owner), rest = c.members.map(U)
    const threadId = await thread(`t-${c.id}`, 'group', c.name, [owner, ...rest], { collection: 'communities', id: c.id, title: c.name })
    await db.doc(`communities/${c.id}`).set({
      name: c.name, category: c.category, description: c.description, rules: c.rules, channels: c.channels, coverURL: null, visibility: 'public',
      ownerId: owner.uid, mods: [], memberIds: [owner.uid, ...rest.map((m) => m.uid)], memberCount: 1 + rest.length, threadId,
      searchTokens: tokenize(c.name, c.category, c.description), createdAt: now(),
    })
    await members(`communities/${c.id}/members`, owner, rest)
  }
  await db.doc('communities/c-film-society/posts/p1').set({
    author: ref(U('priya')), text: 'Saturday screening is Super Deluxe (2019). Seminar hall B, 7 pm. Discussion thread opens after.', imageURL: null,
    reactions: { like: 6, heart: 3, fire: 1 }, commentCount: 1, pinned: true, channelId: 'screenings', createdAt: now(),
  })
  await db.doc('communities/c-film-society/posts/p1/comments/c1').set({ author: ref(U('sana')), text: 'Finally. Been waiting for this one.', createdAt: now() })
  await db.doc('communities/c-film-society/polls/poll1').set({
    question: 'Next month: which director retrospective?', options: [{ id: 'o1', text: 'Satyajit Ray', count: 3 }, { id: 'o2', text: 'Mani Ratnam', count: 5 }, { id: 'o3', text: 'Christopher Nolan', count: 2 }],
    multi: false, anonymous: false, closesAt: at(10, 21), totalVotes: 10, createdBy: U('priya').uid, createdAt: now(),
  })
  await db.doc('communities/c-founders/posts/p1').set({
    author: ref(U('dev')), text: 'Update on the hostel laundry tracker: 40 sign-ups in week one. Bottleneck is the hardware bill. Anyone know a cheap load-cell supplier in Vijayawada?', imageURL: null,
    reactions: { like: 5, heart: 0, fire: 3 }, commentCount: 0, pinned: false, channelId: 'show-and-tell', createdAt: now(),
  })
  await db.doc('communityRequests/cr-anime').set({
    name: 'Anime & Manga Club', purpose: 'Watch parties, manga swaps and a yearly cosplay day during the cultural fest.', category: 'Books & film', rules: '',
    requester: ref(U('guest')), status: 'pending', reviewerId: null, note: '', createdAt: now(), decidedAt: null,
  })
  console.log(`communities: ${communities.length} (+1 pending request)`)
}

async function seedHappening() {
  const activities = [
    { id: 'a-dsa-grind', title: 'DSA grind session', description: 'Leetcode mediums together. Bring your weakest topic.', start: at(1, 18), location: 'Library, group study room 3', tags: ['study', 'tech'], capacity: 8, by: 'meera' },
    { id: 'a-sunrise-run', title: 'Sunrise run to the river', description: '6 km easy pace. Back before the mess opens.', start: at(2, 5, 45), location: 'Main gate', tags: ['sports', 'outdoors'], capacity: null, by: 'rohan' },
    { id: 'a-jam', title: 'Acoustic jam', description: 'Bring an instrument or just a voice. Setlist is whatever people know.', start: at(3, 19, 30), location: 'Amphitheatre steps', tags: ['music', 'social'], capacity: 15, by: 'sana' },
    { id: 'a-board-games', title: 'Board game night', description: 'Catan, Codenames, Coup. Snacks pooled.', start: at(5, 20), location: 'Hostel C common room', tags: ['gaming', 'social'], capacity: 12, by: 'judge' },
  ]
  for (const a of activities) {
    await db.doc(`activities/${a.id}`).set({
      title: a.title, description: a.description, start: a.start, location: a.location, tags: a.tags, capacity: a.capacity, goingCount: 0,
      createdBy: ref(U(a.by)), searchTokens: tokenize(a.title, a.location, a.tags, a.description), createdAt: now(),
    })
  }
  const hangouts = [
    { id: 'h-chai', title: 'Chai and rants', type: 'Coffee', venue: 'Tea point near block A', start: at(0, 17, 30), limit: 5, by: 'sana', members: ['priya'] },
    { id: 'h-badminton', title: 'Badminton doubles', type: 'Sports', venue: 'Indoor courts', start: at(1, 7), limit: 4, by: 'dev', members: ['judge', 'arjun'] },
    { id: 'h-study', title: 'Silent study, phones in the middle', type: 'Study', venue: 'Library 2nd floor', start: at(1, 21), limit: 6, by: 'meera', members: [] },
  ]
  for (const h of hangouts) {
    const host = U(h.by), rest = h.members.map(U)
    const threadId = await thread(`t-${h.id}`, 'context', h.title, [host, ...rest], { collection: 'hangouts', id: h.id, title: h.title })
    await db.doc(`hangouts/${h.id}`).set({
      title: h.title, type: h.type, venue: h.venue, start: h.start, limit: h.limit, memberCount: 1 + rest.length, visibility: 'public', joinMode: 'instant',
      inviteCode: null, status: 1 + rest.length >= h.limit ? 'full' : 'open', createdBy: ref(host), threadId, searchTokens: tokenize(h.title, h.type, h.venue), createdAt: now(),
    })
    await members(`hangouts/${h.id}/members`, host, rest)
  }
  const events = [
    { id: 'e-movie', category: 'movie', title: 'Open-air movie night: Interstellar', description: 'Projector on the lawn, bring a mat. Popcorn stall by the Film Society.', venue: 'Central lawn', start: at(2, 19, 30), end: at(2, 22, 30), capacity: 120, by: 'priya', org: { type: 'community', id: 'c-film-society', name: 'SRM AP Film Society' } },
    { id: 'e-karaoke', category: 'karaoke', title: 'Karaoke Thursday', description: 'Two mics, one questionable playlist. Duets encouraged.', venue: 'Student activity centre', start: at(4, 20), end: at(4, 23), capacity: 40, by: 'rohan', org: { type: 'user', id: '', name: 'Rohan Das' } },
    { id: 'e-jam', category: 'jamming', title: 'Monsoon jam', description: 'Open jam with the music club. Drum kit and amps provided.', venue: 'Music room', start: at(6, 18), end: at(6, 21), capacity: 30, by: 'sana', org: { type: 'group', id: 'g-open-mic', name: 'Open Mic & Poetry' } },
    { id: 'e-sports', category: 'sports', title: 'Inter-hostel 7s tournament', description: 'Eight teams, knockout format, finals under lights.', venue: 'Main ground', start: at(8, 16), end: at(8, 20), capacity: 200, by: 'rohan', org: { type: 'group', id: 'g-friday-football', name: 'Friday Football' } },
    { id: 'e-talk', category: 'talk', title: 'Founder AMA: from hostel room to seed round', description: 'An SRM AP alum on raising their first cheque. Q&A after.', venue: 'Seminar hall A', start: at(9, 17), end: at(9, 18, 30), capacity: 80, by: 'dev', org: { type: 'community', id: 'c-founders', name: 'Founders Circle' } },
  ]
  for (const e of events) {
    const by = U(e.by)
    const org = e.org.type === 'user' ? { ...e.org, id: by.uid } : e.org
    await db.doc(`events/${e.id}`).set({
      category: e.category, title: e.title, description: e.description, venue: e.venue, start: e.start, end: e.end, capacity: e.capacity, goingCount: 0, waitlistCount: 0,
      organiser: org, coverURL: null, createdBy: by.uid, searchTokens: tokenize(e.title, e.category, e.venue, e.description), createdAt: now(),
    })
  }
  console.log(`activities: ${activities.length}, hangouts: ${hangouts.length}, events: ${events.length}`)
}

async function seedRidesErrandsTeams() {
  const rides = [
    { id: 'r-vij-fri', from: 'SRM AP campus gate', to: 'Vijayawada junction', start: at(1, 17), vehicle: 'car', seats: 3, note: 'Leaving sharp. Small bags only.', costNote: 'Split fuel, about ₹80 each', by: 'arjun' },
    { id: 'r-airport', from: 'SRM AP campus gate', to: 'Vijayawada airport', start: at(3, 4, 30), vehicle: 'cab', seats: 2, note: 'Booked an Innova for the 7 am flight.', costNote: '₹400 each', by: 'dev' },
    { id: 'r-mall', from: 'Mangalagiri', to: 'PVP mall', start: at(2, 15), vehicle: 'auto', seats: 2, note: '', costNote: 'Shared auto, ₹40', by: 'priya' },
  ]
  for (const r of rides) {
    const driver = U(r.by)
    const threadId = await thread(`t-${r.id}`, 'context', `${r.from} → ${r.to}`, [driver], { collection: 'rides', id: r.id, title: `${r.from} → ${r.to}` })
    await db.doc(`rides/${r.id}`).set({
      from: r.from, to: r.to, start: r.start, vehicle: r.vehicle, seats: r.seats, seatsTaken: 0, note: r.note, costNote: r.costNote, status: 'open',
      driver: ref(driver), passengerIds: [], threadId, searchTokens: tokenize(r.from, r.to, r.vehicle), createdAt: now(),
    })
  }
  const trips = [
    { id: 'tr-vij', city: 'Vijayawada', date: at(1, 10), returnTime: '18:00', maxItems: 5, note: 'Going to Besant Road. Can pick up from any shop nearby.', by: 'arjun' },
    { id: 'tr-guntur', city: 'Guntur', date: at(4, 9), returnTime: '20:00', maxItems: 3, note: 'Dentist trip, free after 2 pm.', by: 'rohan' },
  ]
  for (const t of trips) {
    await db.doc(`trips/${t.id}`).set({
      city: t.city, date: t.date, returnTime: t.returnTime, maxItems: t.maxItems, itemCount: 0, note: t.note, traveller: ref(U(t.by)), requesterIds: [], status: 'open',
      searchTokens: tokenize(t.city, t.note), createdAt: now(),
    })
  }
  const teams = [
    { id: 'tm-iot', name: 'Hostel laundry tracker', description: 'IoT load cells on washing machines + a live availability app. Have hardware, need the app.', roles: [{ id: 'r1', title: 'React developer', skills: ['react', 'typescript'], count: 1, filled: 0 }, { id: 'r2', title: 'UI designer', skills: ['figma', 'ui-ux-design'], count: 1, filled: 0 }], deadline: at(6, 23, 59), links: ['https://github.com'], by: 'dev' },
    { id: 'tm-ml', name: 'Attendance from CCTV (privacy-first)', description: 'On-device face blurring + headcount for lecture halls. Smart India Hackathon entry.', roles: [{ id: 'r1', title: 'ML engineer', skills: ['machine-learning', 'computer-vision'], count: 2, filled: 0 }, { id: 'r2', title: 'Pitch and docs', skills: ['pitching', 'content-writing'], count: 1, filled: 0 }], deadline: at(12, 23, 59), links: [], by: 'meera' },
  ]
  for (const t of teams) {
    const owner = U(t.by)
    const threadId = await thread(`t-${t.id}`, 'context', t.name, [owner], { collection: 'teams', id: t.id, title: t.name })
    await db.doc(`teams/${t.id}`).set({
      name: t.name, description: t.description, roles: t.roles, teamSize: 1 + t.roles.reduce((n, r) => n + r.count, 0), deadline: t.deadline, links: t.links,
      owner: ref(owner), memberIds: [owner.uid], status: 'open', threadId, searchTokens: tokenize(t.name, t.description, t.roles.map((r) => r.title)), createdAt: now(),
    })
    await members(`teams/${t.id}/members`, owner, [])
  }
  console.log(`rides: ${rides.length}, trips: ${trips.length}, teams: ${teams.length}`)
}

async function seedTutoringAndSupport() {
  const meera = U('meera'), rohan = U('rohan'), sana = U('sana'), judge = U('judge'), guest = U('guest')
  await db.doc(`tutors/${meera.uid}`).set({
    name: meera.name, photo: null, bio: 'TA for Data Structures, two years of tutoring first-years. We solve problems together and I explain the why, not just the how.',
    skills: ['python', 'java', 'sql'], hourlyRate: 250, ratingAvg: 4.8, ratingCount: 5,
    availability: [{ dow: 'tue', start: '17:00', end: '20:00' }, { dow: 'thu', start: '17:00', end: '20:00' }, { dow: 'sat', start: '10:00', end: '13:00' }, { dow: 'sun', start: '10:00', end: '13:00' }],
    blackoutDates: [], active: true, verifiedStudent: true, searchTokens: tokenize(meera.name, 'python java sql data structures'),
  })
  const reviews = [
    { id: 'rv1', by: judge, rating: 5, text: 'Explained recursion in a way that finally clicked. Worth every rupee.' },
    { id: 'rv2', by: U('priya'), rating: 5, text: 'Patient and organised. Sent practice problems after the session.' },
    { id: 'rv3', by: U('arjun'), rating: 4, text: 'Great for Python basics. Sessions start on time.' },
  ]
  for (const r of reviews) await db.doc(`tutors/${meera.uid}/reviews/${r.id}`).set({ student: ref(r.by), rating: r.rating, text: r.text, createdAt: now() })

  // a second, pending tutor application for the admin queue
  await db.doc('applications/app-rohan').set({
    kind: 'tutor', applicant: ref(rohan),
    payload: { bio: 'Cloud and databases. Helped 20+ juniors pass DBMS last semester with mock vivas and query drills.', skills: ['sql', 'docker', 'aws'], hourlyRate: 200, availability: [{ dow: 'mon', start: '18:00', end: '21:00' }, { dow: 'wed', start: '18:00', end: '21:00' }] },
    proofURLs: [], status: 'pending', reviewerId: null, note: '', createdAt: now(), decidedAt: null,
  })

  await db.doc(`volunteers/${sana.uid}`).set({
    name: sana.name, photo: null, subjects: ['English', 'History', 'Political science', 'MA101'], types: ['scribe', 'note_taking', 'reading'], languages: ['English', 'Hindi', 'Urdu'],
    availability: sana.availability, active: true, completedCount: 3,
  })
  await db.doc('applications/app-priya-vol').set({
    kind: 'volunteer', applicant: ref(U('priya')),
    payload: { subjects: ['Biology', 'Chemistry', 'Statistics'], types: ['scribe', 'mobility'], availability: U('priya').availability, languages: ['English', 'Tamil', 'Telugu'], note: 'Volunteered with the Vijayawada blind school for two summers.' },
    proofURLs: [], status: 'pending', reviewerId: null, note: '', createdAt: now(), decidedAt: null,
  })
  await db.doc('supportRequests/sr-1').set({
    requester: ref(guest), type: 'scribe', course: 'ECO101 midterm', start: at(3, 9, 30), end: at(3, 11, 30), venue: 'Exam hall 2', notes: 'Two-hour written paper. Please report to the invigilator 15 minutes early.',
    status: 'open', candidateIds: [], volunteer: null, createdAt: now(),
  })
  await db.doc('reports/rp-1').set({
    reporterId: U('priya').uid, target: { collection: 'users', id: guest.uid, ownerId: guest.uid, label: 'Guest User' }, reason: 'spam', details: 'Sent the same crypto link to five people in the hack club chat.',
    status: 'open', action: null, reviewerId: null, createdAt: now(),
  })
  console.log('tutors: 1 (+1 pending), volunteers: 1 (+1 pending), support requests: 1, reports: 1')
}

async function seedConnections() {
  const pairs: [string, string][] = [['judge', 'meera'], ['judge', 'rohan'], ['judge', 'arjun'], ['sana', 'priya'], ['dev', 'arjun'], ['meera', 'priya']]
  for (const [a, b] of pairs) {
    const [x, y] = [U(a).uid, U(b).uid].sort() as [string, string]
    const reqId = `seed-${a}-${b}`
    await db.doc(`connectionRequests/${reqId}`).set({ from: U(a).uid, to: U(b).uid, fromRef: ref(U(a)), toRef: ref(U(b)), message: '', status: 'accepted', createdAt: now(), respondedAt: now() })
    await db.doc(`connections/${x}_${y}`).set({ uids: [x, y], requestId: reqId, since: now() })
  }
  // one pending request into the judge's inbox so the "requests" tab has something to do
  await db.doc('connectionRequests/seed-dev-judge').set({ from: U('dev').uid, to: U('judge').uid, fromRef: ref(U('dev')), toRef: ref(U('judge')), message: 'Saw you know React — building an IoT app, want to team up?', status: 'pending', createdAt: now(), respondedAt: null })
  const counts = new Map<string, number>()
  for (const [a, b] of pairs) for (const k of [a, b]) counts.set(k, (counts.get(k) ?? 0) + 1)
  for (const u of USERS) await db.doc(`users/${u.uid}`).update({ 'stats.connections': counts.get(u.key) ?? 0, 'stats.groups': 0 })
  await db.collection(`users/${U('judge').uid}/notifications`).add({ type: 'system', title: 'Welcome to frisbee', body: 'Start with Discover to see who you match with.', link: '/discover', read: false, createdAt: now() })
  console.log(`connections: ${pairs.length} (+1 pending)`)
}

async function main() {
  console.log(`Seeding ${process.env.FIRESTORE_EMULATOR_HOST ? 'EMULATOR ' + process.env.FIRESTORE_EMULATOR_HOST : 'LIVE project'} …`)
  await seedUsers()
  await seedGroups()
  await seedCommunities()
  await seedHappening()
  await seedRidesErrandsTeams()
  await seedTutoringAndSupport()
  await seedConnections()
  console.log(`\nDone. Every demo account uses the password "${PASSWORD}":`)
  for (const u of USERS) console.log(`  ${u.email.padEnd(26)} ${u.name}${u.roles?.admin ? ' (admin)' : ''}${u.roles?.tutor ? ' (tutor)' : ''}${u.roles?.volunteer ? ' (volunteer)' : ''}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
