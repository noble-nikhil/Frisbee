# frisbee — UI design system

Companion to `design/style-tile.html` (open it to see the tokens and screen mock-ups rendered). The goal is a product that looks like a small, competent team shipped it: quiet surfaces, sharp edges, one accent, real density.

---

## 1. Principles (and the rules that enforce them)

1. **Flat, not shiny.** Surfaces are solid `white` on a `#F4F5F7` canvas separated by 1 px borders. **Banned:** gradients, glassmorphism/backdrop-blur, glow shadows, neon, 3D/tilt effects, animated blobs, particle backgrounds, confetti, emoji as decoration, rounded-everything.
2. **One accent per screen.** Orange `#FF5A1F` is for the *single primary action* and active navigation state. Teal `#0D9488` is for *status and trust*: verified badge, success, "confirmed", live counters. They never sit on the same button, and text is never orange-on-teal.
3. **Sharp radii.** `4 px` for controls and chips, `8 px` for cards and sheets, `full` only for avatars and status dots. No 16–24 px pill cards.
4. **Type does the work.** Two weights (400/600) and a tight scale. Hierarchy comes from size, weight and spacing — not from colour.
5. **Content density like a tool, not a landing page.** Lists show 5–8 items above the fold on a phone. Cards have 12–16 px padding, not 32.
6. **Every list has three states** designed up front: loading (skeleton rows, same height as real rows), empty (icon 24 px, one sentence, one button), error (one sentence, "Retry").
7. **Motion is functional.** 150 ms ease-out on hover/press, 200 ms for sheets/dialogs sliding in, nothing on page load. `prefers-reduced-motion` disables the sheet slide.

---

