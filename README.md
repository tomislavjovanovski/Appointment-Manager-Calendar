# ClinicCalendar

Scheduling and patient management for a single dental practice. English/Macedonian interface, weekly desktop calendar, and compact mobile agenda. Default app branding is ClinicCalendar; the calendar heading is "Weekly schedule" / "Неделен распоред", with working hours beneath it. Practice name and logo are configurable.

## Quick Start

Use Node.js 22 LTS. From the repository root:

```bash
npm install
npm run dev
```

Starts both frontend and backend, reusing an already healthy backend. No separate backend start is needed.

- Open `http://localhost:8081/app/`, or the next free port shown by Vite. Keep the trailing slash.
- Backend health: `http://127.0.0.1:3000/api/health`; development `/api` requests use Vite's proxy.
- Stop with **Ctrl+C**, not Ctrl+Z. Suspended processes retain ports and can leave requests hanging.
- Restart the backend after backend changes, including duration validation and user-preference routes. Vite reloads frontend changes only; the development launcher reuses an already healthy backend, even if its code has changed. If the backend was started separately, restart that process too.
- Create a local login once: `cd server && node manage-users.js create --email you@example.com` (stored in `../private/auth`, ignored by git).

## Features

- **Booking:** 30/45/60/90/120 minutes, 24-hour format, and automatically calculated end time. Settings provides radio buttons to choose one default type for new appointments (initially Procedure), saved as `defaultAppointmentType` in Settings JSON. Each type also has one default duration: initially 60 minutes for prosthetics & orthodontics and 30 minutes for all other types. New appointments select the configured standard type and duration; changing the type applies that type's duration default, which remains manually editable. Opening an existing appointment preserves its saved type and duration. Slot-click bookings retain the shorter-duration fitting behavior when needed.
- **Appointment types:** consultation (blue), follow-up (teal), procedure (orange), cleaning & prevention (green), prosthetics & orthodontics (purple), and urgent appointment (red). Shared English/Macedonian labels, descriptions, and colors appear in the sidebar legend and booking dropdown. The closed type selector shows only the color marker and name; open options include descriptions with a light-grey hover highlight.
- **Availability:** working-day/hour restrictions, overlap checks, 15-minute suggestions, and full-range highlighting. A slot click uses the selected duration, or the largest shorter one that fits.
- **Patients:** select an existing record or create one with name/surname during booking; complete other details later. On mobile, the patient picker opens as a searchable card that stays above the on-screen keyboard.
- **Desktop:** seven equal day columns, compact rows, centered headers, and evenly inset appointment blocks showing patient and phone, left-aligned, color-coded by appointment type (the title text is no longer repeated on the block). Patient names wrap on separate first/surname lines. When a patient has no phone number, only the phone icon is shown; unavailable patient data retains its feedback message. Non-working days/hours are shown with a clearly darker disabled background while keeping the half-hour grid lines visible.
- **Mobile:** compact cards with approximately 15% for start/end times and 85% for full name, phone, and title. Name stays inline without a separate background; status badges are removed.
- **Navigation:** compact desktop Calendar, Patients, and Settings tabs are right-aligned in each page header, before New Appointment or Add Patient where applicable. Page titles and descriptions stay on the left. Desktop content fills the remaining width beside the sidebar with narrow side gutters and no fixed maximum width. Desktop top spacing and the calendar's week/date toolbar use reduced padding and smaller controls to leave more room for appointments. Mobile keeps navigation in its existing slide-out menu.
- **Overview:** the 200px desktop sidebar uses a soft blue-grey background and a blue-to-teal default logo, with compact clinic branding and a stacked account/logout footer. It shows Today / This Week / This Month / All Time appointment counts in a compact 2x2 grid of bordered cards with prominent numbers, followed by total patients and patients added this month. A compact appointment-type legend with bordered boxes, color markers, and descriptions sits below patient statistics and above the signed-in user/logout section. Sidebar content can scroll on smaller screens; the mobile menu keeps its wider layout.
- **Personal sidebar preference:** collapse the desktop sidebar to a 56px rail using its toggle or the Desktop sidebar option in Settings. Changes save automatically per signed-in user as `preferences.desktopSidebarCollapsed` in private `users.json`, and restore on login across devices. The mobile menu always stays expanded. Saving failures are shown without changing the current layout; clinic settings and other users are unaffected.
- **Calendar navigation:** a compact, left-aligned toolbar groups Today, previous/next week arrows, and the date-range dropdown. Today returns to the current week; clicking the date range opens the existing date picker.
- **Readability:** darker text, secondary labels, and form borders, with stronger calendar grid lines and full-opacity text on colored appointment blocks.
- **Current appointment:** a 25% darker shade of the appointment's original type color and a gently blinking clock in the top-right corner mark appointments in progress, on desktop and mobile. It updates automatically and replaces the desktop red time line. The clock stays still when reduced motion is enabled.
- **Editing:** reschedule or delete with confirmation. Deletion frees the slot and keeps the patient; Cancel closes without saving. No duplicate details panel or status selector.
- **Branding:** saved practice name controls navigation/tab title. Upload or remove a PNG/JPEG/WebP logo up to 128 KB; stored in Settings JSON.
- **Settings:** working days, default hours plus optional hours per day, desktop calendar row interval (display only), language, export/import, and email/SMS webhook configuration.
- **Statistics:** pick a month to see days worked (days with appointments out of the working days in Settings), appointments, patients (new on their first visit vs returning), and hours worked. A table breaks appointments and hours down by type and compares counts with the previous month. Cancelled and no-show appointments are not counted. Plain tables, no charts.
- **Google Calendar:** disabled for this version; the desktop calendar header control has been removed, while integration controls remain visible but inactive in Settings. Backend `/api/google/*` routes return 503. The `googleapis` dependency has been removed from the backend.

