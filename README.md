# MediCal Appointment Manager

Appointment scheduling and patient management for a small dental practice, primarily a single clinic. The interface supports English and Macedonian, with a weekly desktop calendar and a mobile agenda.

The practice name and logo are configurable. MediCal is the fallback name, not a fixed brand.

## Quick Start

Use Node.js 22 LTS and npm. Run these commands from the repository root:

```bash
npm install
npm run dev
```

This one command starts Vite and starts the JSON backend on port 3000 if its health endpoint is not already responding. Do not start a second backend separately.

- Frontend: `http://localhost:8081/app/`, or the next free port printed by Vite, such as `http://localhost:8082/app/`.
- Backend health: `http://127.0.0.1:3000/api/health`.
- Include the trailing slash in `/app/`. The router uses Vite's base path in both development and production.
- Development requests to `/api` are proxied by Vite to `http://127.0.0.1:3000`.

Stop development with **Ctrl+C**, not Ctrl+Z. Ctrl+Z suspends processes while leaving their ports occupied, which can cause API requests to hang and subsequent starts to fail with `EADDRINUSE`.

Backend changes require a restart: the root development launcher runs the backend with Node, not nodemon. If the launcher reuses an independently started backend, restart that backend too.

## Scheduling

### Calendar and Agenda

- Desktop shows Monday through Sunday in equal-width columns, with centered inline date/weekday headers and a compact time gutter.
- Calendar intervals are configurable in Settings: 15, 30, or 60 minutes. Compact rendering reduces row space while preserving readable time and appointment text.
- Existing appointments outside the configured working hours expand the visible week range instead of appearing incorrectly at the first working-hour row. This does not extend bookable working hours.
- Mobile has an agenda with day selection, week navigation, and access to the same appointment modal.
- Click a calendar cell to prefill its start time. Click an existing appointment to edit or reschedule it; deletion requires confirmation. Drag-and-drop rescheduling is also available.

### Availability and Duration

- New appointments default to **60 minutes**. The duration dropdown offers **30, 45, 60, 90, and 120 minutes**.
- Date/time controls use **24-hour format**. The picker opens from the field as well as its icon; mobile uses a calendar with hour and minute selectors in a nested dialog.
- Non-working days are disabled according to Settings. Start-time availability requires the whole appointment to fit within working hours and not overlap another appointment.
- Start suggestions use 15-minute increments independently of the calendar's display interval. Available, unavailable, and selected times remain visible in a full-width button grid outside the picker, without an internal scrollbar.
- Each time-button click tries **60 minutes**, then **45**, then **30**, choosing the largest that fits. A later click can return to 60 minutes after a shorter selection. Longer durations can be selected manually.
- Opening from a calendar cell applies the same fitting rule once availability loads. Fully unavailable starts are not selected.
- The selected range is highlighted in quarter-hour blocks. For example, 10:15 for 60 minutes highlights 10:15, 10:30, 10:45, and 11:00; the 11:15 end boundary is excluded.
- Only the start date/time is editable. The end is read-only and recalculated from the duration.
- Editing excludes the current appointment from overlap checks. Saved status values are retained; the edit form does not expose a status selector or duplicate read-only details panel.

Availability is a client-side snapshot, not a booking reservation. The save flow re-fetches appointments to check conflicts, but server-side atomic overlap enforcement is still needed to guarantee protection against simultaneous bookings from multiple devices. Cancelled records currently still count as occupied in the availability calculation.

### Fast Patient Creation

Select an existing patient using the searchable selector, or enter just **first name and surname** below it. Submitting the appointment creates the patient first and then saves the appointment; no separate patient-save action is required.

The modal groups Title/Type/Duration and Patient details into separate bordered areas, side by side on desktop and stacked on mobile. Labels remain visible within field borders. Time suggestions span the width above Start, End, and Notes.

Email, phone, date of birth, address, emergency contact, and notes can be completed later from Patients. If patient creation succeeds but appointment saving fails, the patient remains saved and selected for a retry. These two writes are not an atomic transaction.

## Sidebar Overview

- **Appointments:** Today, This Week, This Month, and All Time.
- **Today Overview:** chronological appointment entries showing time, patient, and title. Clicking an entry opens the edit modal on desktop.
- **Patients:** total records and records added this month.
- Weeks start on Monday; date grouping uses the browser's local timezone. Counts include stored appointment records, not only completed visits.
- Loading/error states distinguish unavailable statistics from genuine zero counts. The mobile navigation also shows appointment and patient totals.