## 2. Tokens (Tailwind v4 `@theme`)

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand-50:  #FFF4F0;
  --color-brand-100: #FFE5DB;
  --color-brand-200: #FFC7B2;
  --color-brand-500: #FF5A1F;   /* primary — buttons, active tab, focus ring */
  --color-brand-600: #F04A10;   /* hover */
  --color-brand-700: #D63C05;   /* pressed; the darkest orange allowed as TEXT (4.66:1 on white) */
  --color-brand-800: #A32E05;

  /* Secondary */
  --color-teal-50:  #F0FDFA;
  --color-teal-100: #CCFBF1;
  --color-teal-600: #0D9488;    /* badges, success icons, live dots */
  --color-teal-700: #0F766E;    /* teal as TEXT (5.47:1 on white) */
  --color-teal-800: #115E59;

  /* Neutrals (tertiary is the canvas) */
  --color-canvas:  #F4F5F7;     /* page background */
  --color-surface: #FFFFFF;     /* cards, sheets, inputs, nav */
  --color-line:    #E4E7EC;     /* borders, dividers */
  --color-line-strong: #D0D5DD; /* input borders */
  --color-ink:     #111827;     /* primary text */
  --color-ink-2:   #4B5563;     /* secondary text (7.56:1) */
  --color-ink-3:   #6B7280;     /* meta text, icons (4.83:1 — min for small text) */
  --color-ink-4:   #9CA3AF;     /* placeholders, disabled only */

  /* Semantic */
  --color-success: #0D9488;     /* = teal-600 */
  --color-warning: #B54708;  --color-warning-bg: #FFFAEB;
  --color-danger:  #B42318;  --color-danger-bg:  #FEF3F2;
  --color-info:    #175CD3;  --color-info-bg:    #EFF4FF;

  /* Type */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Radius */
  --radius-sm: 4px;   /* buttons, inputs, chips, tags */
  --radius-md: 8px;   /* cards, sheets, dialogs, images */
  --radius-lg: 12px;  /* ONLY the install sheet & onboarding illustration frame */

  /* Elevation — only two levels exist */
  --shadow-card: 0 1px 2px rgb(16 24 40 / 0.05);                 /* cards at rest */
  --shadow-pop:  0 8px 24px rgb(16 24 40 / 0.12), 0 1px 2px rgb(16 24 40 / 0.06); /* menus, dialogs, sheets */
}
```

Inter is self-hosted (`@fontsource-variable/inter`) so the PWA works offline and there's no Google Fonts request. Fallback stack is fine on iOS (SF) if the font hasn't loaded.

### 2.1 Colour usage matrix

| Element | Token |
|---|---|
| Page background | `canvas` |
| Card / nav / input background | `surface` |
| Card border | `line` · input border `line-strong` · focused input `brand-500` 2 px ring |
| Primary button | bg `brand-500`, text white, hover `brand-600`, pressed `brand-700` (white text on brand-500 is 3.1:1 — acceptable for **≥ 14 px semibold** button labels only; never for body text) |
| Secondary button | bg `surface`, border `line-strong`, text `ink` |
| Ghost / tertiary button | text `ink-2`, hover bg `canvas` |
| Destructive | text `danger`, hover bg `danger-bg`; solid red only in confirm dialogs |
| Link text | `brand-700` underline on hover |
| Active bottom-tab | icon + label `brand-500`; inactive `ink-3` |
| Verified badge | `teal-600` check icon, optional text `teal-700` on `teal-50` |
| Status chips | Open `teal-50/teal-700` · Full/Closed `canvas/ink-2` · Pending `warning-bg/warning` · Cancelled/Rejected `danger-bg/danger` · Live/Today `brand-50/brand-700` |
| Match score | number in `ink`, bar track `line`, bar fill `teal-600` (score is trust, not action) |
| Unread dot / count | `brand-500` |
| Skeleton | `canvas` blocks, 1.2 s pulse |

### 2.2 Type scale (Inter, `-0.01em` tracking above 20 px)

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 600 | Landing headline (32 on desktop) |
| `h1` | 22 / 28 | 600 | Page title |
| `h2` | 18 / 24 | 600 | Section title, dialog title |
| `h3` | 15 / 20 | 600 | Card title, list item title |
| `body` | 15 / 22 | 400 | Default text (16 on inputs to stop iOS zoom) |
| `small` | 13 / 18 | 400/600 | Meta, chips, tab labels |
| `micro` | 11 / 14 | 600 | Badges, uppercase section eyebrows (`tracking 0.04em`) |

### 2.3 Spacing & layout
- 4-pt base; components use 8/12/16/24; page gutters 16 px mobile, 24 px desktop.
- Content max-width 640 px for feeds/forms (reads like an app, not a stretched page); 1040 px for admin tables and the calendar.
- Mobile shell: top bar 52 px (title left, actions right), bottom tabs 56 px + safe-area, content scrolls between.
- Desktop shell (≥ 1024): 240 px sidebar with the full nav list, content column, no right rail.
- Cards in lists: full-width on mobile with 12 px gap; 2-column grid at ≥ 768 for browse pages.

### 2.4 Iconography
Lucide only. Stroke 1.75 in nav, 1.5 elsewhere. Sizes 16 (inline/meta), 20 (buttons, list rows), 24 (bottom tabs, empty states). Module icons are fixed so they're recognisable everywhere:

| Module | Icon | Module | Icon |
|---|---|---|---|
| Home | `house` | Rides | `car-front` |
| Discover / People | `users` | Errands | `shopping-bag` |
| Skill swap | `arrow-left-right` | Teams | `hammer` (or `code-2`) |
| Groups | `layers` | Tutoring | `graduation-cap` |
| Communities | `globe` | Support / volunteering | `hand-helping` |
| Activities | `sparkles`→ **no**, use `calendar-check` | Messages | `message-square` |
| Hangouts | `coffee` | Notifications | `bell` |
| Events | `ticket` | Search | `search` |
| Admin | `shield-check` | Me | `circle-user` |

---

## 3. Components (the whole kit — ~14 primitives)

| Component | Variants / notes |
|---|---|
| `Button` | `primary` · `secondary` · `ghost` · `danger`; sizes `sm` 32 px · `md` 40 px · `lg` 44 px (mobile primary); optional leading icon; `loading` swaps the icon for a 16 px spinner and keeps width. Full-width on mobile forms. |
| `IconButton` | 40 × 40, ghost by default, `aria-label` required. |
| `Input` / `Textarea` / `Select` | 40 px (44 on mobile), 16 px text, label above (13/600 `ink-2`), helper/error below, `line-strong` border, 2 px `brand-500` ring on focus, `danger` border on error. Textarea auto-grows to 6 lines. |
| `TagPicker` | Typeahead over the taxonomy; selected tags render as removable `Chip`s; supports a level selector (1–3 dots) for skills. |
| `Chip` | `default` (canvas bg) · `selected` (brand-50 bg, brand-700 text, brand-200 border) · `status` (see matrix); 28 px tall, 4 px radius. |
| `Card` | surface + 1 px `line` + `shadow-card`, 8 px radius, 16 px padding (12 on tight lists). Clickable cards get `hover:border-line-strong` and nothing else. |
| `ListRow` | avatar/icon · title + meta · trailing (chevron, count, button). 56–64 px. Dividers, not gaps. |
| `Avatar` | 24/32/40/56/96; image or initials on a deterministic neutral background (6 muted tones, never brand orange); verified check overlay at ≥ 40. |
| `Badge` | count (brand-500 bg, white 11/600) and status (see matrix). |
| `Tabs` | underline style; active text `ink` + 2 px `brand-500` underline; scrollable on mobile. Route-synced (`?tab=`). |
| `Sheet` (bottom, mobile) / `Dialog` (center, desktop) | one component switching on `≥ 768`. Header with title + close, body scrolls, footer with actions right-aligned. |
| `Toast` | bottom-center above tabs, 4 s, single line + optional action; variants info/success/error via a leading icon only. |
| `EmptyState` | 24 px icon in `ink-3`, one sentence in `ink-2`, one `secondary` button. Centered, 48 px vertical padding. |
| `Skeleton` | matches the row/card it replaces; max 6 rows. |
| `PageHeader` | h1 + optional description + right-side primary action; sticky on desktop. |
| `Segmented` | 2–4 options (e.g. Today / Tomorrow / Week) — 32 px, canvas bg, selected = surface + border. |
| `MatchExplain` | list of shared tags grouped: "Skills · React, Figma" / "Interests · Football". Reused in matches, swap and team applicants. |

---

## 4. Screen specs (mock-ups in `design/style-tile.html`)

### 4.1 Landing (`/`)
Nav: logo mark 28 px + wordmark "frisbee", right: **Log in** (ghost), **Get started** (primary). Hero: headline "Find your people on campus." · one-line sub · two buttons · below, a real phone-frame screenshot of the Home feed (static PNG later). Then a 3-column "What you can do" with 12 module rows (icon + one line each). Then "Install it like an app" with the Android/iOS steps. Footer: "made with love by team Hello World" with the Hello World logo at 20 px. Nothing else — no testimonials, no stats counters, no pricing.

### 4.2 Auth
Centered 400 px card on canvas. Logo mark, h1, form, primary button, Google secondary button with the G glyph, link row. Verify-email screen shows the address, "Resend" (secondary), and "I've verified — continue" (primary, calls claims refresh).

### 4.3 Onboarding (3 steps)
Top: step indicator "1 of 3" + a 2 px progress bar in brand-500 (the only progress bar on the product). One question group per screen, big tap targets, TagPicker with the taxonomy grouped by category, level dots for skills, availability grid (7 × 3 toggles, 44 px cells). Bottom: sticky **Continue** (primary, full width) + **Back** (ghost).

### 4.4 Home
Sticky top bar: wordmark left, search + bell (with count) right. Sections with an eyebrow label (micro, uppercase, `ink-3`) and "See all" link (small, `brand-700`). **Top matches** as 3 horizontal-scroll cards 240 px wide (avatar 40, name, dept · year, score bar, 2 shared tags, Connect button sm). **Today & tomorrow**: ListRows with a left time column. **From your communities**: 2 compact post rows. **Modules**: 4-column icon grid (mobile) — icon 24, label 13. Verification banner (if needed) sits above matches: `warning-bg`, text, "Verify" link.

### 4.5 Discover (People · Skill swap · Teams tabs)
Filter row: `Segmented` for department/year via a Filter button opening a Sheet; active filters shown as Chips. Match card: avatar 56 left, name + verified, dept · year, score as "82% match" (h3) plus 4 px bar, `MatchExplain` (max 2 lines, "+3 more"), actions: **Connect** (primary sm) · **Skip** (ghost sm). Skill swap card shows two columns "You teach / They teach" with arrows icon between.

### 4.6 Messages
Thread list rows (avatar 40, name, snippet 1 line `ink-2`, time `ink-3`, unread count badge). Thread view: header with avatar + name + context chip ("Ride · Sat 7 am"), bubble list — mine: brand-50 bg, `ink` text, 8 px radius with 2 px bottom-right; theirs: surface with `line` border. No tails, no gradient bubbles. Composer: 44 px input, image button, send `IconButton` in brand-500 only when text present. System messages centred in `small ink-3`.

### 4.7 Happening (Activities · Hangouts · Events)
Segmented date filter + category chips row (horizontal scroll). Cards with a **left date block** (day number h2 + mon micro) and content (title h3, venue · time meta, attendee avatars stack + count, status chip). Event calendar: month grid, 40 px cells, dots (max 3) in `ink-3`, selected day `brand-500` circle, day list under the grid. Detail pages share one layout: header (category chip, title h1, organiser row), facts list (icon + text: when / where / capacity), description, attendees, sticky bottom action bar with the primary action (RSVP / Join / Request seat / Apply) and its state ("Going · Cancel", "Waitlisted #3").

### 4.8 Rides / Errands / Teams
Same detail layout. Ride card: route rendered as "Campus Gate → Vijayawada Jn" with a small `arrow-right`, time, vehicle icon, "2 of 4 seats" with 4 tiny seat squares (filled = `ink`, empty = `line`), driver avatar + verified. Errand trip card: "Going to Vijayawada · Sat" + item requests count; item request rows with a 4-step status stepper (dots + labels, current step in teal). Team listing: roles as chips with a "1/2" count.

### 4.9 Tutoring
Marketplace card: avatar 56, name + verified + rating "4.8 (12)" with a single `star` icon in `ink`, skills chips, "₹300/hr" h3, **Book** primary sm. Booking: week strip (7 days) → slot grid (buttons 40 px) → summary card → mock payment card (amount, "Pay ₹300", a single-line `info-bg` notice "Demo payment — no money is charged") → confirmation with "Add to calendar".

### 4.10 Support (accessibility)
Calm, high-contrast, larger text (body 16, controls 48 px), explicit labels, no icons-only actions. Request form → matched volunteers list (name, subjects, availability match, "Ask" button) → status card with the volunteer's contact after confirmation.

### 4.11 Admin
Desktop-first table layout (still usable on mobile via stacked rows). Left tabs, table rows with the applicant, submitted date, proof links, **Approve** (primary sm) / **Reject** (secondary sm) → Dialog with note. Reports: target preview, reason, actions in a menu.

### 4.12 PWA install
- Android/desktop: "Install frisbee" row in Me → Settings with `download` icon; also a dismissible Card on Home after the second visit ("Add frisbee to your home screen — opens full-screen, works offline. **Install** · Not now").
- iOS Safari: bottom Sheet with two numbered steps and the exact glyphs: ① Tap **Share** (`share` icon, the square-with-arrow) ② Choose **Add to Home Screen** (`square-plus`). Shown once, re-openable from Settings → "Install app".
- Update available: Toast "A new version is ready · **Reload**".

---

## 5. Brand assets & app icon

- **Wordmark:** the word "frisbee", lowercase, Inter 600, `-0.02em`, `ink`. In the top bar it's 18 px next to a 28 px mark. (The logo's hand-lettered diagonal wordmark is used only on the landing hero and splash — it doesn't scale to 18 px.)
- **Mark / app icon:** the disc sketch from the logo with the wordmark removed (`design/assets/icon-preview-512.png`). Final icons: export from the original PNG at 512/192 on the logo's own paper tone `#F5F4F0`; the maskable variant keeps the disc inside the inner 80 % safe zone (`icon-maskable-preview-512.png`). `apple-touch-icon` 180 px, no transparency, no rounded corners (iOS applies its own).
- **Splash (iOS):** generated by the plugin/`pwa-asset-generator` from the mark on `#F4F5F7`.
- **Favicon:** 32 px simplified — orange ring on paper (SVG, hand-drawn look drops out at that size).
- **Team credit:** footer text "made with love by team Hello World" (small, `ink-3`) with the Hello World globe at 20 px to its left; also on the About screen in Settings. Nowhere else.
- The logo's watercolour palette (ochre `#E8BD78`, slate `#A3B2AD`) is **not** used in the UI — it stays inside the logo so the brand orange/teal read cleanly.

---

## 6. Accessibility checklist
- Text contrast ≥ 4.5:1 (all `ink-*` on white/canvas pass; orange text only via `brand-700`; teal text only via `teal-700`).
- Focus visible: 2 px `brand-500` ring with 2 px offset on every interactive element (`:focus-visible`).
- Hit areas ≥ 44 × 44 on mobile; bottom tabs 56 px.
- Every icon-only control has `aria-label`; status chips include text, not colour alone.
- Sheets/dialogs trap focus, close on Esc, return focus to the trigger.
- Forms: label ↔ input association, errors announced via `aria-live="polite"`.
- `prefers-reduced-motion`: disable sheet transitions and skeleton pulse.