## Data and Deployment

JSON is currently stored in `public/data`: patient records, appointments, settings, and any legacy Google tokens. The directory is hardcoded in [server/index.js](server/index.js); a `DATA_DIR` environment override is not implemented. No offline/localStorage CRUD fallback exists.

**Before deployment, move JSON outside the web root and remove public/build copies.** Recommended layout:

```text
/home/devforge-api/          Backend
/home/devforge-api/data/     Private JSON data
/home/public_html/app/      Frontend only
```

Migration is not implemented yet. Restrict file permissions, use HTTPS, and keep tested private backups. Every API route except `/api/health` and `/api/auth/*` requires a login (see [Authentication](#authentication)); automatic backups are not implemented. `npm run build` removes `public/data` from `dist/`, so patient JSON is never part of the uploaded frontend. Serve `/app/` with SPA fallback and proxy `/api` to the backend; Vite's development proxy does not configure production.

Backend defaults: `HOST=0.0.0.0`, `PORT=3000`. Frontend API override: `VITE_API_BASE_URL`. Changing backend port also requires updating the development proxy/launcher.

### cPanel / Phusion Passenger

- Backend files: [server/index.js](server/index.js) (startup file), [server/app.js](server/app.js) (routes), [server/startup.js](server/startup.js) (startup logging/retry), [server/dataStore.js](server/dataStore.js), and [server/package.json](server/package.json) (only `express` and `cors`).
- Under Passenger, do not set `PORT`. Passenger replaces `http.Server#listen`, ignores the port and host, and binds its own Unix socket. `app.listen(PORT, HOST)` must be called exactly once, and `index.js` must not use top-level `await` because Passenger loads it with `require()`.
- Startup writes one JSON log line per step to the Passenger log: `startup.begin` (including `moduleLoadMs`), `datastore.init.attempt` / `.ok` / `.failed`, `server.listening`, `server.listen.failed`, `startup.failed`, and `process.uncaughtException`. No patient data or tokens are logged.
- Data-store initialization retries only transient file-system errors (`EMFILE`, `ENFILE`, `EAGAIN`, `EBUSY`, `EIO`, `ETIMEDOUT`, …) or a per-attempt timeout, then exits with status 1. Permission and configuration errors such as `EACCES` fail immediately. Optional environment variables, all bounded: `STARTUP_INIT_ATTEMPTS` (default 3, max 5), `STARTUP_INIT_RETRY_DELAY_MS` (default 500), `STARTUP_INIT_TIMEOUT_MS` (default 10000).
- Missing JSON files are created with defaults only when they truly do not exist (`ENOENT`); existing files are never overwritten during initialization.
- Public `/api/health` returns only `{"ok":true}` and reads no files. The Settings health panel uses `/api/health/details` (`dataDir`, `patientsCount`, `appointmentsCount`), which requires a login.

## Authentication

One clinic, one or more administrator accounts, JSON storage (no database).

- **Files:** `users.json` and `sessions.json` in `AUTH_DATA_DIR`, default `../private/auth` relative to the backend folder (on cPanel: `/home/devforge/private/auth`, outside `public_html` and outside `public/data`). Directory `0700`, files `0600`, written atomically (temp file + rename) under a lock file shared by all Passenger processes. A corrupt or unreadable `users.json` makes login fail with a generic 500; it is never overwritten or reset. A corrupt `sessions.json` is renamed to `sessions.json.corrupt-<time>` and everyone signs in again.
- **Passwords:** scrypt (N=2^16, r=8, p=2, random salt; parameters stored per hash). At least 8 characters with one capital letter, one number and one special character. Node 20 has no built-in Argon2id, and no native dependency is added.
- **Sessions:** random 256-bit ID in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`__Host-medical_sid` in production). Only the SHA-256 of the ID is stored, so sessions survive Passenger restarts. The ID is replaced on login and deleted on logout. Expiry: 8 hours idle, 24 hours maximum (`AUTH_SESSION_IDLE_HOURS`, `AUTH_SESSION_MAX_HOURS`). Disabling a user or changing a password signs out that user's sessions.
- **CSRF:** writes need an `X-CSRF-Token` header (derived from the session and returned by `/api/auth/login` and `/api/auth/me`) and, when present, a same-host `Origin`.
- **Rate limiting:** 10 failed logins per e-mail and 20 per client address per 15 minutes (`AUTH_MAX_FAILURES_PER_EMAIL`, `AUTH_MAX_FAILURES_PER_IP`). Counters are in memory, so they reset on restart and are per Passenger process. The client address comes from `X-Forwarded-For` behind Passenger and is best effort; the per-e-mail limit does not depend on it.
- **CORS:** production allows no cross-origin access unless `CORS_ORIGINS` lists exact origins. Development allows localhost and private-network origins.
- **Endpoints:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Everything else under `/api` is deny-by-default: 401 without a valid session, checked before request bodies are parsed.
- **Not included:** registration, password reset, social login, account switching.

### First administrator (run once on the server over SSH)

```bash
source /home/devforge/nodevenv/devforge-api/20/bin/activate && cd /home/devforge/devforge-api
node manage-users.js create --email you@example.com      # prompts twice for the password (hidden)
node manage-users.js list
```

Other commands: `set-password --email …`, `disable --email …`, `enable --email …`. Passwords are never accepted as arguments. If `AUTH_DATA_DIR` is set in the cPanel Node.js app, export the same value in the shell first. Use `chmod 700 /home/devforge/private /home/devforge/private/auth` if the startup log shows `auth.dir.permissions`.

### Deploying to cPanel / Passenger

1. Back up: `cp -a ~/devforge-api ~/devforge-api.bak-$(date +%F)` and `cp -a ~/public/data ~/data-backup-$(date +%F)`, plus the current `public_html/app`.
2. Upload `server/index.js`, `server/app.js`, `server/manage-users.js`, `server/package.json` and the whole `server/auth/` folder to `~/devforge-api/` (do not upload `node_modules`). No new npm packages are needed.
3. Create the administrator (above) **before** the restart, so there is no window without a login.
4. Restart: `touch ~/devforge-api/tmp/restart.txt`. `~/passenger.log` should show `server.listening` followed by `auth.ready` with `activeUsers` 1.
5. Check: `curl -s https://devforge.mk/api/health` returns `{"ok":true}`, and `curl -s -o /dev/null -w '%{http_code}' https://devforge.mk/api/patients` returns `401`.
6. Run `npm run build` locally and upload the contents of `dist/` to `public_html/app/`. Confirm `dist/data` does not exist. Sign in and check patients, appointments and settings.

The backend change and the frontend change must go out together: the old frontend cannot sign in, and the new frontend shows the login page against the old backend because `/api/auth/me` does not exist there.

### Rollback

Patient, appointment and settings files are not modified by this change, so rollback only replaces code:

1. Restore the backed-up `~/devforge-api` files (`index.js`, `app.js`, `package.json`; remove `auth/` and `manage-users.js`) and the previous `public_html/app`.
2. `touch ~/devforge-api/tmp/restart.txt`.
3. `~/private/auth` can stay; it is unused by the old code. Note that the old backend is unauthenticated again.

### Moving to multiple clinics later

Users already carry `accountId` (currently `default`) and handlers receive identity only through `req.auth` (`userId`, `email`, `role`, `accountId`). To add clinics:

- Give every patient, appointment and settings record an owner, either through per-account data files (for example `data/<accountId>/patients.json`, simplest with this JSON store) or an `accountId` field on each record.
- Make `createDataStore` per account and pick it from `req.auth.accountId` in every route; never accept an account ID from the request body or URL without checking membership.
- Replace `users[].accountId` with a membership list (user to account plus role) if one person needs several clinics, then add account switching to the UI.
- Migrate existing data to the `default` account and add tests proving one account cannot read or change another's data.
- At that point a real database becomes worth considering for transactional, per-account isolation.

## Known Limits

- Availability checks are not atomic reservations; simultaneous-device booking still needs server-side overlap enforcement.
- Cancelled records still occupy time; there is no break buffer between appointments.
- Patient and appointment creation are separate writes. If booking fails after patient creation, retry using the saved patient.
- Startup waits for Settings and offers Retry on failure. Concurrent reads are shared; Settings cache lasts five seconds. Some other failures still show empty data, so check backend health if records disappear.

## Development

React 18, TypeScript, Vite, Tailwind, Radix/shadcn, MUI pickers, React Scheduler, date-fns, react-hook-form/Zod, and Express.

```bash
npm run lint
npm run test:e2e
npm run test:e2e:backend
npm run test:server   # Node-only backend startup, auth and API-protection tests, no browser or dev server
```

See [docs/Testing.md](docs/Testing.md). Default E2E configuration selects smoke tests; some legacy tests need updating for current controls and `/app/`. Recent UI changes do not have a verified full regression pass.

`npm run build` creates deployment artifacts. `npm run preview` serves only the frontend, not the API.

## Changelog

### 2026-10-15 - Monthly Statistics

- Added a Statistics tab (desktop tabs and mobile menu) with a month picker, four summary boxes (days worked, appointments, patients new/returning, hours worked) and a per-type table with hours, last month's count and the difference. Only whole numbers and hours/minutes; no averages, percentages or chart library.
- Calculations live in `src/lib/statistics.ts`; the page loads existing appointments and settings, so no backend change is needed.
- Added `tests/e2e/statistics.spec.ts` and Statistics to the navigation smoke test.
- Fixed two smoke tests that opened Settings ("all main navigation items are reachable", "settings page allows saving practice name"): `/api/health/details` is now mocked with the test session, so a running backend no longer answers 401 and sends the app back to the login page.
- E2E tests now run on Chromium only, locally and in CI; the statistics spec is included in the default run.
- The app now redirects plain `http://` to `https://` (except local and private-network hosts). The production session cookie is `Secure`, so over HTTP a fresh login was immediately reported as "session expired" on mobile.

### 2026-10-14 - Personal Sidebar and Booking Defaults

- Added a desktop sidebar collapse/expand toggle and a matching auto-saving option in Settings. Expanded width is 200px; collapsed width is 56px. Mobile navigation stays expanded.
- Sidebar preferences are stored per user in private `users.json` and returned with login/session responses. `PUT /api/auth/preferences` requires a session and CSRF token, validates the preference, and updates only the signed-in user's record.
- Added configurable default durations for the six appointment types and radio buttons to choose the standard type for new appointments. Clinic defaults are stored in Settings JSON; existing appointments retain their saved type and duration.
- Kept type names and the compact "Default" / "Стандарден" radio labels on one row above the duration selector.
- Added targeted backend and browser tests for preference isolation/persistence, mobile behavior, and configurable booking defaults.
- Backend changes require a backend restart; a stale server can return 404 for the new preference endpoint even while the frontend has updated.

### 2026-10-14 - Navigation and Appointment-Type Polish

- Moved desktop navigation into right-aligned tabs in the Calendar, Patients, and Settings page headers, alongside the page action where available. Mobile retains its slide-out menu.
- Moved the appointment-type legend into the sidebar below patient statistics and above the signed-in user/logout section, with compact bordered boxes and English/Macedonian descriptions.
- Added descriptions to the open booking type dropdown while keeping the closed selector limited to the type name and color marker. Hover highlighting is light grey.
- New appointments default to Procedure; existing appointment types are preserved when editing.
- Current appointments use a darker shade of their own type color instead of a fixed blue, on desktop and mobile.
- Desktop appointments without a patient phone number display only the phone icon.
- Removed the inactive Google Calendar control from the desktop calendar header; integration settings remain available.

### 2026-10-14 - Secure Login
- Added a login page (e-mail, password with show/hide, validation, loading state, session-expired notice) and a logout button in the sidebar.
- Added server-side sessions, CSRF protection, login rate limiting and scrypt password hashes stored in a private `users.json`; all patient, appointment, settings and Google API routes now require a login.
- `/api/health` is now minimal; details moved to the authenticated `/api/health/details`.
- 5xx API errors now return a generic message; details stay in the server log.
- Builds no longer include `public/data` in `dist/`.
- Added `server/manage-users.js` for creating the first administrator.

### 2026-10-14 - Sidebar Cleanup

- Removed the "Today Overview" appointment list from the desktop sidebar. The sidebar now holds only the menu, appointment statistics, and patient statistics. The "Today" count remains as a statistic.

### 2026-10-14 - Backend Startup Reliability (Passenger)

- Removed the unused `googleapis` import and dependency. Its routes were already unreachable behind the 503 handler, yet it added about 2.3 s and about 100 MB to every cold start. Module loading now takes about 0.15 s.
- Split the backend into `app.js` (routes, unchanged behavior) and `startup.js` (structured startup logs with durations, bounded initialization retry with a per-attempt timeout, and a non-zero exit on failure). `index.js` is now a thin, Passenger-compatible entry point.
- Data store initialization no longer rewrites a JSON file with defaults when `fs.access` fails for reasons other than "file missing", and it never overwrites an existing file.
- `server/package.json` now declares its real dependencies (`express`, `cors`) with a lockfile.
- Added `npm run test:server` startup and health tests.

### 2026-10-13 - Mobile Patient Picker

- On mobile (under 640px), choosing a patient while booking now opens a centered, inset card instead of the small dropdown. The card has a header with a close button, a search field, and a full-height patient list with larger, easier-to-tap rows. Desktop keeps the existing dropdown.
- The keypad no longer opens automatically, so the full list is visible first. The card resizes to the visible viewport, so the search field and results stay above the on-screen keyboard, and it respects the iPhone safe-area insets.
- Fixed the picker's left side being clipped on iPhone. It now uses its own dialog panel without the shared dialog's centering transform and slide animation.

### 2026-10-12 - Desktop Calendar Readability and Patient Picker Scroll Fix

- Removed the redundant appointment-title text from desktop calendar blocks, since the block color already encodes the appointment type; name and phone are now explicitly left-aligned.
- Non-working days and out-of-hours slots use a noticeably darker disabled background while the half-hour grid lines remain visible, instead of a flat grey block.
- Fixed the booking dialog's patient picker: mouse-wheel and touch/mobile scrolling inside the search dropdown now work (previously only dragging the scrollbar thumb scrolled), by having the list cancel the Dialog's nested scroll lock and drive its own scroll position.

### 2026-10-11 - Calendar and Mobile Polish

- Appointment blocks now show current patient name/phone and appointment title, with missing-phone feedback and no drag-handle dots; dragging still works.
- Equal outer grid insets, a padded darker desktop name area, and a divider above the title. Displayed text: name/phone 14px, title 12px; first/surname wrap without ellipsis.
- Mobile uses inline full names with no separate background, phone/title beneath, a 15/85 time/details layout, and no status badge.
- Expanded sidebar summaries with weekly appointment counts and separate patient totals/new-this-month counts.
- Centered date/weekday headers and corrected grid width so Sunday remains visible.

### October 2026 - Booking and Setup

- Aligned routing with `/app/` and documented single-command backend/frontend startup.
- Standardized 24-hour time controls and 15-minute picker increments.
- Added 45/90-minute durations, a 60-minute default, duration-aware availability, range highlighting, and shorter-gap selection.
- Simplified booking to name-only inline patient creation with one appointment submission.
- Compacted the modal, integrated field labels, separated patient/appointment groups, and removed duplicate edit details and the status selector.
- Added branding/logo settings and replaced the old browser-tab title.
- Disabled Google synchronization while retaining inactive controls and legacy code.
- Added appointment/patient sidebar summaries and compact, equal-width seven-day calendar rendering.
- Shared concurrent API reads, cached Settings briefly, and gated startup on backend Settings with retry feedback.
