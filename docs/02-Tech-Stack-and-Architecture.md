# frisbee — Tech Stack & Architecture (final)

This is the locked stack. Anything not listed here needs a team decision before it is added — the fastest way to look "vibe coded" is a `package.json` with 40 dependencies nobody can explain.

---

## 1. Stack at a glance

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Language | **TypeScript 5.x** (strict) | Typed Firestore models across 18 modules; shared types between web and server. |
| Build | **Vite 7** + `@vitejs/plugin-react` | Fast HMR, first-class PWA plugin, trivial Vercel deploy. (Next.js rejected: SSR buys nothing for an auth-walled app and complicates the service worker.) |
| UI | **React 19** | Spec requirement. Function components + hooks only. |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite`, design tokens in a single `@theme` block in `src/styles/index.css` | Spec requirement. v4 = no `tailwind.config.js`, tokens live in CSS. |
| Icons | **lucide-react** | Spec requirement. Single icon family, 1.5 px stroke, sizes 16/20/24 only. |
| Routing | **react-router v7** (library mode, `createBrowserRouter`, lazy routes) | Code splitting per route; loaders not used (Firestore listeners live in hooks). |
| Server state | **TanStack Query v5** for one-shot reads + Node calls; **custom `useCollection`/`useDoc` hooks** wrapping `onSnapshot` for live data | Query cache for lists that don't need realtime; snapshots where realtime matters (chat, notifications, counters). |
| Client state | React context for auth/user/toasts only; **no Redux/Zustand** | Almost all state is server state. |
| Forms | **react-hook-form** + **zod** | Same zod schemas validate the form, the Firestore write helper and (where used) the Node endpoint. |
| Dates | **date-fns** (+ `date-fns-tz` if needed) | Tree-shakeable; `Asia/Kolkata` fixed. |
| Auth | **Firebase Authentication** (email/password + Google) with **custom claims** for roles | Spec requirement. |
| Database | **Cloud Firestore** (Native mode, `asia-south1` Mumbai) | Spec requirement; realtime listeners give us chat & notifications for free. |
| Realtime chat | **Firestore `onSnapshot`** (not Socket.io, not RTDB) | One database, one rules language, works offline, no server on the hot path. RTDB only if we add presence/typing (C priority). |
| Files | **Firebase Storage** (Blaze plan, free quotas) | Profile photos, post images, proof documents. |
| Server | **Node 22 + Express 5 + firebase-admin** (TypeScript, `tsx` for dev, `tsc` for build) | Spec requirement ("Node.js backend"). Kept thin on purpose — see §3. |
| Push (optional) | Firebase Cloud Messaging | C priority; only if time remains. |
| Hosting | **Vercel** (web) + **Render** (Node service) | Spec suggestion; both free. Vercel `rewrites` → SPA fallback. |
| Tooling | pnpm workspaces, ESLint (flat config, `typescript-eslint`, `react-hooks`), Prettier, Vitest, Firebase Emulator Suite | Standard; nothing exotic. |

**Not used, deliberately:** shadcn/ui or any component library (we write ~12 primitives ourselves — smaller, consistent, and judges can read them), Framer Motion (CSS transitions are enough), Redux, Socket.io, Algolia, Prisma/SQL, Next.js, Storybook.

---

## 2. Repository layout (pnpm monorepo)

```
frisbee/
├── package.json                 # workspaces + root scripts (dev, lint, test, build)
├── pnpm-workspace.yaml
├── .editorconfig  .prettierrc  eslint.config.js  tsconfig.base.json
├── firebase.json  .firebaserc  firestore.rules  firestore.indexes.json  storage.rules
├── docs/                        # this folder
├── design/                      # style tile, tokens, assets
├── packages/
│   └── shared/                  # code used by BOTH web and server
│       ├── src/types.ts         # Firestore document types (User, Thread, Event, …)
│       ├── src/schemas.ts       # zod schemas (create/update payloads)
│       ├── src/matching.ts      # pure scoring function + explanation builder
│       ├── src/taxonomy.ts      # canonical tag list (also seeded to Firestore)
│       ├── src/search.ts        # tokenize() for searchTokens
│       └── src/constants.ts     # places, categories, roles, limits
├── apps/
│   ├── web/                     # Vite + React PWA
│   │   ├── index.html
│   │   ├── vite.config.ts       # react(), tailwindcss(), VitePWA()
│   │   ├── public/              # icons, apple-touch-icon, robots.txt, offline.html
│   │   └── src/
│   │       ├── main.tsx  app.tsx  router.tsx
│   │       ├── styles/index.css           # @import "tailwindcss"; @theme { tokens }
│   │       ├── lib/firebase.ts            # initializeApp, getAuth, getFirestore(persistence), getStorage
│   │       ├── lib/api.ts                 # fetch wrapper for the Node service (adds ID token)
│   │       ├── lib/firestore/             # typed converters + query builders per collection
│   │       ├── hooks/                     # useAuth, useCollection, useDoc, useInstallPrompt, useMediaQuery
│   │       ├── components/ui/             # Button, Input, Select, Textarea, Chip, Card, Tabs, Sheet, Dialog,
│   │       │                              # Avatar, Badge, EmptyState, Skeleton, Toast, PageHeader
│   │       ├── components/layout/         # AppShell, BottomTabs, Sidebar, TopBar
│   │       ├── features/                  # one folder per module (see below)
│   │       └── pages/                     # thin route components composing features
│   └── server/                  # Express service
│       ├── src/index.ts                   # app bootstrap, CORS, health
│       ├── src/middleware/auth.ts         # verifyIdToken → req.user
│       ├── src/routes/                    # auth.ts, admin.ts, matching.ts, reminders.ts, seed.ts
│       ├── src/jobs/reminders.ts          # runs every 15 min (node-cron)
│       └── src/lib/admin.ts               # firebase-admin init
└── scripts/
    └── seed.ts                  # seeds taxonomy + demo users/content (run with service account)
