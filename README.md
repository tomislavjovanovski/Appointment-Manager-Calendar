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

- **Booking:** 30/45/60/90/120 minutes, 60-minute default, 24-hour format, automatically calculated end time.
- **Availability:** working-day/hour restrictions, overlap checks, 15-minute suggestions, and full-range highlighting. Each slot click tries 60, then 45, then 30 minutes.
- **Patients:** select an existing record or create one with name/surname during booking; complete other details later.
- **Desktop:** seven equal day columns, compact rows, centered headers, and evenly inset appointment blocks showing patient, phone, and title. Patient names wrap on separate first/surname lines.
- **Mobile:** compact cards with approximately 15% for start/end times and 85% for full name, phone, and title. Name stays inline without a separate background; status badges are removed.
- **Overview:** Today / This Week / This Month / All Time appointments, today's clickable list, total patients, and patients added this month.
- **Editing:** reschedule or delete with confirmation. Deletion frees the slot and keeps the patient; Cancel closes without saving. No duplicate details panel or status selector.
- **Branding:** saved practice name controls navigation/tab title. Upload or remove a PNG/JPEG/WebP logo up to 128 KB; stored in Settings JSON.
- **Settings:** working days/hours, calendar interval, language, export/import, and email/SMS webhook configuration.
- **Google Calendar:** disabled for this version; controls remain visible but inactive and backend routes return 503.

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

## Known Limits

- Availability checks are not atomic reservations; simultaneous-device booking still needs server-side overlap enforcement.
- Cancelled records still occupy time; configured break time is not applied as a booking buffer.
- Patient and appointment creation are separate writes. If booking fails after patient creation, retry using the saved patient.
- Startup waits for Settings and offers Retry on failure. Concurrent reads are shared; Settings cache lasts five seconds. Some other failures still show empty data, so check backend health if records disappear.

## Development

React 18, TypeScript, Vite, Tailwind, Radix/shadcn, MUI pickers, React Scheduler, date-fns, react-hook-form/Zod, and Express.

```bash
npm run lint
npm run test:e2e
npm run test:e2e:backend
```

See [docs/Testing.md](docs/Testing.md). Default E2E configuration selects smoke tests; some legacy tests need updating for current controls and `/app/`. Recent UI changes do not have a verified full regression pass.

`npm run build` creates deployment artifacts. `npm run preview` serves only the frontend, not the API.

## Changelog

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
