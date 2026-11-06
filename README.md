# МојаОрдинација

**Едноставно управување со модерна стоматолошка ординација.**

Повеќе ред во ординацијата. Помалку време за администрација.

МојаОрдинација is a practice-management application for independent dentists and small dental practices in North Macedonia. It brings appointments, patient records, and monthly activity together in a Macedonian/English interface, with a weekly desktop calendar and a compact mobile agenda.

It is a tool for dental teams, not a patient-facing dentist directory or a clinical charting system.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Patient Data Management](#patient-data-management)
- [Statistics](#statistics)
- [Development and Testing](#development-and-testing)
- [Architecture and Deployment](#architecture-and-deployment)
- [Brand and Assets](#brand-and-assets)
- [Current Limitations](#current-limitations)
- [Changelog](#changelog)

---

## Overview

МојаОрдинација is organized around four main areas:

| Area | Description |
|---|---|
| **Calendar** | Weekly appointment calendar, booking, and schedule management. |
| **Patients** | Patient records, search, visit history, and duplicate management. |
| **Statistics** | Monthly activity, booked hours, patient counts, and comparisons. |
| **Settings** | Practice configuration, working hours, appointment categories, and data management. |

### Features

**Calendar and appointments**
- Create appointments for new or existing patients.
- Edit, delete, and drag appointments to reschedule on desktop.
- Use color-coded categories for consultations, follow-ups, procedures, cleaning/prevention, prosthetics/orthodontics, and urgent interventions.
- Configure appointment durations: 30, 45, 60, 90, and 120 minutes.
- Configure calendar intervals: 15, 30, or 60 minutes.
- Set category names, colors, default durations, and a default category.
- Search existing patients when booking. Unique matches are reused without overwriting patient details; ambiguous matches require selection.
- Availability guidance considers working days, working hours, existing appointments, and one-off unavailable slots.

Category changes are reflected in booking, calendars, history, legends, and statistics. Existing category IDs and appointment dates/durations remain unchanged. Unedited built-in names follow the selected language; edited and custom names are shared across both languages. Category deletion is not supported.

Availability guidance is not an atomic reservation or a complete server-side overlap guarantee. See [Current Limitations](#current-limitations).

**Patient management**
- Centralized patient directory with searchable desktop tables and mobile cards.
- Patient profiles with contact details, EMBG, birth date, address, emergency contact, and notes.
- Search by name, email, phone, or EMBG.
- Patient appointment counts, latest appointment date, and saved visit history.
- Duplicate detection and merging, with appointment reassignment and preservation of conflicting details.

**Statistics**
- Monthly appointments and unique patients.
- Days with appointments and booked hours.
- Working-time utilization.
- New and returning patients.
- Appointment category breakdowns.
- Comparison with the previous month.

**Mobile experience**
- Continuously scrolling daily agenda.
- Pinned day/week controls and weekly snapshot preview.
- Responsive patient, statistics, and settings screens.
- Weekly availability snapshots can be shared or downloaded without patient names, phone numbers, or notes.

**Practice settings**
- Practice name, logo, and interface language.
- Working days and hours.
- Appointment categories and durations.
- One-off unavailable slots.
- Per-user desktop sidebar preference.

---

## Getting Started

### Requirements

- Node.js 22 LTS
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

Start the development environment:

```bash
npm run dev
```

Open **http://localhost:8081/**.

The development launcher starts the backend first, checks its health, and then starts Vite with an `/api` proxy to `http://127.0.0.1:3000`. It fails visibly if the backend is not ready within 20 seconds or a required port is occupied.

### Administrator Setup

Create a local administrator:

```bash
node server/manage-users.js create --email you@example.com
```

The command prompts for a password twice without displaying it. Authentication files are stored in the Git-ignored private auth directory.

### Development Server

- Change the frontend port with `DEV_PORT=8082 npm run dev` or `npm run dev -- 8082`.
- The API still requires port `3000` unless the launcher and proxy are changed together.
- Backend health check: `http://127.0.0.1:3000/api/health`.
- Frontend edits reload automatically. Restart development after backend changes.
- `Ctrl+C` stops both servers. `Ctrl+Z` also shuts them down instead of leaving them suspended.
- On Linux/WSL, restarting the launcher stops previous development processes from this project, including suspended ones; unrelated services are not stopped.

---

## Patient Data Management

Patient import and duplicate management are available under:

**Settings → System and data → Data management**

### FZO Patient Import

The application supports patient lists downloaded from the FZO portal with active ZO1 registrations.

**Supported formats:**
- Original `.xls` Excel XML (SpreadsheetML).
- The same format with an `.xml` extension.

**Import limits:** 10 MB and 10,000 patient rows.

Binary Excel, `.xlsx`, arbitrary practice-data files, and JSON backup restores are not supported by the current import panel.

**Import workflow:**

1. Download the patient list from the linked FZO portal.
2. Upload the original supported file.
3. Review new patients, updates, unchanged records, duplicate file rows, and records requiring review.
4. Confirm the proposed changes.

Changes are saved only after explicit confirmation.

### Matching and Data Preservation

- EMBG is treated as a 13-digit string, preserving leading zeros.
- Records with the same name but different EMBGs remain separate patients.
- Name fallback matches only existing records without an EMBG.
- Ambiguous matches and possible Latin/Cyrillic equivalents require review.
- Missing EMBG and address fields can be filled during import.
- Valid, non-empty FZO registration dates are synchronized.
- Missing birth dates are derived from valid EMBGs. Existing birth dates are never overwritten.
- Existing patient IDs, contact details, notes, appointments, and patients absent from the import file are preserved.
- Impossible or future dates require review.
- Birth and registration dates are stored as `YYYY-MM-DD` and displayed as `DD.MM.YYYY`.
- Registration dates are read-only in patient details and updated through import.
- Confirmation rejects stale previews and persists the patient list atomically.
- Repeated imports reuse matching patients rather than creating duplicates.
- Recoverable FZO export quirks produce visible warnings. Malformed XML and DTD/entity declarations are rejected.

### Patient Directory and Duplicate Management

The patient directory loads **100 patients per page**, sorted by **Last Visit / Последна посета** (newest first; patients without appointments last).

Search covers the entire directory before pagination. Counts summarize all matching patients, not just the displayed page. The sidebar fetches patient totals without downloading patient records.

With JSON-file storage, the backend still reads source files to filter and sort. Pagination reduces network transfer and browser memory/rendering, not database-level file reads.

Duplicate candidates are grouped by EMBG or, for records without an EMBG, by name.

When merging:
- Select the record to keep and the duplicates to merge.
- Appointments are reassigned to the retained patient.
- Empty fields are filled where possible.
- Conflicting details and notes are preserved in the retained patient's notes.
- Records with different EMBGs cannot be merged.
- Interrupted merges use a recovery journal.

**Back up server data before merging or deleting. There is no in-app undo.** Deleting a patient also deletes all linked appointments. The current Settings page does not provide a general JSON backup/export tool.

---

## Statistics

The Statistics screen supports month navigation, returning to the current month, and comparison with the previous month.

| Metric | Definition |
|---|---|
| **Appointments** | Valid scheduled and completed appointments, including future bookings. Cancelled and no-show records are excluded. |
| **Booked Hours** | Duration of counted appointments. This is not verified attendance or actual staff time. |
| **Days with Appointments** | Days containing counted appointments, shown against configured working days. |
| **Unique Patients** | Patients with counted appointments in the selected month. |
| **Working-Time Utilization** | Non-overlapping booked time compared with configured hours on working days that have counted appointments. Blocked slots are excluded from available time. |
| **New Patients** | Patients whose first completed appointment in retained history falls in the selected month. |
| **Returning Patients** | Patients with completed appointments in the selected month whose first completed appointment occurred earlier. |
| **Category Breakdown** | Appointment counts, booked hours, and month-to-month changes by category. |

Additional notes:
- Scheduled, cancelled, and no-show appointments do not establish a patient's first visit.
- Working-time utilization is not calculated across every configured working day in the month.
- An **Other** category appears only when unknown appointment types occur.
- Deleted history cannot establish a patient's true first visit.
- Failed loads offer a retry.

Calculations are implemented in [`src/lib/statistics.ts`](src/lib/statistics.ts). No separate analytics service is used.

---

## Development and Testing

### Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend together. |
| `npm run build` | Build the production frontend into `dist/`. |
| `npm run preview` | Serve the built frontend only; does not start the API. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit -p tsconfig.app.json` | Check frontend TypeScript. |
| `npm run test:e2e` | Run the configured Chromium browser suite. |
| `npm run test:e2e:backend` | Run the backend-focused browser configuration. |
| `npm run test:server` | Run backend tests without a browser or development server. |
| `node --test tests/unit/fzo-import.test.mjs` | Check the FZO parser using an isolated Chromium page. |
| `npm run test:e2e:report` | Open the Playwright HTML report. |

Install the test browser when needed:

```bash
npx playwright install chromium
```

The [default Playwright configuration](playwright.config.ts) selects smoke, login, statistics, patient-deduplication, and appointment-history specs.

Mocked browser tests verify UI behavior, not live backend persistence. Use the server/backend configurations for the corresponding checks. Some legacy specs outside the default selection still target older controls.

See [`docs/Testing.md`](docs/Testing.md) for additional test-suite background. Consult the current configuration and scripts for supported commands.

---

## Architecture and Deployment

### Technology Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind, Radix/shadcn components, MUI pickers, React Scheduler, date-fns, react-hook-form, and Zod.

**Backend:** Express with JSON-file persistence.

The current deployment model supports **one clinic with one or more administrator accounts**. It is not an isolated multi-clinic or multi-tenant platform.

### Project Structure

| Location | Responsibility |
|---|---|
| [`src/pages/`](src/pages/) | Login, public information, and application entry screens. |
| [`src/components/`](src/components/) | Calendar, patients, statistics, settings, and shared UI. |
| [`src/lib/`](src/lib/) | Storage client, appointment rules, FZO parsing, and statistics. |
| [`server/`](server/) | API routes, persistence, authentication, and startup. |
| [`public/`](public/) | Brand assets and current development data directory. |
| [`tests/`](tests/) | Browser, backend, and parser coverage. |

### Deployment

Production deployment uses Node.js and Passenger.

See [`docs/Operations.md`](docs/Operations.md) for data layout, environment variables, Passenger deployment, administrator management, backups, rollback, and isolated synthetic datasets.

**Important:** Application data must not be exposed through the public web root. Production builds remove `public/data` from `dist/`, but this does not automatically migrate or protect the source data directory.

---

## Brand and Assets

Shared product branding is maintained in [`src/config/brand.json`](src/config/brand.json).

- **МојаОрдинација** remains Cyrillic in both languages.
- English interfaces use **Dental Practice Management**.
- Custom practice names and logos remain configurable.
- Browser titles follow the format `Practice name | МојаОрдинација`.

The [`BrandLogo`](src/components/brand/BrandLogo.tsx) component displays the transparent [`public/brand-icon.png`](public/brand-icon.png) without cropping or background removal. The light calendar body belongs to the original artwork.

Public About styling uses primary blue `#244DDE`, navy `#183153`, light surfaces, and existing theme tokens. Application screens retain their established palette and dark-mode styling.

After changing shared branding or the source icon, run:

```bash
npm run generate:brand
```

This regenerates favicon/install icons, the social preview, and the manifest using the existing Playwright Chromium installation.

The manifest supports standalone installation metadata; it does not introduce a service worker or offline patient-data cache. Internal package, storage, session identifiers, and legacy synthetic-data prefixes remain unchanged for compatibility.

---

## Current Limitations

- **Notifications:** Appointment notifications and automated reminders are not supported product features. Legacy browser-originated webhook controls do not provide a built-in gateway, background scheduler, delivery confirmation, or deduplication.
- **Google Calendar:** Synchronization is disabled; `/api/google/*` returns `503`.
- **Appointment conflicts:** Booking checks are not atomic reservations. Desktop drops reject non-working days and identical occupied start times, but do not enforce every overlap case.
- **Availability:** Cancelled records still occupy availability slots. No inter-appointment buffer is enforced.
- **Patient creation:** Patient and appointment creation are separate writes. If booking fails after creating a patient, retry using the saved patient.
- **Data loading:** Some load failures outside explicit retry screens can resemble empty data. Check backend health before assuming records are absent.
- **Backups and recovery:** No automatic backups, general in-app JSON backup/restore, or in-app undo.
- **Offline support:** No offline patient-data support.
- **Database:** No database migration is currently implemented.
- **Accounts:** No self-registration, password-reset flow, social login, account switching, or multi-clinic data isolation.

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for dated product and engineering changes.

Historical entries describe behavior at the time of implementation. This README describes the current implementation. Neither document implies that changes have been deployed to production.