## Settings and Branding

Settings includes working days, start/end times, calendar interval, break-time configuration, and language. The obsolete read-only Appointment Duration Types section has been removed; choose appointment durations in the booking modal instead. Break time is stored but is not currently applied as a buffer by the free-start calculation.

The **practice name** appears in navigation and the browser tab. The old `calendaid-hub` tab title has been replaced. A **brand logo** can be uploaded, previewed, or removed from Settings:

- PNG, JPEG, or WebP, up to **128 KB**.
- Saved as a data URL inside the server's settings JSON, rather than a separate uploaded file.
- Appears in desktop and mobile navigation after **Save Settings**.
- Frontend and backend enforce format/size restrictions; the settings API accepts payloads up to 512 KB.

Settings also retains data export/import and email/SMS webhook configuration. Saving updates the shared Settings snapshot and branding immediately.

### Google Calendar Is Disabled

Google Calendar is excluded from this version. Its credential fields, connection controls, dashboard button, and appointment sync checkbox remain visible but disabled. Automatic connection checks are stopped and appointment submission forces synchronization off.

The backend blocks `/api/google/*` with HTTP 503. Integration code and previously stored tokens are retained for possible future use; no Google account or credentials are needed to run this version.

## Backend and Persistence

The app reads and writes data through the Express API. There is **no offline CRUD or localStorage fallback** for patient/appointment persistence.

The current backend storage directory is hardcoded in [server/index.js](server/index.js) as `../public/data`, relative to the server directory:

| File | Contents |
| --- | --- |
| `patients.json` | Patient records |
| `appointments.json` | Appointment records and ISO start/end timestamps |
| `settings.json` | Working hours, language, practice name, logo, and notification settings |
| `google-tokens.json` | Legacy Google tokens, if previously connected |

The data store initializes missing JSON files, queues file writes, and replaces files through temporary-file renames. Back up the data directory before maintenance or import; import creates records and should not be treated as an atomic restore.

### Loading and Backend Synchronization

- Startup waits for saved Settings before rendering the main interface, avoiding a flash of default language/branding. A failed initial Settings request shows a retry action.
- Concurrent reads of the same API endpoint are shared while in flight.
- Successful Settings reads are cached **in memory for five seconds**; saves refresh the cache immediately. This is not offline persistence or push synchronization between devices.
- Calendar appointments and Settings load concurrently. A failed Settings refresh retains the last known Settings snapshot.
- Shared GET requests have a 10-second timeout. Writes are not automatically retried.

Some other data-loading paths still fall back to empty arrays after failures. A rendered empty calendar is therefore not proof that the backend contains no appointments. Confirm backend health when data is unexpectedly missing.

### Configuration

| Setting | Current behavior |
| --- | --- |
| Frontend port | Root launcher starts searching at 8081 and chooses a free port |
| Vite base | `/app/` |
| `VITE_API_BASE_URL` | Optional frontend API override; `/api` is appended if missing |
| Backend `HOST` | Defaults to `0.0.0.0` |
| Backend `PORT` | Defaults to `3000` |
| Data directory | Hardcoded `public/data`; `DATA_DIR` environment override is not implemented |

Changing backend `PORT` does not automatically update Vite's fixed port-3000 proxy or the development launcher's health probe. Keep their configuration aligned.

## Deployment and Data Protection

This is intended for a restricted clinic environment, not an openly accessible patient-data service. API authentication, audit logging, CSRF protection, automatic backups, and compliance certification are not implemented.

**Do not deploy the current JSON directory as public website content.** Vite's `public` files can be served directly and copied into build output, exposing patient records and legacy tokens independently of the API.

A recommended deployment layout is:

```text
/home/devforge-api/          Backend code
/home/devforge-api/data/     Private JSON files
/home/public_html/app/      Frontend files only
```

This layout is a recommendation, not a completed migration. Before deployment:

