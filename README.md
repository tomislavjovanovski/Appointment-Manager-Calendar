# iTermin

**A lightweight appointment and contact management app for independent professionals and small teams.**

iTermin provides a weekly scheduling view, contact records, appointment statistics, and configurable workspace settings in an English/Macedonian interface. It is designed for a single workspace, with a desktop calendar and a compact mobile agenda.

> **Current architecture:** React + TypeScript frontend, Express backend, and JSON-file storage. Google Calendar integration is currently disabled.

## ✨ At a glance

**iTermin** is a lightweight appointment and contact management application for service-based teams, featuring a bilingual interface in English and Macedonian.

- 📅 **Smart scheduling** — Weekly calendar, configurable appointment durations, and availability checks.
- 👥 **Contact management** — Create, search, and manage contact records.
- 📊 **Workspace statistics** — Appointment summaries, contact insights, and monthly reports.
- ⚙️ **Flexible settings** — Configure working hours, appointment defaults, language, and workspace branding.
- 🔐 **Secure authentication** — Administrator accounts, protected API routes, server-side sessions, and CSRF protection.
- 📱 **Responsive interface** — Full weekly calendar on desktop and a compact agenda on mobile.
- 💾 **JSON-based storage** — Lightweight file-based persistence without a database.
- 🚀 **Deployment-ready build** — React frontend and Express backend, with cPanel/Phusion Passenger deployment support.

## 🚀 Features

### 📅 Calendar and appointment booking

- **Weekly desktop calendar** with seven equal day columns, compact time rows, and a date-range picker.
- **Continuous mobile agenda** with compact appointment cards, pinned week/day controls, and a selected date that updates as soon as the next day heading is fully visible near the bottom of the screen. Only the remainder of the current week is prepared initially; the next week is prepared in the background when the last working day comes into view. Day timelines are cached between selection changes. Tap a date or Today to scroll smoothly to that day (respecting reduced-motion preferences); the week arrows jump to the first working day of the previous/next week. The agenda follows configured working days.
- **Mobile week snapshot:** the Snapshot button next to Today creates a PNG of the selected week's working days (booked, free, and unavailable slots). Patient names are replaced by a blurred placeholder, and phone numbers and notes are left out, so no patient data is in the image. A preview modal offers **Share** (native iOS/Android share sheet, e.g. Viber, Facebook, Instagram, Save to Photos; requires HTTPS) and **Download**.
- **Appointment durations** of 30, 45, 60, 90, and 120 minutes, using a 24-hour time format and automatically calculated end times.
- **Configurable booking defaults:** choose the default appointment type and set a default duration for each type. Existing appointments keep their saved type and duration when edited.
- **Six color-coded appointment types:**
  - 🔵 Blue — Consultation
  - 🟦 Teal — Follow-up
  - 🟠 Orange — Procedure
  - 🟩 Green — Cleaning & prevention
  - 🟣 Purple — Prosthetics & orthodontics
  - 🔴 Red — Urgent appointment
- **Availability guidance** based on working days and hours, with overlap checks, 15-minute suggestions, and highlighted time ranges.
- **One-off unavailable slots:** mark a specific desktop or mobile time slot as non-working from the booking dialog; it is persisted without creating an appointment and removed from future booking suggestions.
- **Appointment management:** edit or reschedule appointments, or delete them with confirmation.
- **Current appointment indicator:** an appointment in progress is highlighted with a darker shade of its type color and a clock indicator.

### 🦷 Patient management

- Select an existing patient or create a patient with a first and last name while booking.
- Complete additional patient details later.
- Searchable patient selection on mobile, with a layout designed to remain usable when the on-screen keyboard is open.
- Patient overview counts, including total patients and patients added during the current month.

### 📊 Clinic overview and statistics

- Compact overview of appointments for **Today**, **This Week**, **This Month**, and **All Time**.
- Patient totals and new-patient counts.
- Monthly statistics for days worked, appointments, new versus returning patients, and hours worked.
- Per-appointment-type breakdown with appointment counts, hours, and comparison with the previous month.
- Cancelled and no-show appointments are excluded from monthly statistics.

### ⚙️ Settings and personalization

