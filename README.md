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
scripts/         doctor.mjs — checks your local + cloud config and tells you what to fix
docs/            01 PRD · 02 tech stack · 03 Firebase setup · 04 UI design system · 05 pitch stats · 06 deployment
design/          Style tile, pitch slides, icon assets
```

## Run it locally

Requirements: Node 22 LTS (20.19+ works), pnpm 10 (`corepack enable`), Java 21+ only if you want the Firestore emulator. All commands work in PowerShell, cmd and bash.

```bash
pnpm install
copy apps\web\.env.example apps\web\.env.local        # (cp on macOS/Linux) fill in the Firebase web config + Cloudinary cloud name
copy apps\server\.env.example apps\server\.env        # only needed for the API / live seeding
pnpm doctor                                            # verifies Node, pnpm, Java, env files, Firebase key, Cloudinary preset

pnpm emulators            # Auth :9099, Firestore :8081, UI :4000   (terminal 1)
pnpm seed:emulator        # demo accounts + data into the emulator  (once per emulator start)
pnpm dev                  # web app on http://localhost:5173        (terminal 2)
pnpm dev:server:emulator  # API on :8787, proxied under /api        (terminal 3, optional)
```

`VITE_USE_EMULATORS=true` in `apps/web/.env.local` → the app uses the local emulators; `false` → the live Firebase project (`pnpm dev` + `pnpm dev:server`). In emulator mode the dev server proxies the emulators through its own origin, so the app also works from a phone on the same Wi-Fi.

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
pnpm doctor           # environment + Firebase + Cloudinary configuration check
pnpm typecheck        # tsc across all packages
pnpm lint             # eslint (react-hooks, react-refresh, typescript-eslint)
pnpm test             # shared package unit tests
pnpm test:rules       # security rules against the emulator
pnpm build            # production build of apps/web (PWA precache generated)
```

## Deploy

Full step-by-step guide (Windows-friendly, with every console click): **[docs/06-Deployment-Guide.md](docs/06-Deployment-Guide.md)**. Short version:

1. **Firebase**: enable Email/Password (+ Google) sign-in, create Firestore, `firebase login` then `pnpm deploy:rules`, add your Vercel domain under Authentication → Settings → Authorized domains, download a service-account key.
2. **Cloudinary**: Settings → API keys → copy the *cloud name*; Settings → Upload → Upload presets → add `frisbee_unsigned` with Signing mode **Unsigned**.
3. **Vercel**: import the GitHub repo, keep Root Directory = repo root (`vercel.json` supplies build command, output dir and SPA rewrite), Node.js 22.x, add every `VITE_*` variable from `apps/web/.env.example` with `VITE_USE_EMULATORS=false`, deploy.
4. **Render** (API): New → Blueprint → the repo (`render.yaml`); paste `FIREBASE_SERVICE_ACCOUNT` (from `pnpm --filter @frisbee/server encode-service-account <file.json>`), `ALLOWED_ORIGINS`, Cloudinary keys. Put its URL in Vercel as `VITE_API_URL` and redeploy. Optional external cron → `POST /api/cron/reminders?key=<CRON_KEY>` every 15 min.
5. **Seed the live project**: `pnpm seed` with `apps/server/.env` pointing at the service-account JSON.

The web app degrades gracefully: without `VITE_API_URL` the claim refresh is skipped (rules fall back to the user document), without a Cloudinary cloud name photo uploads are disabled with a visible note, and a missing Firebase variable shows a "not configured" page naming the variable instead of a blank screen.

## Conventions

- Data access lives only in `features/<module>/api.ts`; pages never touch Firestore directly.
- Queries are index-free where possible (equality filters or a single `orderBy`, sort client-side); the four composite indexes needed are in `firestore.indexes.json`.
- Participation is denormalised as id arrays (`memberIds`, `passengerIds`, `requesterIds`) so "things I'm in" is one `array-contains` query and one rule.
- Roles are flags on `users/{uid}.roles`, mirrored to custom claims by `POST /api/auth/refresh-claims`; rules accept either.
- Design tokens are in `apps/web/src/styles/index.css` (`@theme`). Orange = primary action, teal = verified/status. No gradients, no glass.
