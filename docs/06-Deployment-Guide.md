# frisbee — Deployment guide (Windows · Firebase · Cloudinary · Vercel · Render)

Written September 2026 against the current consoles. Every command below is for **PowerShell on Windows** (they also work in Git Bash/macOS unless noted). Budget: about 60–75 minutes the first time, all on free tiers.

What you end up with:

| Piece | Where | URL |
|---|---|---|
| Web app (PWA) | Vercel | `https://<project>.vercel.app` |
| Auth + database + rules | Firebase (Spark, free) | project `frisbee-9fcfb` |
| Images | Cloudinary (free) | `res.cloudinary.com/<cloud-name>/…` |
| Node API (claims, deletes, reminders) | Render (free) | `https://frisbee-api.onrender.com` |

Order matters: **Part 0 → 1 → 2 → 3 → 4 → 5 → 6**. Parts 4 (Render) and 6 (cron) are optional — the app works without them, with two small features degraded (see the table at the end).

---

## Part 0 — Your laptop (15 min, once)

### 0.1 Install the tools

1. **Node.js 22 LTS** — <https://nodejs.org> → "LTS" → run the installer, keep defaults. (Node 24 also works. Node 20 is being retired by Vercel on 1 Oct 2026, so don't install it fresh.)
2. **Git** — <https://git-scm.com/download/win> → defaults.
3. **Java 21** — only needed for the local Firestore emulator. <https://adoptium.net/temurin/releases/?version=21> → Windows x64 `.msi` → tick **"Set JAVA_HOME"** and **"Add to PATH"** in the installer.
4. Close every terminal window, then open a **new** PowerShell.

### 0.2 Enable pnpm

Open PowerShell **as Administrator** (right-click → Run as administrator) — `corepack enable` writes into `C:\Program Files\nodejs`:

```powershell
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm -v        # → 10.34.5
```

If you see `pnpm.ps1 cannot be loaded because running scripts is disabled`, run once (normal PowerShell is fine):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

If Corepack itself is missing (Node 25+ stopped bundling it): `npm install -g corepack@latest` then repeat.

### 0.3 Clone and install

```powershell
cd $HOME\Documents
git clone https://github.com/<you>/frisbee.git
cd frisbee
pnpm install
```

### 0.4 Create the two env files

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
Copy-Item apps\server\.env.example apps\server\.env
```

You will fill them in during Parts 1 and 2. Then, at any point:

```powershell
pnpm doctor
```

`pnpm doctor` checks Node/pnpm/Java, both env files, that the Firebase API key is valid, that your Vercel domain is authorised in Firebase, and **performs a real 1-pixel test upload to Cloudinary** — so it tells you *precisely* which of "wrong cloud name / preset missing / preset is Signed" is your problem. Run it after every change below.

---

## Part 1 — Firebase (20 min)

Console: <https://console.firebase.google.com> → project **frisbee** (`frisbee-9fcfb`). If you haven't created it: **Add project** → name `frisbee` → Analytics optional → Create. Stay on the **Spark (free)** plan — nothing in this project needs Blaze.

### 1.1 Register the web app and copy the config

1. Gear icon (top-left, next to *Project Overview*) → **Project settings** → **General** tab.
2. Scroll to **Your apps**. If there is no web app yet: click the `</>` icon → nickname `frisbee web` → *don't* tick Firebase Hosting → **Register app**.
3. Under **SDK setup and configuration** choose **Config**. You see:

   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "frisbee-9fcfb.firebaseapp.com",
     projectId: "frisbee-9fcfb",
     storageBucket: "…",            // not used
     messagingSenderId: "990165064225",
     appId: "1:990165064225:web:…",
     measurementId: "G-…"           // optional
   };
   ```

4. Open `apps\web\.env.local` in Notepad/VS Code and copy each value across:

   ```ini
   VITE_FIREBASE_API_KEY=AIza…
   VITE_FIREBASE_AUTH_DOMAIN=frisbee-9fcfb.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=frisbee-9fcfb
   VITE_FIREBASE_MESSAGING_SENDER_ID=990165064225
   VITE_FIREBASE_APP_ID=1:990165064225:web:…
   VITE_FIREBASE_MEASUREMENT_ID=G-…
   ```

   No quotes, no spaces around `=`. These are public identifiers, not secrets — security comes from the rules you deploy in 1.4.

### 1.2 Turn on sign-in methods

