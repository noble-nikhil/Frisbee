# frisbee — Product Requirements Document

**Project:** frisbee — Campus Skill & Interest-Based Friend Finder (SRM AP hackathon)
**Team:** Hello World
**Version:** 1.0 (planning baseline, 5 Sep 2026)
**Source of truth for scope:** `00-Feature-Spec-original.pdf` (finalized feature spec). This PRD turns that list into buildable, testable requirements and makes the decisions the spec left open.

---

## 0. Decisions already locked (from kickoff)

| Topic | Decision |
|---|---|
| Architecture | **Firebase-first + thin Node.js service.** Auth, Firestore, real-time chat and notifications run entirely in the client against Firebase. A small Express service handles server-only jobs (custom role claims, verification approvals, matching recompute, seeding). The app must remain fully usable if that service is cold/down. |
| Email policy | **Tiered.** Anyone can create an account. Verifying an `@srmap.edu.in` address (Firebase email verification) grants `verifiedStudent`. Gated features (tutoring, volunteering, community requests, ride posting) require `verifiedStudent`. Demo accounts pre-seeded for judges. |
| File storage | **Firebase Storage on Blaze plan** (card on file; usage stays inside the free quotas). |
| Language | **TypeScript** everywhere (React app + Node service + shared types). |
| Install | **PWA** — installable on Android (native prompt) and iOS (Add to Home Screen with guided instructions). No app-store builds. |
| Visual direction | Professional, sharp, minimal. Flat surfaces, 1px borders, one accent per screen. **No gradients, no glassmorphism, no decorative blur, no confetti.** |

---

## 1. Problem & goals

### 1.1 Problem
On a residential campus like SRM AP, students with compatible skills and interests rarely find each other outside their own section/hostel. Existing channels (WhatsApp groups, notice boards, Instagram) are noisy, unsearchable and not structured around *what people can do* or *want to do together*. The result: hackathon teams formed by proximity instead of skill fit, empty karaoke nights, four separate autos to the same railway station, and specially-abled students scrambling for scribes before exams.

### 1.2 Product goal
A single mobile-first web app where a student builds a structured profile once (skills, interests, goals, availability) and the platform uses it to:
1. **Match** them with compatible people (friends, skill-swap partners, project teammates).
2. **Gather** them around things to do (groups, communities, hangouts, events).
3. **Coordinate** everyday logistics (ride pooling, errands, tutoring, accessibility support).

### 1.3 Hackathon success criteria (what "done" means for the demo)
- A judge can sign up on their phone, install the app to their home screen, complete onboarding in < 2 minutes, and immediately see explained matches.
- Every module in the Priority Matrix is present and demonstrably working with seeded data.
- Two phones can chat in real time (and the chat survives a refresh).
- The admin panel can approve a tutor / volunteer / community request and the effect is visible instantly on the requester's device.
- No screen looks unfinished: empty states, loading states and error states exist for every list.
- Lighthouse PWA "installable" check passes; Performance ≥ 85 on mobile for the home feed.

### 1.4 Non-goals (explicitly out of scope)
- Real payments (mock checkout only, as the spec allows).
- Native app-store distribution.
- Live location / maps SDK (venues are text; optional map link).
- Video calls.
- Email/SMS delivery of notifications (in-app + optional web push only).
- Multi-campus / multi-tenant support (single college, single domain).

---

## 2. Users & roles

### 2.1 Personas
| Persona | Snapshot | Primary jobs |
|---|---|---|
| **Aarav, 1st-year CSE** | New on campus, knows nobody, wants to learn guitar and join a hackathon team. | Find people with shared interests, find a team, join a hangout tonight. |
| **Meera, 3rd-year ECE** | Strong in DSA, wants pocket money and a portfolio of mentoring. | Become a verified tutor, get bookings, collect reviews. |
| **Rohan, 2nd-year Mech** | Goes to Vijayawada every Saturday. | Post his trip; pick up items or share auto costs. |
| **Sana, 2nd-year, visually impaired** | Needs a scribe for end-sem exams. | Request a verified scribe matched by course, get confirmation and reminders. |
| **Prof. / Student Council admin** | Responsible for platform hygiene. | Approve tutors/volunteers/communities, act on reports. |