1. Change the backend data-directory configuration and migrate existing JSON files outside the web root. Preserve the data; remove old public copies and copies in previous build outputs.
2. Limit the private directory to the backend OS user, for example directory permissions 700 and file permissions 600. Keep backups private as well.
3. Bind the backend to loopback when a web server on the same machine proxies `/api`. Do not expose its port directly unless network access is deliberately restricted.
4. Restrict both `/app/` and `/api` to the clinic LAN/VPN or protect both with a web-server login over HTTPS. Moving JSON alone does not protect the CRUD endpoints.
5. Serve the frontend at `/app/`, configure SPA fallback to its index page, and proxy `/api` to the backend. Vite's development proxy does not configure a production web server.
6. Revoke legacy Google tokens if they may have been exposed. Verify backups and a restore procedure before relying on the app for daily scheduling.

For public or multi-user access, add backend authentication and authorization rather than putting a shared secret into frontend code.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 404 opening the frontend | Use the actual Vite port and `/app/` with its trailing slash |
| Backend says port 3000 is in use | Another backend may already be running; the root dev command starts it automatically |
| Requests hang or Settings load slowly | Check `/api/health` and whether the running process was suspended with Ctrl+Z |
| 45-minute booking rejected with an old 30/60/120 message | Restart the backend so it loads the current 30/45/60/90/120 validation |
| Old settings or logo remain after editing | Save Settings, verify API connectivity, and check the running backend instance |
| Calendar event appears before opening hours | Existing historical records may be out of hours; the visible range includes them without extending bookable hours |

## Development and Testing

Main technologies: React 18, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI, MUI date/time pickers, `@aldabil/react-scheduler`, date-fns, react-hook-form, Zod, and Express. The retained Google implementation uses `googleapis` but is disabled.

| Location | Responsibility |
| --- | --- |
| [src/components/appointments/AppointmentDialog.tsx](src/components/appointments/AppointmentDialog.tsx) | Booking/editing, patient creation, availability UI |
| [src/lib/appointmentAvailability.ts](src/lib/appointmentAvailability.ts) | Working-time slots and duration-aware overlap calculations |
| [src/components/dashboard/WeeklyScheduler.tsx](src/components/dashboard/WeeklyScheduler.tsx) | Weekly calendar and event rendering |
| [src/components/dashboard/MobileAgenda.tsx](src/components/dashboard/MobileAgenda.tsx) | Mobile day/week agenda |
| [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) | Branding, appointment overview, statistics |
| [src/components/settings/TabbedSettingsPanel.tsx](src/components/settings/TabbedSettingsPanel.tsx) | Settings, logo upload, integration placeholders, API health |
| [src/lib/storage.ts](src/lib/storage.ts) | API reads/writes and shared Settings cache |
| [src/i18n/I18nContext.tsx](src/i18n/I18nContext.tsx) | Language and startup Settings loading |
| [server/index.js](server/index.js) | API routes and current data-directory configuration |
| [server/dataStore.js](server/dataStore.js) | JSON persistence and input validation |
| [scripts/dev-rollover.js](scripts/dev-rollover.js) | Frontend/backend development launcher |

```bash
npm run lint
npm run test:e2e
npm run test:e2e:backend
npm run test:e2e:ui
npm run test:e2e:report
```

The default Playwright configuration selects the smoke suite locally, with additional browsers on CI. Other suites/configurations are present; see [docs/Testing.md](docs/Testing.md). Some legacy tests still assume older controls, active Google integration, or localStorage behavior and need reconciliation with this release. Tests using `page.goto('/')` also need to account for the `/app/` base path.

Recent UI changes were primarily checked through editor diagnostics and manual feedback; several automated/browser checks were skipped. No verified performance benchmarks or full regression-test pass are claimed here.

For deployment artifacts, the available commands are `npm run build` and `npm run preview`. Preview serves the frontend only and does not start the backend or reproduce the development `/api` proxy.

## Recent Changes (October 2026)

- Aligned routing with `/app/` and documented single-command backend/frontend startup.
- Standardized 24-hour time controls and 15-minute picker increments.
- Added 45/90-minute durations, a 60-minute default, duration-aware availability, range highlighting, and shorter-gap selection.
- Simplified booking to name-only inline patient creation with one appointment submission.
- Compacted the modal, integrated field labels, separated patient/appointment groups, and removed duplicate edit details and the status selector.
- Added branding/logo settings and replaced the old browser-tab title.
- Disabled Google synchronization while retaining inactive controls and legacy code.
- Added appointment/patient sidebar summaries and compact, equal-width seven-day calendar rendering.
- Shared concurrent API reads, cached Settings briefly, and gated startup on backend Settings with retry feedback.