- Configure working days, default working hours, and optional hours for individual days.
- Manage one-off unavailable time slots without changing recurring working-day settings.
- Set the desktop calendar row interval.
- Switch between English and Macedonian.
- Configure the practice name and upload or remove a PNG, JPEG, or WebP logo (up to 128 KB).
- Configure email/SMS webhook settings.
- Collapse the desktop sidebar; the preference is saved per user and restored at login. Mobile navigation remains expanded.
- Export and import data through Settings.

### 🔐 Login and access control

- Administrator login and logout.
- Server-side sessions with secure cookies in production.
- CSRF protection and login rate limiting.
- Patient, appointment, and settings API routes require authentication.
- User and session files are stored separately from the public frontend.

### 🔌 Current integration status

**Google Calendar synchronization is disabled in this version.** The desktop calendar control has been removed. Integration settings remain visible but inactive, and backend `/api/google/*` routes return HTTP `503`.

## Quick start

Use **Node.js 22 LTS**. Run these commands from the repository root:

```bash
npm install
npm run dev
```

This starts a fresh frontend and backend together. On Linux/WSL, the launcher stops previous development processes from this project, including suspended ones, before starting again. It does not kill unrelated services.

- Open `http://localhost:8081/app/`. **Keep the trailing slash.** The port is fixed; the launcher never silently switches to another port.
- To choose another frontend port, use `DEV_PORT=8082 npm run dev` or `npm run dev -- 8082`.
- Check backend health at `http://127.0.0.1:3000/api/health`.
- During development, Vite proxies `/api` requests to the backend.
- The frontend starts only after the backend passes its health check. Startup fails with a clear error if the backend does not become ready within 20 seconds.
- Stop development with **Ctrl+C**. Ctrl+Z also shuts down the servers and releases their ports rather than leaving them suspended.
- After backend code changes, stop and rerun `npm run dev`. Frontend changes still reload automatically.
- If a port belongs to an unrelated service, stop that service yourself or choose another frontend port. The API requires port `3000`.

Create a local administrator account once:

```bash
cd server
node manage-users.js create --email you@example.com
```

The command prompts for a password. Authentication files are stored in the private auth directory, which is ignored by Git.

## Data and deployment

### Data storage and file layout

iTermin currently uses **JSON files**, not a database.

| Data | Storage |
|---|---|
| Patients, appointments, clinic settings | `public/data/` in the current development layout |
| Administrator accounts and sessions | `AUTH_DATA_DIR`, defaulting to `../private/auth` relative to the backend |
| Frontend deployment files | `dist/`, uploaded to `public_html/app/` |

The data directory is currently hardcoded in [`server/index.js`](server/index.js). A `DATA_DIR` environment override is **not implemented**.

**Important before production deployment:** move application JSON data outside the public web root and remove any old data copies from public/build directories. The recommended layout is:

```text
/home/devforge-api/           # Backend application
/home/devforge-api/data/      # Private application JSON data
/home/devforge/private/auth/  # Private users.json and sessions.json
/home/public_html/app/        # Frontend files only
```

The migration to this layout is not implemented automatically. Plan and verify the data move before relying on it in production. Restrict file permissions, use HTTPS, and keep tested private backups. Automatic backups are not implemented.

The production frontend build excludes `public/data` from `dist/`, so patient JSON should not be included in the uploaded frontend. After building, verify that `dist/data` does not exist.

### Environment configuration

| Variable | Purpose |
|---|---|
| `HOST` | Backend bind host; defaults to `0.0.0.0` |
| `PORT` | Backend port; defaults to `3000` for a normal Node.js process |
| `VITE_API_BASE_URL` | Optional frontend API base URL |
| `AUTH_DATA_DIR` | Private directory for `users.json` and `sessions.json` |
| `AUTH_SESSION_IDLE_HOURS` | Session idle timeout; defaults to 0 (disabled — sessions last until logout) |
| `AUTH_SESSION_MAX_HOURS` | Maximum session lifetime; defaults to 0 (disabled — the cookie is kept for up to 400 days and refreshed on activity) |
| `AUTH_MAX_FAILURES_PER_EMAIL` | Failed-login limit per email |
| `AUTH_MAX_FAILURES_PER_IP` | Failed-login limit per client address |
| `CORS_ORIGINS` | Exact production origins permitted for cross-origin access |
| `STARTUP_INIT_ATTEMPTS` | Startup data-store initialization attempts; default 3, maximum 5 |
| `STARTUP_INIT_RETRY_DELAY_MS` | Delay between initialization retries; default 500 ms |
| `STARTUP_INIT_TIMEOUT_MS` | Timeout per initialization attempt; default 10,000 ms |