### 2.2 Role model
Roles are additive flags on the user document and mirrored into Firebase Auth **custom claims** (set by the Node service) so Firestore Security Rules can enforce them without extra reads.

| Role | How obtained | Unlocks |
|---|---|---|
| `student` | Sign-up (default) | Everything not gated below |
| `verifiedStudent` | Email on `@srmap.edu.in` **and** email verified | Post rides/trips, request tutoring/volunteering, request a community, apply as tutor/volunteer |
| `tutor` | Admin approves tutor application | Tutor profile visible in marketplace, receive bookings |
| `volunteer` | Admin approves volunteer application | Matched to accessibility requests |
| `communityAdmin` | Set per community (owner + promoted moderators) | Manage members, pin posts, create polls, post announcements |
| `admin` | Set by seed script / another admin | Admin panel: approval queues, moderation queue, role management |

---

## 3. Information architecture

```
/                      Landing (public, marketing, install CTA)
/login  /signup        Auth
/onboarding            3-step profile setup (forced until complete)
/home                  Unified dashboard (matches · today · activity)
/discover              Tabs: People · Skill swap · Teams
/people/:uid           Public profile (connect / message / report)
/groups  /groups/:id   Interest groups + group feed + members
/communities /communities/:id      Communities: feed, polls, members, channels(opt.)
/communities/request   Request-a-community form
/happening             Tabs: Activities · Hangouts · Events   (+ calendar view for events)
/happening/:kind/:id   Detail + RSVP/join + updates
/rides  /rides/:id     Car & auto pooling
/errands /errands/:id  "Bring it for me" trips + item requests
/teams  /teams/:id     Project / hackathon team finder
/tutoring /tutoring/:tutorId /tutoring/apply /tutoring/bookings
/support               Accessibility volunteering: request / volunteer / my requests
/messages /messages/:threadId
/notifications
/search?q=             Global search
/me  /me/edit  /me/settings (privacy, notifications, blocked users, install app)
/admin                 Admin panel (guarded): queues · reports · roles · communities
```

Mobile navigation: bottom tab bar with 5 tabs — **Home · Discover · Happening · Messages · Me** — plus a top-right bell (notifications) and search icon. Everything else is reachable from Home "modules" grid and from Me. Desktop: left sidebar with the full list.

---

## 4. Functional requirements by module

Each requirement has an ID (for the task board), a priority (M = must for demo, S = should, C = could) and acceptance criteria (AC). "Verified" below always means `verifiedStudent`.

### 4.1 Accounts, profiles & onboarding (spec §2.1) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| ACC-1 | Email + password sign-up and login via Firebase Auth. Google sign-in as a second option (restricted to nothing; college status derives from the email domain). | M |
| ACC-2 | Email verification link sent on sign-up; UI shows a persistent "Verify your college email" banner until done. Users on `@srmap.edu.in` who verify get `verifiedStudent` within 5 s (Auth trigger or client-called endpoint). | M |
| ACC-3 | Password reset via email. | M |
| ACC-4 | **Onboarding wizard (3 steps, resumable):** ① Basics — display name, department, year, bio, photo. ② Tags — skills (with proficiency 1–3), "can teach", "wants to learn", interests/hobbies, career goals, picked from a **controlled taxonomy** (typeahead over a curated list; no free text). ③ Availability & privacy — weekly availability grid (Mon–Sun × Morning/Afternoon/Evening) and privacy defaults. Routes are blocked until `profileComplete === true`. | M |
| ACC-5 | Profile photo upload to Firebase Storage (client-side resize to ≤ 512 px, JPEG). Fallback: initials avatar (deterministic colour from uid). | M |
| ACC-6 | Public profile page shows: photo, name, dept/year, verified badge, bio, tag chips grouped by type, "can teach / wants to learn", mutual groups, connection state, Connect/Message/Report actions. | M |
| ACC-7 | Privacy settings: profile visibility (`everyone` / `connections` / `hidden from search`), who can message (`everyone` / `connections`), who can send connection requests (`everyone` / `nobody`), show availability (bool). Rules + queries respect these. | M |
| ACC-8 | Block user: removes from matches/search for both, hides existing thread, prevents new messages. Unblock from settings. | S |
| ACC-9 | Report user/content: reason enum + free text → `reports` collection → admin queue. | S |

**AC (ACC-4):** New account → forced to `/onboarding`; refresh mid-way restores step; after finishing, `/home` shows ≥ 1 match if seed data exists.

