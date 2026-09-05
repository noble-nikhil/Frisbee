# frisbee — Firebase setup tutorial (Auth, Firestore, Storage, Emulators, Service account)

> **Superseded (Sept 2026):** the project stays on the free **Spark** plan and uses **Cloudinary** instead of Firebase Storage. Skip §1.1 (Blaze) and Part 5 (Storage). The current, Windows-friendly, end-to-end guide — Firebase + Cloudinary + Vercel + Render — is [06-Deployment-Guide.md](06-Deployment-Guide.md).

Follow this top to bottom once. Estimated time: 30–40 minutes. One person does it and shares the results with the team via the private channel (never commit the service-account file).

At the end you will have:
- A Firebase project on the Blaze plan with Auth (email/password + Google), Firestore in Mumbai, Storage, and Security Rules deployed.
- The web config object → `apps/web/.env.local`.
- A service-account JSON → Render env var for the Node service.
- The Emulator Suite running locally so nobody burns quota or pollutes prod data while developing.

> Screenshots change; the labels below are what you should look for. If a label differs slightly, it's the same thing.

---

## Part 1 — Create the project

1. Go to <https://console.firebase.google.com> and sign in with the **team Google account** (create one like `helloworld.frisbee@gmail.com` so ownership doesn't depend on one member).
2. **Create a project** → name `frisbee` (project ID will be like `frisbee-xxxxx`; you can edit it once — pick `frisbee-srmap` if free).
3. Google Analytics: **Disable** (not needed; one less SDK).
4. Wait for provisioning → **Continue**.

