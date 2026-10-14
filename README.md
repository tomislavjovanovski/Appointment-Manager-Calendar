# MediCal Appointment Manager

Scheduling and patient management for a single dental practice. English/Macedonian interface, weekly desktop calendar, and compact mobile agenda. Practice name and logo are configurable.

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
- Restart after backend changes, including duration-validation updates.

## Features

- **Booking:** 30/45/60/90/120 minutes, 30-minute default, 24-hour format, automatically calculated end time.
- **Availability:** working-day/hour restrictions, overlap checks, 15-minute suggestions, and full-range highlighting. A slot click uses the selected duration, or the largest shorter one that fits.
- **Patients:** select an existing record or create one with name/surname during booking; complete other details later. On mobile, the patient picker opens as a searchable card that stays above the on-screen keyboard.
- **Desktop:** seven equal day columns, compact rows, centered headers, and evenly inset appointment blocks showing patient and phone, left-aligned, color-coded by appointment type (the title text is no longer repeated on the block). Patient names wrap on separate first/surname lines. Non-working days/hours are shown with a clearly darker disabled background while keeping the half-hour grid lines visible.
- **Mobile:** compact cards with approximately 15% for start/end times and 85% for full name, phone, and title. Name stays inline without a separate background; status badges are removed.
- **Overview:** the desktop sidebar shows the menu plus statistics only: Today / This Week / This Month / All Time appointment counts, total patients, and patients added this month.
- **Editing:** reschedule or delete with confirmation. Deletion frees the slot and keeps the patient; Cancel closes without saving. No duplicate details panel or status selector.
- **Branding:** saved practice name controls navigation/tab title. Upload or remove a PNG/JPEG/WebP logo up to 128 KB; stored in Settings JSON.
- **Settings:** working days, default hours plus optional hours per day, desktop calendar row interval (display only), language, export/import, and email/SMS webhook configuration.
- **Google Calendar:** disabled for this version; controls remain visible but inactive and backend `/api/google/*` routes return 503. The `googleapis` dependency has been removed from the backend.

## Data and Deployment

JSON is currently stored in `public/data`: patient records, appointments, settings, and any legacy Google tokens. The directory is hardcoded in [server/index.js](server/index.js); a `DATA_DIR` environment override is not implemented. No offline/localStorage CRUD fallback exists.

**Before deployment, move JSON outside the web root and remove public/build copies.** Recommended layout:

```text
/home/devforge-api/          Backend
/home/devforge-api/data/     Private JSON data
/home/public_html/app/      Frontend only
```

Migration is not implemented yet. Restrict file permissions and LAN/VPN access to both app and API, use HTTPS, and keep tested private backups. API authentication and automatic backups are not implemented. Serve `/app/` with SPA fallback and proxy `/api` to the backend; Vite's development proxy does not configure production.

Backend defaults: `HOST=0.0.0.0`, `PORT=3000`. Frontend API override: `VITE_API_BASE_URL`. Changing backend port also requires updating the development proxy/launcher.

### cPanel / Phusion Passenger

- Backend files: [server/index.js](server/index.js) (startup file), [server/app.js](server/app.js) (routes), [server/startup.js](server/startup.js) (startup logging/retry), [server/dataStore.js](server/dataStore.js), and [server/package.json](server/package.json) (only `express` and `cors`).
- Under Passenger, do not set `PORT`. Passenger replaces `http.Server#listen`, ignores the port and host, and binds its own Unix socket. `app.listen(PORT, HOST)` must be called exactly once, and `index.js` must not use top-level `await` because Passenger loads it with `require()`.
- Startup writes one JSON log line per step to the Passenger log: `startup.begin` (including `moduleLoadMs`), `datastore.init.attempt` / `.ok` / `.failed`, `server.listening`, `server.listen.failed`, `startup.failed`, and `process.uncaughtException`. No patient data or tokens are logged.
- Data-store initialization retries only transient file-system errors (`EMFILE`, `ENFILE`, `EAGAIN`, `EBUSY`, `EIO`, `ETIMEDOUT`, …) or a per-attempt timeout, then exits with status 1. Permission and configuration errors such as `EACCES` fail immediately. Optional environment variables, all bounded: `STARTUP_INIT_ATTEMPTS` (default 3, max 5), `STARTUP_INIT_RETRY_DELAY_MS` (default 500), `STARTUP_INIT_TIMEOUT_MS` (default 10000).
- Missing JSON files are created with defaults only when they truly do not exist (`ENOENT`); existing files are never overwritten during initialization.
- `/api/health` still returns `dataDir`, `patientsCount`, and `appointmentsCount` for the Settings panel. That reveals the server path and patient count to anyone who can reach the API, so keep the API restricted, or remove those fields together with the Settings health panel.

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
npm run test:server   # Node-only backend startup/health tests, no browser or dev server
```

See [docs/Testing.md](docs/Testing.md). Default E2E configuration selects smoke tests; some legacy tests need updating for current controls and `/app/`. Recent UI changes do not have a verified full regression pass.

`npm run build` creates deployment artifacts. `npm run preview` serves only the frontend, not the API.

## Changelog

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