If you change the backend port in a standard Node.js setup, update the development proxy/launcher as well.

### Deploying to cPanel / Phusion Passenger

The backend is designed to run under **Phusion Passenger** on cPanel. Passenger manages the application process and socket.

#### Passenger requirements

- Do **not** set `PORT` for the Passenger app. Passenger replaces `http.Server#listen` and manages its own Unix socket.
- `app.listen(PORT, HOST)` must be called exactly once.
- `server/index.js` must not use top-level `await`, because Passenger loads the entry point with `require()`.
- Backend entry point: [`server/index.js`](server/index.js).
- API routes: [`server/app.js`](server/app.js).
- Startup logging and retry logic: [`server/startup.js`](server/startup.js).
- Data access: [`server/dataStore.js`](server/dataStore.js).
- Backend dependencies are `express` and `cors`, declared in [`server/package.json`](server/package.json).

#### Deployment checklist

1. **Back up the current deployment and data.**

   ```bash
   cp -a ~/devforge-api ~/devforge-api.bak-$(date +%F)
   cp -a ~/public/data ~/data-backup-$(date +%F)
   ```

   Also back up the current `public_html/app` frontend directory.

2. **Upload the backend files** to `~/devforge-api/`:
   - `server/index.js`
   - `server/app.js`
   - `server/manage-users.js`
   - The complete `server/auth/` directory
   - The backend package files, including `server/package.json`

   Do not upload `node_modules`. The current backend changes do not require new npm packages.