### 1.1 Upgrade to Blaze (needed for Storage)
5. Bottom-left of the console: **Spark → Upgrade** → choose/create a Cloud Billing account → add the card → confirm.
6. Immediately set a **budget alert**: Google Cloud Console → *Billing → Budgets & alerts → Create budget* → amount ₹500 → alerts at 50/90/100 %. (Blaze only bills above the free quotas; a hackathon app won't get close, but the alert removes the worry.)

---

## Part 2 — Register the web app & get the config

7. Project overview → **</> (Web)** → nickname `frisbee-web` → **do not** tick Firebase Hosting (we use Vercel) → **Register app**.
8. Copy the `firebaseConfig` object shown. Create `apps/web/.env.local`:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=frisbee-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=frisbee-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=frisbee-xxxxx.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
VITE_API_BASE_URL=http://localhost:8080
VITE_COLLEGE_DOMAIN=srmap.edu.in
VITE_USE_EMULATORS=true
```
`.env.local` is git-ignored. Commit an `apps/web/.env.example` with the same keys and empty values. (You can find the config again later under *Project settings → General → Your apps → SDK setup and configuration → Config*.)

---

## Part 3 — Authentication

9. Left menu **Build → Authentication → Get started**.
10. **Sign-in method → Email/Password → Enable** (leave "Email link (passwordless)" off) → Save.
11. **Add new provider → Google → Enable** → set *Project support email* → Save.
12. **Settings tab → Authorized domains**: `localhost` is there already. Add your Vercel domain(s) later (e.g. `frisbee.vercel.app` and any preview domain you'll demo from). Google sign-in fails on unlisted domains.
13. **Templates tab**: open *Email address verification* → click the pencil → set sender name `frisbee` and, in the body, keep the default. Change the **Action URL** to your production URL + `/verify` (e.g. `https://frisbee.vercel.app/verify`) once deployed. Do the same for *Password reset* (`/reset`). Until you have a domain, leave defaults — they still work.
14. **Settings → User actions**: keep *Email enumeration protection* **on**. Under *User account management* you can leave *Create* enabled (anyone may sign up; verification decides the badge).

> **Tiered email policy recap:** anyone can sign up; only users whose email ends in `@srmap.edu.in` **and** is verified receive the `verifiedStudent` custom claim (set by the Node service, see Part 7). Nothing to configure here for that — it's in code.

---

## Part 4 — Cloud Firestore

15. **Build → Firestore Database → Create database**.
16. **Location:** `asia-south1 (Mumbai)`. This cannot be changed later. Click **Next**.
17. **Rules:** choose **Start in production mode** (deny all). We deploy our own rules from the repo in Part 6. **Create**.
18. Nothing else to click; collections are created by the app/seed script.

### 4.1 Composite indexes
You'll need a handful (list in `docs/01-PRD.md` §6). Two ways:
- **Lazy:** run the app; when a query needs an index Firestore throws an error containing a console link → click → **Create index** (takes 1–5 min). Fine during development.
- **Declarative (do this before the demo):** keep `firestore.indexes.json` in the repo and run `firebase deploy --only firestore:indexes`. Whenever you create one via the link, run `firebase firestore:indexes > firestore.indexes.json` to capture it.

---

## Part 5 — Storage

19. **Build → Storage → Get started** → location defaults to the project's region → **production mode** → Done. The bucket name (`frisbee-xxxxx.firebasestorage.app`) must match `VITE_FIREBASE_STORAGE_BUCKET`.
20. Rules are deployed from `storage.rules` in Part 6.
21. **CORS for direct browser uploads works out of the box** with the Firebase SDK; no extra config unless you fetch files with plain `fetch()` from a different origin (we don't — we render `<img src>`).

---

## Part 6 — Firebase CLI, rules and Emulators (local dev)

22. Install CLI and log in (once per machine):
```bash
npm i -g firebase-tools
firebase login
```
23. From the repo root:
```bash
firebase use --add        # pick your project, alias it "default"
```
This writes `.firebaserc`. `firebase.json` in the repo already points at `firestore.rules`, `firestore.indexes.json`, `storage.rules` and configures emulators:

```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage":   { "rules": "storage.rules" },
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8081 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```
24. Start emulators (needs Java 11+ installed: `java -version`):
```bash
firebase emulators:start --import=./.emulator-data --export-on-exit
```
Open <http://localhost:4000> for the Emulator UI. `--export-on-exit` keeps your local data between restarts; `.emulator-data/` is git-ignored.

25. The web app connects to emulators automatically when `VITE_USE_EMULATORS=true` (`connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator` in `src/lib/firebase.ts`). Emulator Auth accepts any email and shows verification links in the emulator log / UI, so you can test the verified-student flow without real mail.

26. Deploy rules + indexes to production whenever they change:
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 6.1 Rules skeleton (starting point, expanded per module during the build)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn()      { return request.auth != null; }
    function uid()           { return request.auth.uid; }
    function isOwner(id)     { return signedIn() && uid() == id; }
    function claim(name)     { return signedIn() && request.auth.token[name] == true; }
    function isAdmin()       { return claim('admin'); }
    function isVerified()    { return claim('verifiedStudent') || isAdmin(); }
    function notSuspended()  { return !(request.auth.token.suspended == true); }

    match /taxonomy/{v} { allow read: if signedIn(); allow write: if false; }

    match /users/{id} {
      allow read: if signedIn() && (isOwner(id) || isAdmin()
                    || resource.data.privacy.profile == 'everyone'
                    || (resource.data.privacy.profile == 'connections'
                        && exists(/databases/$(db)/documents/connections/$(uid() < id ? uid() + '_' + id : id + '_' + uid()))));
      allow create: if isOwner(id) && request.resource.data.roles.admin != true;
      allow update: if (isOwner(id) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['roles','suspended','email']))
                    || isAdmin();
      match /notifications/{n} {
        allow read, update, delete: if isOwner(id);
        allow create: if signedIn() && notSuspended();   // other users fan out notifications
      }
      match /blocks/{b}        { allow read, write: if isOwner(id); }
      match /hiddenMatches/{h} { allow read, write: if isOwner(id); }
    }

    // …one block per collection (threads, groups, communities, events, rides, …)
    // Pattern: read if member/public; create if signedIn && createdBy == uid && shape valid;
    // update if owner/mod/admin or limited to specific fields (e.g. counters via transactions).

    match /{document=**} { allow read, write: if false; }
  }
}
```
```js
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() { return request.auth != null; }
    function isImage()  { return request.resource.contentType.matches('image/.*'); }
    match /users/{uid}/{file} {
      allow read: if true;
      allow write: if signedIn() && request.auth.uid == uid && isImage() && request.resource.size < 1 * 1024 * 1024;
    }
    match /posts/{postId}/{file} {
      allow read: if signedIn();
      allow write: if signedIn() && isImage() && request.resource.size < 3 * 1024 * 1024;
    }
    match /applications/{uid}/{file} {
      allow read: if signedIn() && (request.auth.uid == uid || request.auth.token.admin == true);
      allow write: if signedIn() && request.auth.uid == uid
                   && (isImage() || request.resource.contentType == 'application/pdf')
                   && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## Part 7 — Service account for the Node service (admin SDK)

27. Console → **⚙ Project settings → Service accounts → Firebase Admin SDK → Generate new private key** → a JSON downloads. **Treat it like a password.**
28. Local dev: save it **outside** the repo, e.g. `~/secrets/frisbee-sa.json`, then in `apps/server/.env`:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/Users/you/secrets/frisbee-sa.json
FIREBASE_PROJECT_ID=frisbee-xxxxx
ALLOWED_ORIGINS=http://localhost:5173
COLLEGE_DOMAIN=srmap.edu.in
PORT=8080
FIRESTORE_EMULATOR_HOST=localhost:8081        # only while developing against emulators
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099    # same
```
29. Render: paste the JSON as a single env var `FIREBASE_SERVICE_ACCOUNT` (base64 it first: `base64 -w0 frisbee-sa.json` on Linux, `base64 -i frisbee-sa.json` on macOS). The server decodes it at boot:
```ts
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT!, 'base64').toString('utf8'));
initializeApp({ credential: cert(sa) });
```
30. Rotate the key after the hackathon (Project settings → Service accounts → Manage service account permissions → keys).

### 7.1 Make the first admin
There is no admin until someone sets the claim. After the seed script runs, from the repo root:
```bash
pnpm tsx scripts/grant-admin.ts you@srmap.edu.in
```
(the script does `auth.getUserByEmail → setCustomUserClaims({...claims, admin: true})` and updates `users/{uid}.roles.admin`). Then sign out/in (or `getIdToken(true)`) in the app.

---

## Part 8 — Seed data

31. `pnpm seed` (runs `scripts/seed.ts` with the service account) writes: `taxonomy/v1`, ~60 demo users with photos (initials avatars), connections, 8 groups, 4 communities with posts/polls, ~15 events across categories, hangouts for today/tomorrow, rides to the usual routes, 3 errand trips, 5 team listings, 4 approved tutors with availability, 3 approved volunteers, pending applications/community requests/reports so the admin panel isn't empty.
32. Demo logins (all password `frisbee-demo`): `judge1@srmap.edu.in` (verified student), `meera.tutor@srmap.edu.in` (tutor), `admin@srmap.edu.in` (admin), `guest@gmail.com` (unverified, to show gating). Seeded users are created via Admin SDK with `emailVerified: true` where needed, so no real mail is required.

---

## Part 9 — Production checklist (day before demo)

- [ ] Vercel domain added to **Auth → Authorized domains**.
- [ ] Email templates' action URLs point at production.
- [ ] `firebase deploy --only firestore:rules,firestore:indexes,storage` done from `main`.
- [ ] `VITE_USE_EMULATORS=false` in Vercel env; `VITE_API_BASE_URL` = Render URL.
- [ ] Render env has `FIREBASE_SERVICE_ACCOUNT`, `ALLOWED_ORIGINS=https://<your-vercel-domain>`.
- [ ] Seed run against **prod** once; verify `judge1` can log in from a phone.
- [ ] Budget alert exists; quotas dashboard (Usage tab) shows near-zero.
- [ ] App Check: **not enabled** (would break emulator/demo flows if misconfigured; note as future work).

