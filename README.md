# frisbee

Campus skill & interest-based friend finder for SRM AP. Built by **team Hello World** for the hackathon.

Installable web app (Android + iOS), one codebase: React 19 + TypeScript + Tailwind v4 on the front, Firebase Auth + Firestore for data, a thin Node/Express service for the few things that need admin credentials (custom claims, Cloudinary deletes, reminders), Cloudinary for images. Everything runs on free tiers.

## Repository layout

```
apps/web         Vite + React PWA (the product)
apps/server      Express 5 + firebase-admin service (:8787) + demo seed script
packages/shared  Types, zod schemas, tag taxonomy, matching + search helpers (used by both)
firestore.rules  Security rules — the real authorisation layer
tests/rules      Rules tests (vitest + @firebase/rules-unit-testing, 26 tests)
docs/            01 PRD · 02 tech stack · 03 Firebase setup · 04 UI design system · 05 pitch stats
design/          Style tile, pitch slides, icon assets
```

## Run it locally

Requirements: Node ≥ 20.19, pnpm 10 (via `corepack enable`), Java ≥ 21 for the Firestore emulator.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local      # fill in the Firebase web config
cp apps/server/.env.example apps/server/.env      # fill in Cloudinary + service account

pnpm emulators            # Auth :9099, Firestore :8081, UI :4000   (terminal 1)
pnpm seed:emulator        # demo accounts + data into the emulator  (once)
pnpm dev                  # web app on http://localhost:5173        (terminal 2)
pnpm dev:server           # API on :8787, proxied under /api        (terminal 3, optional)
```

Set `VITE_USE_EMULATORS=true` in `apps/web/.env.local` to use the emulators, `false` to hit the live Firebase project. In emulator mode the dev server proxies the emulators through its own origin, so the app also works from a phone on the same network.

### Demo accounts (password `frisbee-demo`)

| Email | Who |
| --- | --- |
| `judge1@srmap.edu.in` | Verified student — start here |
| `meera.tutor@srmap.edu.in` | Verified tutor with reviews and open slots |
| `sana.s@srmap.edu.in` | Verified accessibility volunteer |
| `admin@srmap.edu.in` | Platform admin — approvals, reports, roles |
| `guest@gmail.com` | Personal-email account (sees the verified-only gates) |
| `arjun.r@ / dev.p@ / priya.i@ / rohan.d@srmap.edu.in` | Other students with rides, teams, groups, communities |

## Checks

```bash
pnpm typecheck        # tsc across all packages
pnpm lint             # eslint (react-hooks, react-refresh, typescript-eslint)
pnpm test             # shared package unit tests
pnpm test:rules       # security rules against the emulator
pnpm build            # production build of apps/web (PWA precache generated)
```

## Deploy

- **Firestore rules + indexes**: `firebase login && pnpm deploy:rules` (deploys `firestore.rules` and `firestore.indexes.json` to `frisbee-9fcfb`).
- **Web** → Vercel: import the repo, `vercel.json` already sets the pnpm install/build commands, output dir and SPA rewrite. Add the `VITE_*` env vars from `apps/web/.env.example` (with `VITE_USE_EMULATORS=false`).
- **API** → Render: `render.yaml` blueprint (free plan). Set `FIREBASE_SERVICE_ACCOUNT` (base64 of the service-account JSON), `ALLOWED_ORIGINS` (the Vercel URL), Cloudinary vars. Point an external cron (e.g. cron-job.org) at `POST /api/cron/reminders?key=<CRON_KEY>` every 15 minutes for session reminders.
- **Cloudinary**: create an unsigned upload preset named `frisbee_unsigned` (folder `frisbee`, image-only, ≤ 5 MB) and put the cloud name in both env files.
- **Seed the live project**: `pnpm seed` with `GOOGLE_APPLICATION_CREDENTIALS` pointing at the service-account JSON.

## Conventions

- Data access lives only in `features/<module>/api.ts`; pages never touch Firestore directly.
- Queries are index-free where possible (equality filters or a single `orderBy`, sort client-side); the four composite indexes needed are in `firestore.indexes.json`.
- Participation is denormalised as id arrays (`memberIds`, `passengerIds`, `requesterIds`) so "things I'm in" is one `array-contains` query and one rule.
- Roles are flags on `users/{uid}.roles`, mirrored to custom claims by `POST /api/auth/refresh-claims`; rules accept either.
- Design tokens are in `apps/web/src/styles/index.css` (`@theme`). Orange = primary action, teal = verified/status. No gradients, no glass.