3. **Create the first administrator** before restarting the backend. See [Creating the first administrator](#creating-the-first-administrator).

4. **Restart the Passenger application.**

   ```bash
   touch ~/devforge-api/tmp/restart.txt
   ```

   Check `~/passenger.log` for `server.listening` followed by `auth.ready` with `activeUsers` set to `1`.

5. **Verify the API responses.**

   ```bash
   curl -s https://devforge.mk/api/health
   curl -s -o /dev/null -w '%{http_code}' https://devforge.mk/api/patients
   ```

   Expected results:
   - `/api/health` returns `{"ok":true}`.
   - `/api/patients` returns `401` when no valid session is provided.

6. **Build and upload the frontend.**

   Run locally from the repository root:

   ```bash
   npm run build
   ```

   Upload the contents of `dist/` to `public_html/app/`. Confirm `dist/data` does not exist.

7. **Verify the deployed app.**
   - Open `/app/` over HTTPS.
   - Sign in with the administrator account.
   - Check patients, appointments, and settings.
   - Confirm the API is routed to Passenger and that protected endpoints require login.

> **Deploy the frontend and backend authentication changes together.** The new frontend cannot sign in against an older backend that does not provide `/api/auth/me`; the older frontend is not compatible with the new login flow either.

#### Startup logs and troubleshooting

Passenger startup logs are written as one JSON line per step. Relevant events include:

- `startup.begin` (including `moduleLoadMs`)
- `auth.init.begin` and `auth.init.ok`
- `datastore.init.attempt`, `datastore.init.ok`, and `datastore.init.failed`
- `server.listening` and `server.listen.failed`
- `auth.request.completed` for `/api/auth/me` and `/api/auth/login`, including status and duration
- `startup.failed`
- `process.uncaughtException`

No patient data or tokens are logged.

Data-store initialization retries transient filesystem errors (such as `EMFILE`, `ENFILE`, `EAGAIN`, `EBUSY`, `EIO`, and `ETIMEDOUT`) or a per-attempt timeout. Permission/configuration errors such as `EACCES` fail immediately. Missing JSON files are created with defaults only when they truly do not exist (`ENOENT`); existing files are not overwritten during initialization.

### Local synthetic performance data

The repository includes a local-only generator for creating 1,000 synthetic patients and 2,000 synthetic appointments. It starts with the previous, current, and next calendar month, then extends the end date when the read-only current schedule does not have enough non-overlapping capacity. This keeps the current settings unchanged while ensuring the requested appointment count can be scheduled.

The generator writes only to a dedicated directory below `.local/` and defaults to `.local/synthetic-data`. It refuses writes unless `NODE_ENV=development`, `ITERMIN_LOCAL_ONLY=1`, and the process is not running under Passenger. The default mode is a dry-run preview:

```bash
npm run generate:synthetic
```

To explicitly write the isolated dataset:

```bash
ITERMIN_LOCAL_ONLY=1 NODE_ENV=development npm run generate:synthetic -- --write --confirm-synthetic-data
```

Use `--seed <value>` for a repeatable alternative schedule. A manifest records generated IDs and prevents silent repair or duplication if generated records are changed or removed. The generator preserves unrelated records in the target directory and rejects unsafe targets; it does not delete or replace data. Inspect the preview, including the computed first and last dates, before writing, and remove `.local/synthetic-data` manually when the isolated dataset is no longer needed. The date range changes with the local calendar date even when the seed stays the same.

To run the local app against that isolated dataset, start the existing development workflow with the guarded override:

```bash
ITERMIN_LOCAL_ONLY=1 NODE_ENV=development ITERMIN_LOCAL_DATA_DIR="$PWD/.local/synthetic-data" npm run dev
```

This override is rejected outside development, under Passenger, or for directories outside `.local/`. The repository's normal `public/data` directory and its `settings.json` remain unchanged.

The public `/api/health` endpoint returns only `{"ok":true}` and does not read data files. The detailed health panel in Settings uses `/api/health/details`, which requires login and reports the data directory and record counts.

### Creating the first administrator

Run once on the server over SSH:

```bash
source /home/devforge/nodevenv/devforge-api/20/bin/activate
cd /home/devforge/devforge-api

node manage-users.js create --email you@example.com
node manage-users.js list
```

The create command prompts for the password twice without displaying it. Other available commands:

```bash
node manage-users.js set-password --email you@example.com
node manage-users.js disable --email you@example.com
node manage-users.js enable --email you@example.com
```

Passwords are never accepted as command-line arguments.

If `AUTH_DATA_DIR` is configured in the cPanel Node.js app, export the same value in the SSH shell before running the management script. If startup logs show `auth.dir.permissions`, check that the private directory permissions are correct:

```bash
chmod 700 /home/devforge/private /home/devforge/private/auth
```

### Rollback

The authentication deployment does not modify patient, appointment, or settings records. To roll back the code:

1. Restore the backed-up backend files (`index.js`, `app.js`, and `package.json`), and remove the new `auth/` directory and `manage-users.js` from the deployed backend.
2. Restore the previous `public_html/app` frontend.
3. Restart Passenger:

   ```bash
   touch ~/devforge-api/tmp/restart.txt
   ```

The private auth directory can remain in place; the old code does not use it. **Important:** rolling back to the old backend restores the previous unauthenticated API behavior.

## Authentication and security

iTermin currently supports **one clinic with one or more administrator accounts**. It does not yet support registration, password reset, social login, or account switching.

- **Storage:** `users.json` and `sessions.json` live in `AUTH_DATA_DIR`, defaulting to `../private/auth` relative to the backend. On cPanel, use `/home/devforge/private/auth`, outside `public_html` and outside `public/data`.
- **Permissions:** the auth directory should use `0700` permissions and its files `0600`. Writes are atomic (temporary file plus rename) and protected by a lock file shared by Passenger processes.
- **Password hashing:** scrypt with `N=2^16`, `r=8`, `p=2`, and a random salt. Passwords must be at least 8 characters and include one uppercase letter, one number, and one special character.
- **Sessions:** random 256-bit session IDs in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Production uses `__Host-medical_sid`. Only the SHA-256 hash of the session ID is stored. Sessions expire after 8 hours idle or 24 hours maximum by default.
- **Session invalidation:** login replaces the session ID; logout deletes it. Disabling a user or changing their password signs out that user's sessions.
- **CSRF protection:** write requests require an `X-CSRF-Token` header. The token is returned by `/api/auth/login` and `/api/auth/me`; a same-host `Origin` is also checked when present.
- **Login rate limiting:** defaults to 10 failed attempts per email and 20 per client address per 15 minutes. Counters are in memory, so they reset on restart and are per Passenger process.
- **CORS:** production denies cross-origin access unless `CORS_ORIGINS` lists exact origins. Development allows localhost and private-network origins.
- **API protection:** `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` are the authentication endpoints. Other `/api` routes are deny-by-default and return `401` without a valid session.

A corrupt or unreadable `users.json` causes login to fail with a generic server error; it is not automatically overwritten or reset. If `sessions.json` is corrupt, it is renamed to `sessions.json.corrupt-<time>` and users must sign in again.

## Known limitations

- Availability checks are not atomic reservations. Server-side overlap enforcement is still needed to prevent simultaneous bookings from different devices.
- Cancelled records still occupy time slots; there is no buffer between appointments.
- Patient creation and appointment creation are separate writes. If booking fails after the patient is created, retry using the saved patient.
- Startup waits for Settings and offers a retry if loading fails. Concurrent reads are shared and Settings is cached for five seconds. Some other failures may still show empty data, so check backend health if records appear to be missing.
- Automatic backups are not implemented.
- Google Calendar synchronization is disabled.
- Multi-clinic isolation and database migration are not implemented.

## Development and testing

### Tech stack

- React 18 and TypeScript
- Vite and Tailwind CSS
- Radix/shadcn UI components and MUI pickers
- React Scheduler
- date-fns
- react-hook-form and Zod
- Express

### Commands

```bash
npm run lint
npm run test:e2e
npm run test:e2e:backend
npm run test:server
```

`npm run test:server` runs Node-only backend startup, authentication, and API-protection tests. It does not require a browser or development server.

See [`docs/Testing.md`](docs/Testing.md) for testing details. The default E2E configuration selects smoke tests; some legacy tests may need updating for current controls and the `/app/` route. A complete regression pass for all recent UI changes has not been verified.

Build deployment artifacts with:

```bash
npm run build
```

Run the frontend preview with:

```bash
npm run preview
```

**Note:** `npm run preview` serves only the frontend; it does not start or serve the API.

## Future multi-clinic support

The current model is for one clinic. User records already contain `accountId` (currently `default`), and handlers obtain identity through `req.auth` (`userId`, `email`, `role`, `accountId`).

When adding multiple clinics:

1. Assign each patient, appointment, and settings record an owner. Options include per-account data files (for example, `data/<accountId>/patients.json`) or an `accountId` field on every record.
2. Create a data store per account and select it using `req.auth.accountId` in every route. Never trust an account ID supplied in a request body or URL without checking membership.
3. If one user can access several clinics, replace `users[].accountId` with a membership list and add account switching to the UI.
4. Migrate existing data to the `default` account.
5. Add tests proving one account cannot read or modify another account's data.

At that point, a database may be worth considering for transactional writes and account isolation.



## Changelog

### 2026-10-29 - Mobile Agenda and Patient Dialog Polish

- Mobile agenda is now a continuous Teams-style scroll: day/week controls stay pinned, and the selected day follows scrolling. The selection switches when the next day heading becomes fully visible near the bottom of the screen. The remainder of the current week loads first; the following week is prepared in the background when the last day comes into view.
- Tapping a day or Today scrolls smoothly to it; the previous/next week arrows now select the first working day of that week instead of keeping the same weekday.
- Day buttons no longer shift when selected (all buttons have a border; the active one is blue with a blue border). The selected state cross-fades in 0.5s, with background, text, and the free-slot badge changing in sync, so no white-on-white flash.
- Added a mobile **Snapshot** button that creates a privacy-safe image of the selected week (blurred placeholder names, no phone numbers or notes) with a preview modal offering native Share and Download (`src/lib/scheduleSnapshot.ts`, `src/components/dashboard/SnapshotDialog.tsx`).
- Patient edit dialog: appointment history entries use a vertical divider between date/type and note; the Notes field is shorter, with labels aligned to the date of birth and address fields; Details and History tabs share the same content-based height.
- Added mobile agenda E2E tests to `tests/e2e/smoke.spec.ts`.

### 2026-10-15 - Monthly Statistics

- Added a Statistics tab (desktop tabs and mobile menu) with a month picker, four summary boxes (days worked, appointments, patients new/returning, hours worked) and a per-type table with hours, last month's count and the difference. Only whole numbers and hours/minutes; no averages, percentages or chart library.
- Calculations live in `src/lib/statistics.ts`; the page loads existing appointments and settings, so no backend change is needed.
- Added `tests/e2e/statistics.spec.ts` and Statistics to the navigation smoke test.
- Fixed two smoke tests that opened Settings ("all main navigation items are reachable", "settings page allows saving practice name"): `/api/health/details` is now mocked with the test session, so a running backend no longer answers 401 and sends the app back to the login page. The console-errors smoke test now uses the mocked-data fixture for the same reason.
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