### 4.2 Intelligent matching (spec §2.2) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| MAT-1 | **Scoring:** weighted overlap across tag types. Default weights: skills 3, interests 2, career goals 2, hobbies 1, department bonus 1, same-year bonus 0.5, availability overlap up to 1. Score is normalised 0–100. Formula and weights live in a single pure function shared by client and server (`packages/shared/matching.ts`) with unit tests. | M |
| MAT-2 | **Explainability:** every match card lists the shared tags grouped by type ("3 shared skills · 2 interests · same department"). | M |
| MAT-3 | **Match feed** on `/discover?tab=people`: computed client-side over a candidate pool (visible profiles, excluding blocked/connected/already-rejected), sorted by score, paginated 20 at a time. The Node service can precompute `matchCache/{uid}` nightly or on profile change; client uses cache when present, else computes live. | M |
| MAT-4 | Filters: department, year, tag category, minimum score; persisted in URL params. | M |
| MAT-5 | **Connection flow:** Connect → `connectionRequests` (pending) → recipient Accept/Decline. Accept creates a `connections` doc (both uids) and a DM thread. Declined requests are hidden from the feed for 30 days. Sender can withdraw. | M |
| MAT-6 | "Not interested" (skip) hides a profile from the feed for the current user. | S |

**AC:** Two seeded users with identical tags score ≥ 90; with no overlap score 0; explanation lists exactly the intersection.

### 4.3 Interest-based groups (spec §2.3) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| GRP-1 | Create group: name, category (tech/sports/music/arts/gaming/reading/wellness/other), description, cover colour or image, visibility (public / approval required). | M |
| GRP-2 | Discovery page: search by name, filter by category, sort by members/newest; card shows member count and 3 avatars. | M |
| GRP-3 | Group page: About, Members (roles: owner/mod/member), Posts feed (text + optional image, comments, reactions 👍❤️🔥 as counters), Chat tab (see MSG). | M |
| GRP-4 | Join / leave / approval queue for approval-required groups; owner can remove members and promote mods. | M |

### 4.4 Skill exchange (spec §2.4) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| SKX-1 | Uses `canTeach[]` and `wantsToLearn[]` from the profile. **Reciprocal match** = A.canTeach ∩ B.wantsToLearn ≠ ∅ **and** B.canTeach ∩ A.wantsToLearn ≠ ∅. One-directional matches are shown below with a "one-way" label. | M |
| SKX-2 | `/discover?tab=swap` lists pairings with the exact "You teach X · They teach Y" line. | M |
| SKX-3 | Propose exchange → `exchanges` doc (proposed → accepted → scheduled → completed/cancelled) with a message. | M |
| SKX-4 | Scheduling: on accept, either party proposes up to 3 slots (date + time + place/online link); the other confirms one. Confirmed slot creates a `sessions` doc and notifications for both. | M |

### 4.5 Activity discovery (spec §2.5) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| ACT-1 | Anyone creates an activity: title, description, date/time, location, tags (from taxonomy), optional capacity. | M |
| ACT-2 | Listing: upcoming first, filter by tag, chip shows attendee count; RSVP toggles `going`. | M |
| ACT-3 | Detail page: attendees list, RSVP, "Add to calendar" (.ics download), share link. | M |

### 4.6 Messaging & collaboration (spec §2.6) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| MSG-1 | 1:1 DM between users who are connected **or** where recipient's privacy allows `everyone`. Thread doc + `messages` sub-collection; Firestore `onSnapshot` gives real time. | M |
| MSG-2 | Group chat per interest group (thread `kind: 'group'`) and a chat per confirmed ride/hangout/team (thread `kind: 'context'`, `contextRef`). | M |
| MSG-3 | Message types: text, image (Storage), system (e.g., "Rohan accepted your request"). Max 2,000 chars. | M |
| MSG-4 | Unread counts per thread (`unread.{uid}` map maintained by transaction on send); read receipts at thread level (`lastReadAt.{uid}`). | M |
| MSG-5 | Optimistic send, retry on failure, offline queue via Firestore persistence. Typing indicator via RTDB presence is **C**. | S/C |
| MSG-6 | Thread list sorted by `lastMessageAt`, with avatar, snippet, unread badge. | M |