1. Left menu **Build → Authentication** → **Get started** (first time only) → **Sign-in method** tab.
2. **Email/Password** → Enable → Save.
3. **Google** → Enable → pick a *Project support email* → Save. (Powers the "Continue with Google" button. If you skip it the button shows *"This sign-in method is not enabled in Firebase yet."*)
4. **Settings** tab (same page) → **User actions**: leave *Email enumeration protection* on.

### 1.3 Authorized domains — the #1 cause of "login works locally but not on Vercel"

Authentication → **Settings** tab → **Authorized domains** → **Add domain**. Add each of:

- `localhost` (already there)
- your Vercel production domain, e.g. `frisbee-hello-world.vercel.app` (you get it in Part 3 — come back and add it)
- optionally `vercel.app` if you want *preview* deployments to be able to sign in too

Without this, Google sign-in fails with `auth/unauthorized-domain` and verification/reset emails fail with `auth/unauthorized-continue-uri`. The app shows *"This site's domain is not authorized in Firebase yet."* for both.

### 1.4 Create Firestore and deploy rules + indexes

1. **Build → Firestore Database** → **Create database** → location **asia-south1 (Mumbai)** → **Start in production mode** → Create. (Location can't be changed later; production mode = deny-all until you deploy rules.)
2. On your laptop, sign the CLI in and deploy the rules and the 4 composite indexes from the repo:

   ```powershell
   pnpm exec firebase login          # opens a browser — use the Google account that owns the project
   pnpm exec firebase use frisbee-9fcfb
   pnpm deploy:rules                 # = firebase deploy --only firestore  (rules + indexes)
   ```

   Expected tail: `✔  firestore: released rules firestore.rules to cloud.firestore` and `✔  Deploy complete!`. Indexes take 1–5 minutes to build; you can watch them under Firestore → **Indexes**.

   > Troubleshooting: `firebase : The term 'firebase' is not recognized` → always run it as `pnpm exec firebase …` (it's a repo dependency, not global). `Error: Failed to get Firebase project` → `pnpm exec firebase login --reauth`.

### 1.5 Service-account key (for seeding + the Render API)

1. Gear → **Project settings** → **Service accounts** tab → **Firebase Admin SDK** → **Generate new private key** → **Generate key**. A file like `frisbee-9fcfb-firebase-adminsdk-xxxxx.json` downloads.
2. Move it somewhere outside the repo, e.g. `C:\Users\<you>\secrets\frisbee-sa.json`. **Never commit it** (`.gitignore` already blocks `*service-account*.json`, but the downloaded name doesn't match — keep it out of the repo folder).
3. In `apps\server\.env` set:

   ```ini
   GOOGLE_APPLICATION_CREDENTIALS=C:\Users\<you>\secrets\frisbee-sa.json
   FIREBASE_PROJECT_ID=frisbee-9fcfb
   ```

   (Backslashes are fine; the file is read by Node, not by a shell.)

### 1.6 Seed the live project with demo data

```powershell
pnpm seed
```

Output ends with the demo accounts list. It creates 9 Auth users (password `frisbee-demo`) and all the demo groups/communities/events/rides/tutors. Idempotent — safe to re-run. Check **Authentication → Users** in the console; you should see `judge1@srmap.edu.in`, `admin@srmap.edu.in`, etc.

### 1.7 Try it locally against the live project

In `apps\web\.env.local` set `VITE_USE_EMULATORS=false`, then:

```powershell
pnpm dev
```

Open <http://localhost:5173/login>, sign in as `judge1@srmap.edu.in` / `frisbee-demo`. If Home loads with data, Firebase is done.

---

## Part 2 — Cloudinary (10 min)

Console: <https://console.cloudinary.com>. Free plan is enough (25 monthly credits ≈ 25 GB storage/bandwidth).

### 2.1 Find the **cloud name** (not the API key)

1. Bottom-left gear → **Settings** → **API keys** (or **Product environment settings** on older layouts).
2. At the top you see **Cloud name: `dxxxxxxxx`** — a short string like `dq1w2e3r4` or a custom word. **That** is what goes in `VITE_CLOUDINARY_CLOUD_NAME`. The 15-digit **API key** and the **API secret** are different things and only belong in `apps\server\.env`.
3. (Optional, recommended for a fresh account) **Settings → Product environments → ⋮ → Edit** → change the cloud name to `frisbee-helloworld` so the image URLs look tidy. Do this *before* anything is uploaded — changing it later breaks existing URLs.

### 2.2 Create the unsigned upload preset — the actual fix for "the Cloudinary part"

Browser uploads have no API secret, so Cloudinary only accepts them when they name an **unsigned** preset that exists in your account. The app sends `upload_preset=frisbee_unsigned`.

1. **Settings → Upload → Upload presets** (direct link: <https://console.cloudinary.com/app/settings/upload/presets>) → **Add upload preset**.
2. **General** tab:
   - **Upload preset name**: `frisbee_unsigned` — exactly, lowercase, underscore. Case-sensitive, no trailing space.
   - **Signing mode**: **Unsigned** ← the important one.
   - **Asset folder** (dynamic folder mode) or **Folder** (fixed mode): `frisbee`. Leave *Use asset folder as public ID prefix* on if offered; the app also passes `folder=frisbee/avatars|posts|proofs|covers` per upload.
   - *Generated public ID*: leave the default (random unique).
   - **Disallow public ID**: on (nobody can overwrite someone else's image).
3. **Media analysis and AI** / **Transform** tabs: leave empty.
4. **Manage and analyze** → **Allowed formats** (if shown): `jpg, jpeg, png, webp, heic`.
5. **Advanced** (optional) → *Max file size*: `10485760` (10 MB). The app already downsizes images in the browser to ≤1600 px before uploading.
6. **Save**. The list should now show `frisbee_unsigned` with mode **Unsigned**.

### 2.3 Put the values in the env files

`apps\web\.env.local`:

```ini
VITE_CLOUDINARY_CLOUD_NAME=<cloud name from 2.1>
VITE_CLOUDINARY_UPLOAD_PRESET=frisbee_unsigned
```

`apps\server\.env` (server-only; the secret never goes in a `VITE_` var):

```ini
CLOUDINARY_CLOUD_NAME=<same cloud name>
CLOUDINARY_API_KEY=569982226985977
CLOUDINARY_API_SECRET=<the secret from Settings → API keys → reveal>
```

### 2.4 Verify

```powershell
pnpm doctor
```

You want the line `OK  Cloudinary: unsigned upload works (cloud "…", preset "frisbee_unsigned") → https://res.cloudinary.com/…`. The doctor's messages map 1:1 to the causes:

| Doctor / in-app message | Cause | Fix |
|---|---|---|
| `looks like the API key, not the cloud name` | You pasted the 15-digit key | Use the *Cloud name* string from Settings → API keys |
| `cloud name "…" does not exist` (HTTP 401 *Unknown API key*) | Typo / wrong account | Copy-paste the cloud name; check you're in the right product environment |
| `preset "frisbee_unsigned" does not exist` (*Upload preset not found*) | Preset not created, or named differently | Create it exactly as in 2.2 |
| `preset exists but is Signed` (*must be whitelisted for unsigned uploads*) | Signing mode left at Signed | Edit preset → Signing mode → Unsigned → Save |
| *Photo uploads are off until Cloudinary is configured* (in the app) | `VITE_CLOUDINARY_CLOUD_NAME` empty in that build | Set it locally / on Vercel, then redeploy |

Then restart `pnpm dev`, go to **Me → Edit profile → Add photo** and upload a picture; it should appear within a second and show up under **Media Library → frisbee/avatars** in the Cloudinary console.

---

## Part 3 — Vercel (15 min)

### 3.1 Push the repo

```powershell
git add -A
git commit -m "deploy config"
git push origin main
```

### 3.2 Import the project

1. <https://vercel.com/new> → sign in with GitHub → **Import** the `frisbee` repository.
2. **Configure Project** screen:
   - **Project Name**: `frisbee` (the URL becomes `frisbee-<random>.vercel.app` or `frisbee.vercel.app` if free).
   - **Framework Preset**: leave whatever it detects (Vite) or *Other* — `vercel.json` overrides it either way (`"framework": null`).
   - **Root Directory**: **leave as `./`** (the repo root). Do **not** set it to `apps/web` — Vercel reads `pnpm-lock.yaml` and `packageManager` from the root to choose pnpm 10, and `vercel.json` there sets `buildCommand: pnpm --filter @frisbee/web build` and `outputDirectory: apps/web/dist`.
   - **Build and Output Settings**: leave everything **off/default** — do *not* type an Install Command. (A custom `pnpm install` override makes Vercel fall back to pnpm 6, which can't read the v9 lockfile.)
3. **Environment Variables** — add these (Production + Preview). Type the name, paste the value, **no quotes**:

   | Name | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | from `.env.local` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `frisbee-9fcfb.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `frisbee-9fcfb` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `990165064225` |
   | `VITE_FIREBASE_APP_ID` | `1:990165064225:web:…` |
   | `VITE_FIREBASE_MEASUREMENT_ID` | `G-…` (optional) |
   | `VITE_CLOUDINARY_CLOUD_NAME` | your cloud name |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | `frisbee_unsigned` |
   | `VITE_COLLEGE_DOMAIN` | `srmap.edu.in` |
   | `VITE_USE_EMULATORS` | `false` |
   | `VITE_API_URL` | leave **empty for now**; set to the Render URL in Part 4 |

   Shortcut: Vercel's env editor accepts a paste of a whole `.env` file — copy the contents of `apps\web\.env.local` (after setting `VITE_USE_EMULATORS=false`) and paste into the first *Key* box; it splits them into rows.
4. **Deploy**. First build takes ~1–2 minutes. The log should show `pnpm install` running with **pnpm 10.x**, then `vite v7 building…`, `✓ built`, `precache 116 entries`.

### 3.3 Post-deploy settings

1. **Settings → Build and Deployment → Node.js Version** → **22.x** (or 24.x). Avoid 20.x — disabled for new deployments from 1 Oct 2026.
2. Copy your production URL (Overview → Domains), e.g. `https://frisbee-hello-world.vercel.app`.
3. Go back to **Part 1.3** and add that hostname (without `https://`) to Firebase **Authorized domains**.
4. Open the URL → `/login` → sign in as `judge1@srmap.edu.in`. Test Google sign-in too.

### 3.4 Install as an app (PWA check)

- **Android Chrome**: ⋮ → *Add to Home screen* / *Install app*. The install prompt also appears in **Settings → App** inside frisbee.
- **iPhone Safari**: Share → **Add to Home Screen**. iOS shows no automatic prompt — this is how every PWA works on iOS.
- Lighthouse (Chrome DevTools → Lighthouse → PWA) should report *installable*; `sw.js` is served with `Cache-Control: no-cache` so updates are picked up on next open.

### 3.5 Changing an env var later

Vite bakes `VITE_*` values into the JavaScript **at build time**. After editing a variable on Vercel: **Deployments → ⋮ on the latest → Redeploy** (untick *Use existing Build Cache*). Nothing changes until you redeploy.

---

## Part 4 — Render for the Node API (15 min, optional but recommended)

The API does three things: mirrors roles into custom claims (`/api/auth/refresh-claims`), deletes Cloudinary images with the secret (`/api/media/delete`), and sends tutoring/support reminders (`/api/cron/reminders`). The web app treats all of it as best-effort, so nothing breaks if it's down or asleep.

### 4.1 Encode the service account (Windows has no `base64` command)

```powershell
pnpm --filter @frisbee/server encode-service-account C:\Users\<you>\secrets\frisbee-sa.json
```

It prints one very long line. Copy it — that is `FIREBASE_SERVICE_ACCOUNT`.

### 4.2 Create the service from the blueprint

1. <https://dashboard.render.com> → sign in with GitHub → **New → Blueprint** → select the `frisbee` repo → Render reads `render.yaml` and shows **frisbee-api** (Web Service, Free, Node 22, health check `/api/health`).
2. It asks for the `sync: false` values:

   | Key | Value |
   |---|---|
   | `ALLOWED_ORIGINS` | `https://<your>.vercel.app,http://localhost:5173` (comma-separated, no spaces, no trailing slash) |
   | `FIREBASE_SERVICE_ACCOUNT` | the long base64 line from 4.1 |
   | `CLOUDINARY_CLOUD_NAME` | your cloud name |
   | `CLOUDINARY_API_KEY` | `569982226985977` |
   | `CLOUDINARY_API_SECRET` | your secret |

   `CRON_KEY` is auto-generated; `PORT`, `COLLEGE_DOMAIN`, `FIREBASE_PROJECT_ID`, `NODE_VERSION` come from the file.
3. **Apply**. Build (~2 min): `corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm install --frozen-lockfile`, then start `pnpm --filter @frisbee/server start`. Logs end with `frisbee api on :8787`.
4. Open `https://frisbee-api.onrender.com/api/health` → `{"ok":true,"emulators":false,…}`.

   > Not using the blueprint? New → Web Service → repo → *Root Directory* blank, *Build Command* and *Start Command* exactly as above, add the env vars by hand, plus `NODE_VERSION=22.22.0`.

### 4.3 Point the web app at it

Vercel → **Settings → Environment Variables** → `VITE_API_URL` = `https://frisbee-api.onrender.com` (no trailing slash) → Save → **Redeploy** (3.5).

Free Render instances sleep after 15 minutes idle and take ~30–60 s to wake; the first claim refresh after a nap simply happens on the user's next sign-in. If that bothers you during judging, the cron in Part 6 keeps it awake.

---

## Part 5 — Verify end to end (5 min)

On the Vercel URL, in a private window:

1. `/signup` with a personal email → you land on onboarding, gated features show the "verified students only" note (tiered access working).
2. Sign out, sign in as `judge1@srmap.edu.in` → Home shows matches, groups, events (Firestore + rules working).
3. **Me → Edit profile → Add photo** → image appears (Cloudinary working).
4. **Messages** → open a thread → send a message; open the same thread as `meera.tutor@` in another window → arrives live (rules + realtime working).
5. `admin@srmap.edu.in` → **Admin** → approve the pending tutor application (admin rules working).
6. Optional API check: DevTools → Network → filter `refresh-claims` after signing in with a verified account → status 200 from the Render host.

Locally, `pnpm doctor` should now be all `OK` except the emulator warning if you left `VITE_USE_EMULATORS=true`.

---

## Part 6 — Reminders cron (5 min, optional)

Render's free tier has no scheduler, so an external pinger calls the reminder sweep.

1. <https://cron-job.org> → free account → **Create cronjob**.
2. **URL**: `https://frisbee-api.onrender.com/api/cron/reminders?key=<CRON_KEY>` — get `CRON_KEY` from Render → frisbee-api → **Environment**.
3. **Schedule**: every 15 minutes. **Advanced → Request method**: `POST`.
4. Save → **Run now** → response should be `{"sent":0}` (or a count). A wrong key returns `403 {"error":"Bad key"}`.

Side effect: this also stops the Render instance from sleeping.

---

## Appendix A — What each piece degrades to when missing

| Missing | Effect | Where the user sees it |
|---|---|---|
| Any `VITE_FIREBASE_*` required var | App refuses to start | Full-page "frisbee is not configured" listing the variable names |
| `VITE_CLOUDINARY_CLOUD_NAME` | Photo/attachment buttons disabled | "Photo uploads are off until Cloudinary is configured." under the avatar |
| Preset wrong/signed | Upload fails | Toast with the exact reason (preset missing / signed / cloud name wrong) |
| `VITE_API_URL` / Render down | Custom claims not refreshed; image deletes skipped | Nothing visible — rules fall back to `users/{uid}.roles` |
| Vercel domain not authorised in Firebase | Google sign-in + email links fail | "This site's domain is not authorized in Firebase yet." |
| Rules not deployed | Every read fails | "You don't have permission to do that." on every page |
| Indexes still building | The 4 compound queries fail for a few minutes | Error state with *Retry* on that list |

## Appendix B — Local development commands (all Windows-safe)

```powershell
pnpm doctor                 # config check
pnpm emulators              # terminal 1: Auth :9099, Firestore :8081, UI http://127.0.0.1:4000
pnpm seed:emulator          # once per emulator start
pnpm dev                    # terminal 2: http://localhost:5173  (VITE_USE_EMULATORS=true)
pnpm dev:server:emulator    # terminal 3: API on :8787 against the emulators (optional)

pnpm dev:server             # API against the live project (uses apps\server\.env)
pnpm seed                   # seed the live project
pnpm test:rules             # 26 security-rules tests against the emulator
pnpm typecheck; pnpm lint; pnpm build
```

The emulator scripts no longer rely on `VAR=value command` (bash-only); `apps/server/scripts/with-emulators.mjs` sets the env vars from Node, so they work in PowerShell and cmd.

## Appendix C — Common Windows errors

| Error | Fix |
|---|---|
| `pnpm : File … pnpm.ps1 cannot be loaded because running scripts is disabled` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `corepack enable` → `EPERM: operation not permitted, symlink` | Run PowerShell as Administrator, or `npm install -g pnpm@10` instead |
| `ERR_PNPM_UNSUPPORTED_ENGINE … node >=20.19 <25` | Install Node 22 LTS, open a new terminal, `node -v` |
| `java.lang.UnsupportedClassVersionError` / emulator won't start | Java < 21 on PATH. Install Temurin 21 and reopen the terminal; `java -version` must say 21 |
| `Port 8081 is not open` when starting emulators | Another emulator still running: `Get-Process java | Stop-Process` |
| `firebase login` opens nothing | `pnpm exec firebase login --no-localhost` and paste the code |
| Long paths / `ENAMETOOLONG` in `node_modules` | `git config --system core.longpaths true` (admin) and enable *Win32 long paths* in Group Policy, or clone closer to the drive root, e.g. `C:\dev\frisbee` |
| `EBUSY` / `EPERM` during `pnpm install` | Close VS Code/antivirus scanning the folder, rerun `pnpm install` |