```

**`features/` folders (one per module, identical internal shape):**
`auth`, `onboarding`, `profile`, `matching`, `connections`, `messaging`, `notifications`, `search`, `groups`, `communities`, `activities`, `hangouts`, `events`, `rides`, `errands`, `teams`, `exchange`, `tutoring`, `support`, `admin`, `pwa`.
Each contains `api.ts` (Firestore reads/writes for that module), `hooks.ts`, `components/`, and optionally `schemas.ts` re-exporting from shared. Pages import from features; features never import from pages.

---

## 3. Architecture

```
┌──────────────────────────────┐        ┌─────────────────────────────┐
│  React PWA (Vercel)          │        │  Firebase project           │
│  • Auth UI                   │◄──────►│  Auth (email/pw, Google)    │
│  • Firestore SDK (realtime,  │        │  Firestore (asia-south1)    │
│    offline persistence)      │        │  Storage                    │
│  • Storage SDK               │        │  Security Rules             │
│  • Service worker (Workbox)  │        └──────────────▲──────────────┘
└──────────────┬───────────────┘                       │ firebase-admin
               │ HTTPS + Firebase ID token             │
               ▼                                       │
┌──────────────────────────────┐                       │
│  Node service (Render)       │───────────────────────┘
│  POST /auth/refresh-claims   │  sets verifiedStudent claim after email verification
│  POST /admin/applications/:id/decide   approve/reject tutor & volunteer (sets claims)
│  POST /admin/community-requests/:id/decide
│  POST /admin/users/:uid/roles          grant/revoke admin
│  POST /matching/recompute              writes matchCache/{uid}
│  GET  /health                          keep-alive ping
│  cron: reminders every 15 min          24 h / 2 h notifications for sessions
│  cron: close expired hangouts/rides    status hygiene
└──────────────────────────────┘
```

### 3.1 What runs where (the rule)
- **Client writes directly to Firestore** for everything a user does to their own data or to shared objects where the rules can express the permission (posts, RSVPs, join requests, messages, bookings via transactions, notifications fan-out to others).
- **Node service** only for things the client must not be trusted with: setting custom claims, admin decisions (need audit + claims), scheduled work, bulk seeding, and optional heavy matching precompute.
- **Degradation:** if the service is down, users can still do everything except: get a role change applied (queued — the admin UI shows "pending sync"), receive scheduled reminders (the app shows an in-app reminder on open instead).

### 3.2 Roles: claims + document
Roles live in two places, kept in sync by the service: `users/{uid}.roles` (for UI and for queries) and Auth custom claims (for rules). Rules check `request.auth.token.verifiedStudent == true` etc. After any claim change the client calls `user.getIdToken(true)`.

### 3.3 Realtime strategy
- `useCollection(queryRef)` → `onSnapshot` with cleanup, returns `{ data, loading, error }`. Used for: notifications, thread list, open thread messages (limit 50), counters on detail pages, admin queues.
- `useQuery` (TanStack) → one-shot `getDocs` for browse lists (discover, events list, rides list); `staleTime` 60 s; invalidated after own writes.
- Firestore persistence (`persistentLocalCache` + multi-tab) → instant re-open, offline reads, queued writes.

### 3.4 Counters & consistency
- Small counters (`goingCount`, `memberCount`, `unread`) → `increment()` inside the same `writeBatch`/transaction as the row insert.
- Capacity-bound operations (event RSVP, hangout join, ride seat, tutor slot) → `runTransaction` that re-reads the parent and asserts capacity before writing.
- Tutor rating aggregate → transaction on `tutors/{uid}` when a review is added.

### 3.5 Security rules — principles
1. Deny by default; every collection has an explicit `match`.
2. `isSignedIn()`, `isOwner(uid)`, `hasRole('admin')`, `isVerified()`, `isMember(path)` helpers.
3. Writes validate shape: required keys, string lengths, enum values, `createdBy == request.auth.uid`, timestamps are `request.time`.
4. Privacy: `users/{uid}` readable if `profile == 'everyone'` or requester is connected or self or admin; `supportRequests` readable only by requester/candidates/admins; `blocks` only by owner.
5. Storage: `/users/{uid}/avatar.jpg` (owner write, public read, ≤ 1 MB, image/*), `/posts/{postId}/*` (author write, signed-in read, ≤ 3 MB), `/applications/{uid}/*` (owner write, admin read, ≤ 5 MB, image/pdf).
6. Test with the Emulator + `@firebase/rules-unit-testing` for the role/privacy paths.

### 3.6 PWA implementation
- `vite-plugin-pwa` with `registerType: 'prompt'` (we show our own "Update available" toast), `injectRegister: 'auto'`, Workbox `generateSW`:
  - precache app shell (`index.html`, JS/CSS chunks, icons, fonts);
  - runtime: `StaleWhileRevalidate` for Storage images (`firebasestorage.googleapis.com`), `NetworkOnly` for Firestore/Auth (the SDK has its own offline layer), `NetworkFirst` for `/api/*`;
  - `navigateFallback: '/index.html'` and an `offline.html` fallback for hard failures.
- Manifest: `name: "frisbee"`, `short_name: "frisbee"`, `start_url: "/home"`, `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#FF5A1F"`, `background_color: "#F4F5F7"`, icons 192/512 (`purpose: any`) + 192/512 (`purpose: maskable`), `screenshots` (narrow + wide → richer Android install dialog), `categories: ["social","education"]`, `shortcuts` (Messages, Discover, Happening).
- `index.html`: `<meta name="theme-color" content="#FF5A1F">`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, `<meta name="apple-mobile-web-app-title" content="frisbee">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and `env(safe-area-inset-*)` padding on the bottom tab bar.
- Install UX (`features/pwa`): `useInstallPrompt()` captures `beforeinstallprompt` (Android/desktop Chromium) → "Install app" row in Me → settings and a dismissible card on Home after 2nd visit. iOS Safari detection (`/iphone|ipad/i` UA + `!navigator.standalone`) → "Add to Home Screen" sheet with the two steps and the Share glyph; shown once, re-openable from settings. Nothing shown when already `display-mode: standalone`.

### 3.7 Node service details
- Express 5, `cors` restricted to the Vercel origin(s) + localhost, `helmet`, `express-rate-limit` (60 req/min/IP), JSON body limit 100 kB.
- `authRequired` middleware: `Authorization: Bearer <idToken>` → `admin.auth().verifyIdToken()` → `req.user`. `adminRequired` additionally checks `req.user.admin === true`.
- All decisions write an `auditLog/{id}` entry (who, what, when).
- Reminders job: every 15 min, query `sessions` where `start` between now+23h45 and now+24h15 (and 1h45–2h15) with `remindersSent.h24 == false` → write notifications, flip flag.
- `GET /health` for Render + for our own "wake up before demo" ping. UptimeRobot-style pinging every 10 min is acceptable during the event.

### 3.8 Environments
| | Web env (`apps/web/.env.local`) | Server env (Render dashboard) |
|---|---|---|
| Firebase | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, (`VITE_FIREBASE_MEASUREMENT_ID` optional) | `FIREBASE_SERVICE_ACCOUNT` (base64 of the JSON) or `GOOGLE_APPLICATION_CREDENTIALS` |
| App | `VITE_API_BASE_URL` (Render URL), `VITE_COLLEGE_DOMAIN=srmap.edu.in`, `VITE_USE_EMULATORS=false` | `ALLOWED_ORIGINS`, `COLLEGE_DOMAIN`, `PORT` |

The web Firebase config values are **not secrets** (they're shipped to every browser); security comes from rules + claims. The service account JSON **is** a secret and never enters the repo.

---

## 4. Coding conventions (so the code reads like a team wrote it)

- **File names:** `kebab-case.ts(x)`; components exported as named PascalCase; one component per file; hooks `use-*.ts`.
- **No default exports** except route lazy pages.
- **Types over interfaces** for data, interfaces for props. Everything in `packages/shared/types.ts` is the contract; converters (`withConverter`) enforce it at the Firestore boundary.
- **Tailwind:** class lists ordered layout → box → typography → colour → state; extract a component when a class string is reused 3×; no `@apply` except for the base `.btn`/`.input` resets; use `cn()` (`clsx` + `tailwind-merge`) for conditional classes.
- **Data access** only via `features/<module>/api.ts`; components never call `getDocs` directly.
- **Errors:** every async action goes through `run(action, { success, failure })` toast helper; Firestore permission errors show a friendly message and log the code.
- **Copy:** sentence case everywhere, no exclamation marks in UI, no emoji in UI text (reactions are the only exception).
- **Comments:** explain *why*, not *what*; TODOs carry an owner (`// TODO(rahul): …`).
- **Commits:** conventional (`feat(events): waitlist promotion`), small, one module per PR-ish.
- **Tests:** Vitest for `matching.ts`, `search.ts`, zod schemas, and the slot generator; rules tests for 6 critical paths. No UI snapshot tests.

---

## 5. Deployment

**Web → Vercel:** import repo, root `apps/web`, framework Vite, build `pnpm -w build:web`, output `apps/web/dist`. `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` and headers `Service-Worker-Allowed: /` + long cache for `/assets/*`. Add the Vercel domain to Firebase Auth **Authorized domains**.

**Server → Render:** Web Service, root `apps/server`, build `pnpm install --frozen-lockfile && pnpm build`, start `node dist/index.js`, env vars from §3.8, health check `/health`. Free instance (sleeps after 15 min idle; wake ≈ 30–60 s) — acceptable given §3.1.

**Firebase:** `firebase deploy --only firestore:rules,firestore:indexes,storage` from CI or by hand before the demo.

---

## 6. Versions to pin at scaffold time (check `npm view <pkg> version` when we start)

react ^19 · react-dom ^19 · react-router ^7 · vite ^7 · @vitejs/plugin-react ^5 · tailwindcss ^4 · @tailwindcss/vite ^4 · vite-plugin-pwa ^1 · firebase ^12 · firebase-admin ^13 · @tanstack/react-query ^5 · react-hook-form ^7 · zod ^4 · date-fns ^4 · lucide-react latest · express ^5 · typescript ^5 · vitest ^3 · eslint ^9 · pnpm ^10 · Node 22 LTS.