### 4.7 Hangout creator (spec §3.1) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| HNG-1 | Create: title, activity type (food / walk / study / gaming / sports / movie / other), venue, start time, member limit (2–30), visibility (public / invite-only), join mode (instant / request). | M |
| HNG-2 | Feed of upcoming hangouts with filters (type, date: today / tomorrow / this week). | M |
| HNG-3 | Join: instant adds member; request → creator approves. Counter uses a transaction; when `members == limit` status becomes `full` and join disabled. Auto-`closed` when start time passes (client-side derived + scheduled job optional). | M |
| HNG-4 | Invite-only: creator shares a link with `inviteCode`; hangout hidden from the feed. | M |
| HNG-5 | Each hangout gets a context chat thread on creation. | M |

### 4.8 Campus events (spec §3.2) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| EVT-1 | Create event: category (movie night / karaoke / jamming / sports / talk / workshop / other), title, description, venue, start/end, capacity, organiser (self or a group/community you admin), cover image optional. | M |
| EVT-2 | Listing with category filters + **calendar view** (month grid, dots per day, tap → that day's list). | M |
| EVT-3 | RSVP with **waitlist**: when `going >= capacity`, RSVP goes to `waitlisted` with position; cancellations promote the first waitlisted person (transaction) and notify them. | M |
| EVT-4 | Organiser updates/announcements: `updates` sub-collection; posting fans out a notification to all `going` + `waitlisted`. | M |

### 4.9 Car & auto pooling (spec §3.3) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| RID-1 | Post a ride (verified only): from, to (preset places: Campus Gate, Mangalagiri station, Vijayawada station, Guntur, Airport, + custom), date/time, vehicle (car / auto / cab-share / bike), seats, note (cost split). | M |
| RID-2 | Browse/search by route and date; sort by departure. | M |
| RID-3 | Request to join → driver approves/declines; seat counter by transaction; status `open → full → departed → completed / cancelled`. | M |
| RID-4 | On approval: context chat thread created (or member added), contact reveal (phone if the user opted in). | M |
| RID-5 | Ride history under Me → "My rides" (as driver / as passenger). | M |

### 4.10 Errand & shopping assistance (spec §3.4) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| ERR-1 | "I'm going to [city] on [date]" trip post (verified only): city (Vijayawada / Mangalagiri / Guntur / other), date, return time, max items, note. | M |
| ERR-2 | Item request attached to a trip: item, quantity, approx. cost, where to buy, note. | M |
| ERR-3 | Traveller accepts/declines each request; status pipeline `requested → accepted → picked_up → delivered` (only traveller advances; requester can cancel before `picked_up`). | M |
| ERR-4 | Reimbursement note field visible to both; platform shows a fixed disclaimer that it does not process payments. | M |

### 4.11 Accessibility volunteering (spec §3.5) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| VOL-1 | Volunteer application: courses/subjects (taxonomy), languages, availability, optional certificate upload → `applications` (kind `volunteer`) → admin approval → `volunteer` role. | M |
| VOL-2 | Support request (verified only): requirement type (scribe / note-taking / mobility assistance / reader / other), course, exam/session date & time, venue, extra needs. | M |
| VOL-3 | Matching: only **approved** volunteers whose subjects include the course and whose availability covers the slot; ranked by overlap; requester picks one or lets admin assign. | M |
| VOL-4 | Volunteer accepts → status `confirmed`; both get confirmation notification and a reminder 24 h + 2 h before (scheduled job in Node service; falls back to "on app open" reminder if service unavailable). | M |
| VOL-5 | Requests are private: visible only to requester, matched volunteers, and admins (rules-enforced). | M |

### 4.12 Project / hackathon team finder (spec §3.6) — Must / Medium

| ID | Requirement | Pri |
|---|---|---|
| TEM-1 | Post listing: project/hackathon name, description, roles needed (role + skill tags + count), team size, deadline, links. | M |
| TEM-2 | Browse open listings; filter by skill/role; sort by deadline. | M |
| TEM-3 | Apply with pitch (≤ 500 chars) and chosen role; applicant's profile tags shown to owner inline (spec "optional" — we do it). | M |
| TEM-4 | Owner accepts/rejects; accepted → member; when all roles filled or owner closes → `filled`/`closed`. Team gets a context chat. | M |

### 4.13 Communities (spec §3.7) — Must / High

| ID | Requirement | Pri |
|---|---|---|
| COM-1 | Request a community (verified only): name, purpose, category, proposed rules → `communityRequests` → admin queue. Approve creates the community with requester as `communityAdmin`. Reject requires a reason (notified). | M |
| COM-2 | Community page: header, About, Feed (posts with text/image, comments, reactions), Polls, Members, Channels (C). | M |
| COM-3 | Polls: question, 2–6 options, single or multiple choice, optional close time, anonymous or not; one vote doc per user (`polls/{id}/votes/{uid}`), counts maintained by transaction; results bar view after voting or close. | M |
| COM-4 | Membership: join (public) or request (approval), leave; roles owner / moderator / member; mods can pin/delete posts, remove members. | M |
| COM-5 | Channels (sub-groups): named sub-feeds within a community. | C |

### 4.14 Peer tutoring marketplace (spec §3.8) — Must / High

| ID | Requirement | Pri |
|---|---|---|
| TUT-1 | Tutor application (verified, year ≥ 2): skills taught (taxonomy), bio, hourly rate (₹), proof uploads (grades / certificates, Storage) → admin approval → `tutor` role + `tutors/{uid}` profile. | M |
| TUT-2 | Tutor profile: bio, skills, rate, rating avg + count, reviews list, **weekly availability slots** (recurring; e.g. Tue 18:00–19:00) and blackout dates. | M |
| TUT-3 | Marketplace listing: filter by skill, max rate, min rating; sort by rating / price. | M |
| TUT-4 | Booking: pick a concrete date-slot generated from recurring availability minus existing bookings → **mock payment** step (summary + "Pay ₹X" button that just marks `paid: mock`) → booking `confirmed`. Double-booking prevented by transaction on `tutors/{uid}/slots/{dateSlotId}`. | M |
| TUT-5 | Notifications: confirmation to both, reminder 24 h / 2 h (same job as VOL-4). Cancel up to 2 h before. | M |
| TUT-6 | Session history for both sides; after `completed`, the student can leave one review (1–5 + text) which updates tutor aggregates transactionally. | M |

### 4.15 Notifications (spec §4) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| NOT-1 | `users/{uid}/notifications` sub-collection; each has `type`, `title`, `body`, `link`, `read`, `createdAt`. Written by whichever client performs the triggering action (fan-out helper) or by the Node service for reminders. | M |
| NOT-2 | Bell with unread count (live), list page with mark-all-read, tap navigates to `link`. | M |
| NOT-3 | Types covered: connection request/accepted, new message (only if thread not open), group/community join approved, post comment/reaction on my post, hangout/ride/team request & decision, event update & waitlist promotion, booking confirmed/reminder, application approved/rejected, community request decision, report resolved. | M |
| NOT-4 | Web push via FCM for installed PWA (Android; iOS 16.4+ when installed) — optional toggle in settings. | C |

### 4.16 Global search (spec §4) — Must / Low

| ID | Requirement | Pri |
|---|---|---|
| SRC-1 | Single search box → results grouped by entity: People, Groups, Communities, Activities, Hangouts, Events, Teams, Rides. | M |
| SRC-2 | Implementation: each searchable doc stores `searchTokens[]` (lower-cased name/title words + tags + department + prefixes ≥ 3 chars). Query uses `array-contains-any` on up to 10 tokens per collection, merged client-side, ranked by number of token hits. Good enough for campus scale; no third-party search service. | M |
| SRC-3 | Respects privacy (`hidden from search` users excluded) and block lists. | M |

### 4.17 Home dashboard (spec §4) — Must

| ID | Requirement | Pri |
|---|---|---|
| HOM-1 | Sections in order: verification banner (if needed) → "Top matches for you" (3 cards, link to Discover) → "Today & tomorrow" (my RSVPs/joins + upcoming public hangouts/events) → "From your communities" (latest posts) → "Modules" grid (all 12 modules as icon tiles). | M |
| HOM-2 | Every section has an empty state with one clear CTA. | M |

### 4.18 Admin & moderation (spec §4, Should) — Should / Medium

| ID | Requirement | Pri |
|---|---|---|
| ADM-1 | Admin panel at `/admin` (route guard + rules): tabs — Tutor applications · Volunteer applications · Community requests · Reports · Users. | S |
| ADM-2 | Approve/reject with note → writes decision, updates role via Node service (custom claims), notifies user. | S |
| ADM-3 | Reports queue: view target, reporter, reason; actions: dismiss, warn (notification), hide content, suspend user (`suspended: true` blocks login via rules). | S |
| ADM-4 | Users tab: search, view roles, grant/revoke `admin`. | S |

---

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Responsive | Mobile-first (360 px min). Bottom tab bar ≤ 1023 px; sidebar ≥ 1024 px. All tap targets ≥ 44 px. |
| PWA | Web manifest (name, short_name "frisbee", `display: standalone`, theme `#FF5A1F`, background `#F4F5F7`, 192/512 any + maskable icons, screenshots), service worker with precache of the app shell + runtime cache for images. Android: capture `beforeinstallprompt`, show our own "Install" button. iOS: detect Safari-not-standalone and show a one-time "Add to Home Screen" sheet with the Share → Add steps; `apple-touch-icon` 180 px and `apple-mobile-web-app-*` meta tags. Shows an offline page for navigation failures. |
| Performance | Route-level code splitting; first load JS ≤ 250 kB gzip; images lazy; Firestore listeners scoped and unsubscribed on unmount; lists paginated (20). |
| Security | Firestore & Storage rules deny by default; every write validated (owner, shape, sizes); role checks via custom claims; Node endpoints verify Firebase ID tokens; rate-limits on write-heavy endpoints; no secrets in the client. |
| Accessibility | Semantic HTML, labelled inputs, focus rings visible, colour contrast ≥ 4.5:1 for text (see design system), reduced-motion respected, keyboard operable dialogs. |
| Reliability | Firestore offline persistence enabled; optimistic UI with rollback; error boundary per route with retry. |
| Observability | Console-free production build; basic client error logging to `clientErrors` collection (S). |
| Data privacy | Phone numbers only revealed to confirmed ride/errand counterparts; accessibility requests private; block lists hidden. Delete-account action (S). |

---

## 6. Data model (Firestore)

Conventions: server timestamps; denormalised display fields (`authorName`, `authorPhoto`) on posts/messages to avoid N+1 reads; counters maintained with transactions or `increment()`; `searchTokens[]` on searchable docs; `createdBy` on everything user-generated.

```
users/{uid}
  displayName, photoURL, email, emailDomain, department, year(1-4/5), bio,
  roles: { verifiedStudent, tutor, volunteer, admin }        // mirrored into custom claims
  skills: [{ tag, level:1|2|3 }], canTeach:[tag], wantsToLearn:[tag],
  interests:[tag], hobbies:[tag], careerGoals:[tag],
  availability: { mon:['morning','evening'], ... },
  privacy: { profile:'everyone'|'connections'|'hidden', messages:'everyone'|'connections', requests:'everyone'|'nobody', showAvailability:bool },
  phone?, showPhoneToMatches:bool, profileComplete:bool, suspended:bool,
  stats: { connections, groups }, searchTokens[], createdAt, updatedAt
  /notifications/{id}      type, title, body, link, read, createdAt
  /blocks/{blockedUid}     createdAt
  /hiddenMatches/{uid}     until

connectionRequests/{id}   from, to, message?, status:'pending'|'accepted'|'declined'|'withdrawn', createdAt, respondedAt
connections/{pairId}      uids:[a,b] (sorted), since        // pairId = `${a}_${b}` sorted
matchCache/{uid}          computedAt, items:[{ uid, score, shared:{skills[],interests[],...} }]

threads/{id}              kind:'dm'|'group'|'context', members:[uid], memberInfo:{uid:{name,photo}},
                          contextRef?:{ collection, id, title }, lastMessage:{ text, senderId, at }, unread:{uid:n}, lastReadAt:{uid:ts}
  /messages/{id}          senderId, type:'text'|'image'|'system', text?, imageURL?, createdAt

groups/{id}               name, category, description, coverColor|coverURL, visibility, ownerId, mods:[uid], memberCount, threadId, searchTokens[], createdAt
  /members/{uid}          role:'owner'|'mod'|'member', joinedAt
  /joinRequests/{uid}     message, createdAt
  /posts/{postId}         authorId, authorName, authorPhoto, text, imageURL?, reactions:{like,heart,fire}, commentCount, pinned, createdAt
     /comments/{id}       authorId, authorName, text, createdAt
     /reactions/{uid}     kind

communities/{id}          (same shape as groups) + category, rules, channelIds:[...]
  /members, /joinRequests, /posts (+comments/reactions) as above
  /polls/{pollId}         question, options:[{id,text,count}], multi:bool, anonymous:bool, closesAt?, totalVotes, createdBy, createdAt
     /votes/{uid}         optionIds:[...], createdAt
  /channels/{channelId}   name, description  (C)
communityRequests/{id}    name, purpose, category, rules, requesterId, status:'pending'|'approved'|'rejected', reviewerId?, note?, createdAt, decidedAt

exchanges/{id}            aId, bId, aTeaches:[tag], bTeaches:[tag], status:'proposed'|'accepted'|'scheduled'|'completed'|'cancelled', message, proposedSlots:[{start,end,place}], confirmedSlot?, createdAt
sessions/{id}             kind:'exchange'|'tutoring'|'support', refId, participants:[uid], start, end, place|link, status, remindersSent:{h24,h2}

activities/{id}           title, description, start, location, tags[], capacity?, goingCount, createdBy, searchTokens[], createdAt
  /rsvps/{uid}            status:'going', createdAt

hangouts/{id}             title, type, venue, start, limit, memberCount, visibility:'public'|'invite', joinMode:'instant'|'request', inviteCode?, status:'open'|'full'|'closed'|'cancelled', createdBy, threadId, searchTokens[]
  /members/{uid}, /requests/{uid}

events/{id}               category, title, description, venue, start, end, capacity, goingCount, waitlistCount, organiser:{type:'user'|'group'|'community', id, name}, coverURL?, createdBy, searchTokens[]
  /rsvps/{uid}            status:'going'|'waitlisted', position?, createdAt
  /updates/{id}           text, createdAt, createdBy

rides/{id}                from, to, start, vehicle, seats, seatsTaken, note, status, driverId, threadId, searchTokens[]
  /requests/{uid}         status:'pending'|'approved'|'declined', message, createdAt
  /passengers/{uid}       joinedAt

trips/{id}                city, date, returnTime, maxItems, note, travellerId, status:'open'|'closed'|'done'
  /items/{id}             requesterId, item, qty, approxCost, where, note, status:'requested'|'accepted'|'declined'|'picked_up'|'delivered'|'cancelled', updatedAt

teams/{id}                name, description, roles:[{id, title, skills[], count, filled}], teamSize, deadline, links[], ownerId, status:'open'|'filled'|'closed', threadId, searchTokens[]
  /applications/{uid}     roleId, pitch, status:'pending'|'accepted'|'rejected', createdAt
  /members/{uid}          roleId, joinedAt

applications/{id}         kind:'tutor'|'volunteer', uid, payload:{...}, proofURLs[], status, reviewerId?, note?, createdAt, decidedAt
tutors/{uid}              bio, skills[], hourlyRate, ratingAvg, ratingCount, availability:[{dow, start, end}], blackoutDates[], active
  /slots/{dateSlotId}     bookingId, start, end                 // existence = taken (dateSlotId = YYYY-MM-DD_HHmm)
  /reviews/{bookingId}    studentId, rating, text, createdAt
bookings/{id}             tutorId, studentId, start, end, rate, status:'pending_payment'|'confirmed'|'completed'|'cancelled', payment:{mode:'mock', paidAt}, reviewed:bool, createdAt

volunteers/{uid}          subjects[], languages[], availability, active
supportRequests/{id}      requesterId, type, course, start, end, venue, notes, status:'open'|'matched'|'confirmed'|'completed'|'cancelled', candidateIds[], volunteerId?, createdAt

reports/{id}              reporterId, target:{collection,id,ownerId}, reason, details, status:'open'|'dismissed'|'actioned', action?, reviewerId?, createdAt
taxonomy/{version}        skills[], interests[], hobbies[], careerGoals[], departments[], courses[]   (read-only, seeded)
```

**Composite indexes needed (create on first error link or via `firestore.indexes.json`):** hangouts(status, start), events(category, start), rides(from, to, start), teams(status, deadline), bookings(tutorId, start), bookings(studentId, start), threads(members array-contains, lastMessage.at desc), notifications(read, createdAt desc), `*`(searchTokens array-contains-any, createdAt desc) per searchable collection.

---

## 7. Key flows (sequence summaries)

1. **Sign-up → verified:** create account → send verification → on return, client calls `POST /auth/refresh-claims` (Node) → service checks `emailVerified && domain === srmap.edu.in` → sets claim `verifiedStudent` → client `getIdToken(true)`; banner disappears.
2. **Match → connect → chat:** Discover loads candidates (≤ 200 visible users, cached 10 min) → score locally → Connect → recipient notified → Accept → `connections` + DM `thread` created in a batch → Message button opens thread.
3. **Event RSVP with waitlist:** transaction reads event, if `goingCount < capacity` → rsvp `going`, else `waitlisted` with `position = waitlistCount + 1`; cancellation transaction decrements and promotes the earliest waitlisted rsvp; both notified.
4. **Tutor booking:** pick slot → `runTransaction`: assert `tutors/{id}/slots/{slotId}` missing → create slot + booking `pending_payment` → mock payment screen → update booking `confirmed`, `payment.mode='mock'` → notifications + `sessions` doc for reminders.
5. **Community request:** verified student submits → admin panel lists pending → approve → batch: create `communities/{id}`, member (owner), thread, notification; reject → status + note + notification.
6. **Accessibility support:** request created → client queries `volunteers` where `subjects array-contains course` and `active` → filters by availability → shows ranked candidates → requester "Ask" → volunteer notified → accepts → `confirmed` + `sessions` doc → reminders.

---

## 8. Hackathon build plan (suggested, 4 people)

| Phase | Deliverable |
|---|---|
| **P0 — Foundation (first ~20 %)** | Repo, design tokens, UI kit (Button, Input, Card, Chip, Tabs, Sheet, Dialog, EmptyState, Skeleton), routing + guards, Firebase init, auth screens, onboarding, taxonomy seed, PWA shell. |
| **P1 — Core loop (~30 %)** | Profiles, matching + explanation, connections, DM chat, notifications, home dashboard, global search. |
| **P2 — Gatherings (~25 %)** | Groups (+posts, chat), Hangouts, Activities, Events (+waitlist, calendar), Communities (+polls, request queue). |
| **P3 — Logistics (~15 %)** | Rides, Errands, Teams, Skill exchange scheduling. |
| **P4 — Verified services (~10 %)** | Tutor + volunteer applications, tutoring booking + mock pay + reviews, support request matching, reminders job, admin panel. |
| **Polish (continuous)** | Seed data (60 users, all modules populated), empty/loading/error states, Lighthouse, install flows on a real Android and iPhone, demo script. |

**Team split suggestion:** (A) UI kit + auth/onboarding/profile/home; (B) matching/discover/messaging/notifications/search; (C) groups/communities/events/hangouts/activities; (D) rides/errands/teams/tutoring/support + Node service + admin + rules + seeding. Everyone owns PWA/QA in the last stretch.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Firestore rules blocking legitimate writes late in the build | Write rules alongside each module; run the Emulator Suite locally; rules unit tests for the 6 riskiest paths (roles, privacy, counters). |
| Real-time chat cost/perf | Scope listeners to open thread + thread list; limit 50 last messages then paginate. |
| Node service cold start (Render free tier sleeps after 15 min; 30–60 s wake) | Nothing on the critical path depends on it; claims refresh falls back to reading `users/{uid}.roles` (rules also check the doc for read paths); ping the service 5 min before the demo. |
| iOS install confusion | Dedicated install sheet with the two-step instructions and detection of standalone mode; test on a real iPhone (Safari only, not Chrome iOS). |
| Scope (18 modules) | Shared list/detail/form patterns; one generic `useCollectionQuery` hook; identical card component across modules; cut C items first, then S. |
| "Looks AI-generated" | Follow the design system strictly: one accent per screen, real content density, no gradients/blur, consistent 8-pt spacing, real copy written by the team. |

---

## 10. Glossary
- **Tag / taxonomy** — controlled vocabulary of skills/interests/etc. stored in `taxonomy/v1`; users only pick from it.
- **Context chat** — a thread automatically attached to a hangout/ride/team so participants can coordinate.
- **Verified** — `verifiedStudent` claim (college email verified).
- **Mock payment** — a UI step that records `payment.mode = 'mock'`; no money moves.