---

## Part 10 — What I need from you (checklist to paste back)

1. `firebaseConfig` values (the 6 `VITE_FIREBASE_*` keys). Not secret, but share privately anyway.
2. Confirmation that Blaze is on and Storage bucket exists (bucket name).
3. Service-account JSON → put it **only** into Render / your local machine; tell me the project ID, not the file.
4. The exact college email domain(s) to treat as verified (`srmap.edu.in` — any others, e.g. `srmap.ac.in`?).
5. The Vercel project URL once created (so Auth domains + CORS can be set).

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `auth/unauthorized-domain` on Google sign-in | Add the domain in Auth → Settings → Authorized domains. |
| `permission-denied` on a read that should work | Rules mismatch or stale token after a claim change → `getIdToken(true)`; check the Rules Playground in console. |
| `The query requires an index` | Click the link in the error; commit the generated index to `firestore.indexes.json`. |
| Storage upload 403 | Bucket name typo in env, or contentType/size violates rules. |
| Emulator UI empty after restart | Start with `--import=./.emulator-data --export-on-exit`. |
| Verification email not arriving | Check spam; check Auth → Templates sender; for `@srmap.edu.in` inboxes ask a teammate to whitelist `noreply@<project>.firebaseapp.com`. Emulator shows links in the terminal. |
| Node service 401 | Client didn't attach `Authorization: Bearer <idToken>` or token expired (SDK refreshes automatically; retry once). |
