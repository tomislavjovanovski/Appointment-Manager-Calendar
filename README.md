# МојаОрдинација

**Едноставно управување со модерна стоматолошка ординација.**

Повеќе ред во ординацијата. Помалку време за администрација.

МојаОрдинација is a practice-management application for independent dentists and small dental practices in North Macedonia. It brings appointments, patient records and monthly activity together in a Macedonian/English interface, with a weekly desktop calendar and a compact mobile agenda.

It is a tool for dental teams, not a patient-facing dentist directory or a clinical charting system.

## Contents

- [Product overview](#product-overview)
- [Quick start](#quick-start)
- [Patient records and FZO import](#patient-records-and-fzo-import)
- [Statistics: what the numbers mean](#statistics-what-the-numbers-mean)
- [Settings and public pages](#settings-and-public-pages)
- [Development and testing](#development-and-testing)
- [Brand and assets](#brand-and-assets)
- [Architecture and deployment](#architecture-and-deployment)
- [Current limitations](#current-limitations)
- [Changelog](CHANGELOG.md)

## Product overview

| Capability | What it does |
|---|---|
| **Прегледен календар за термини** | Weekly calendar with working-hour guidance and color-coded dental categories: consultation, follow-up, procedure, cleaning/prevention, prosthetics/orthodontics and urgent intervention. |
| **Централизирана евиденција на пациенти** | Patient profiles with contact details, EMBG, birth date, address, emergency contact and notes; searchable desktop table and mobile cards. |
| **Брзо закажување и управување со термини** | Book for an existing or new patient, choose category and duration, edit or delete with confirmation, and drag to reschedule on desktop. |
| **Историја на посети** | Saved appointments by patient, newest first, with date, category and notes. Available in patient profiles and existing appointment dialogs. |
| **Месечна статистика и увид во работата** | Monthly appointments, unique patients, days with bookings, booked hours, category breakdowns and comparisons with the previous month. |
| **Пристап од компјутер и мобилен** | Desktop weekly calendar and mobile daily agenda, with responsive patient, statistics and settings screens. |
| **Едноставен увоз на податоци** | Supported FZO patient lists, with a comparison preview, validation and explicit confirmation before changes are saved. |
| **Прилагодување според ординацијата** | Working days/hours, appointment durations, default category, practice name/logo and language. Category names and colors are predefined. |
| **Едноставен систем без непотребна сложеност** | Four main workspace areas: calendar, patients, statistics and settings. |

### Calendar and booking

- Supported appointment durations are **30, 45, 60, 90 and 120 minutes**. Default durations are configurable per category; the calendar interval can be **15, 30 or 60 minutes**.
- Name inputs search existing patients. Saving reuses a unique normalized name match; ambiguous matches require selecting a record. A new record is created only when there is no match. Reusing a patient does not overwrite their details.
- Suggestions update after a 500 ms typing pause, show exact matches first and offer **Show more** for large lists. Identical names include distinguishing contact/date information when available. Closing the dialog clears the search.
- Availability guidance considers working days, daily hours, existing bookings and one-off unavailable slots. An unavailable slot can be added from the booking dialog without creating an appointment.
- Existing appointment dialogs separate **Appointment Details** and **Appointment History**. Switching tabs preserves unsaved edits; history reflects saved records only. Creation remains a single form.
- Desktop cards emphasize the patient name, showing category/time when space permits. Current appointments use a stronger category tint and a clock indicator.
- Mobile provides a continuously scrolling agenda with pinned day/week controls and a weekly snapshot preview for sharing/downloading availability without patient names, phone numbers or notes.

Availability guidance is **not** an atomic reservation or complete server-side overlap guarantee. See [Current limitations](#current-limitations).

## Quick start

Use **Node.js 22 LTS**. From the repository root:

```bash
npm install
npm run dev
```

Open **http://localhost:8081/app/**, keeping the trailing slash.

The development launcher starts the backend first, checks its health, then starts Vite with an `/api` proxy to `http://127.0.0.1:3000`. It fails visibly if the backend is not ready within 20 seconds or a required port is occupied.

Create a local administrator once:

```bash
node server/manage-users.js create --email you@example.com
```

The command prompts for a password twice without displaying it. Authentication files are stored in the Git-ignored private auth directory.

### Development server behavior

- Change the frontend port with `DEV_PORT=8082 npm run dev` or `npm run dev -- 8082`. The API still requires port `3000` unless the launcher and proxy are changed together.
- Check the backend at `http://127.0.0.1:3000/api/health`.
- On Linux/WSL, restarting the launcher stops prior development processes from this project, including suspended ones; unrelated services are not stopped.
- **Ctrl+C** stops both servers. **Ctrl+Z** also shuts them down instead of leaving them suspended.
- Frontend edits reload automatically. Restart development after backend changes.

## Patient records and FZO import

Open **Settings → System and data → Data management** to import patients or review duplicate candidates.

### Supported files and review

1. Open the linked FZO portal and download the patient list with active ZO1 registrations.
2. Upload the original **`.xls` Excel XML (SpreadsheetML)** file, or the same format as **`.xml`**.
3. Review searchable results: new patients, updates, unchanged records, duplicate file rows and rows requiring review.
4. Confirm the proposed changes explicitly.

Binary Excel, `.xlsx`, arbitrary practice-data files and JSON backup restores are **not supported by the current import panel**. Limits are **10 MB** and **10,000 patient rows**.

### Matching and preservation

- EMBG is a **13-digit string**, preserving leading zeros. Records with the same name but different EMBGs remain separate patients.
- Name fallback only matches existing records without an EMBG. Ambiguous matches and possible Latin/Cyrillic equivalents require review.
- Import fills missing EMBG/address fields, creates new patients and synchronizes non-empty valid FZO registration dates. Existing patient IDs, contact details, notes, appointments and patients absent from the file are preserved.
- Missing birth dates are derived from valid EMBGs; existing birth dates are never overwritten. Impossible or future dates require review.
- Birth and registration dates are stored as `YYYY-MM-DD` and displayed as `DD.MM.YYYY`. Registration dates are read-only in patient details and updated through import, not manual editing.
- Confirmation rejects stale previews and persists the patient list atomically. Repeat imports reuse matching patients rather than creating duplicates.
- Recoverable FZO export quirks produce visible warnings. Other malformed XML and DTD/entity declarations are rejected.

### Patient history, merging and deletion

Patient profiles show appointment counts, the latest appointment date and saved appointment history. Switching between details and history preserves unsaved profile edits.

Duplicate candidates are grouped by EMBG, or by name for records without an EMBG. Choose the record to keep and the duplicates to merge, then confirm. Only selected duplicates are removed after their appointments are reassigned; empty fields are filled and conflicting details/notes are preserved in the retained patient's notes. Different EMBGs cannot be merged. Interrupted merges use a recovery journal.

**Back up server data before merging or deleting. There is no in-app undo.** Deleting a patient also deletes all linked appointments. The current Settings page does not provide a general JSON backup/export tool.

## Statistics: what the numbers mean

The Statistics screen supports month navigation, return to the current month and comparison with the previous month.

- **Appointments and booked hours** count valid scheduled/completed appointments, including future bookings. Cancelled and no-show records are excluded. Booked hours are not verified attendance or staff time.
- **Days with appointments** are shown against the number of configured working days.
- **Unique patients** count patients with counted appointments in that month.
- **Working-time utilization** compares non-overlapping booked time against configured hours on working days that have counted appointments. Blocked slots are excluded from available time. It is not utilization across every configured day in the month.
- **New/returning patients** use unique patients with completed appointments. A patient is new when their first completed appointment in retained history falls in the selected month; earlier scheduled/cancelled/no-show records do not make them returning.
- **Category breakdowns** show counts, booked hours and month-to-month changes. An **Other** category appears only when unknown types occur.
- Failed loads offer a retry. Deleted history cannot establish a patient's true first visit.

Calculations live in [statistics.ts](src/lib/statistics.ts); no separate analytics service is used.

## Settings and public pages

Settings stays on one page, organized into:

| Group | Existing controls |
|---|---|
| **Ординација** | Practice name/logo and Macedonian/English language. PNG, JPEG and WebP logos are supported up to 128 KB. |
| **Работно време** | Working days, default/per-day hours, calendar interval and one-off unavailable slots. |
| **Термини и активности** | Default durations and category for new appointments; predefined category colors. Inactive Google Calendar settings remain visible. |
| **Известувања** | Legacy webhook/template/time controls remain in the code. Their presence is not a supported appointment-notification or automated-reminder capability. |
| **Кориснички профил** | Per-user desktop sidebar collapse preference, restored at login. Mobile navigation is unchanged. |
| **Систем и податоци** | Separate patient import/merge and API Health sections. Health includes status, data directory, record counts, last check and manual refresh. |

The public **About & features** page at `/app/about` is accessible from login on desktop/mobile and from public-page footers. It presents the nine capabilities above in Macedonian and English, using actual [desktop calendar](public/about-calendar.png) and [mobile agenda](public/about-mobile.png) captures with clearly labeled fictional demo data.

FAQ, privacy, terms and contact pages are available at `/app/faq`, `/app/privacy`, `/app/terms` and `/app/contact`. Their content is explicitly marked as **placeholder information**, not finalized policy, legal text or support channels.

## Development and testing

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend together. |
| `npm run build` | Create the production frontend in `dist/`. |
| `npm run preview` | Serve the built frontend only; does not start the API. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit -p tsconfig.app.json` | Check frontend TypeScript. |
| `npm run test:e2e` | Run the configured Chromium browser suite. |
| `npm run test:e2e:backend` | Run the backend-focused browser configuration. |
| `npm run test:server` | Run backend tests without a browser or development server. |
| `node --test tests/unit/fzo-import.test.mjs` | Check the FZO parser using an isolated Chromium page. |
| `npm run test:e2e:report` | Open the Playwright HTML report. |

Install the test browser when needed with `npx playwright install chromium`.

The [default Playwright configuration](playwright.config.ts) selects smoke, login, statistics, patient-deduplication and appointment-history specs. Mocked browser tests verify UI behavior, not live backend persistence. Use the server/backend configurations for the corresponding checks. Some legacy specs outside the default selection still target older controls.

[Testing.md](docs/Testing.md) contains additional test-suite background; consult the current configuration and scripts for supported commands.

## Brand and assets

- [brand.json](src/config/brand.json) holds shared product copy and browser metadata. **МојаОрдинација** remains Cyrillic in both languages; English interfaces use **Dental Practice Management**.
- [BrandLogo](src/components/brand/BrandLogo.tsx) displays the supplied transparent [calendar/smile PNG](public/brand-icon.png) without cropping or background removal. The light calendar body belongs to the artwork.
- Public About styling uses primary blue `#244DDE`, navy `#183153`, light surfaces and existing theme tokens. Application screens retain their established palette and dark-mode styling.
- Custom practice names/logos remain configurable. Browser titles retain the product name: `Practice name | МојаОрдинација`.
- Run `npm run generate:brand` after changing shared branding or the source icon to regenerate favicon/install icons, social preview and [manifest](public/manifest.webmanifest). This uses the existing Playwright Chromium installation.
- The manifest supports standalone installation metadata; it does **not** introduce a service worker or offline patient-data cache.
- Internal package/storage/session identifiers and legacy synthetic-data prefixes remain unchanged for compatibility.

## Architecture and deployment

**Frontend:** React 18, TypeScript, Vite, Tailwind, Radix/shadcn components, MUI pickers, React Scheduler, date-fns, react-hook-form and Zod.

**Backend:** Express with JSON-file persistence. The current deployment model is **one clinic with one or more administrator accounts**, not isolated multi-clinic tenancy.

| Location | Responsibility |
|---|---|
| [src/pages/](src/pages/) | Login, public information and application entry screens. |
| [src/components/](src/components/) | Calendar, patients, statistics, settings and shared UI. |
| [src/lib/](src/lib/) | Storage client, appointment rules, FZO parsing and statistics. |
| [server/](server/) | API routes, persistence, authentication and startup. |
| [public/](public/) | Brand assets and the current development data directory. |
| [tests/](tests/) | Browser, backend and parser coverage. |

**Before deployment:** application data must not be exposed through the public web root. Production builds remove `public/data` from `dist/`, but this does not migrate or protect the source data directory automatically.

See [Operations and deployment](docs/Operations.md) for data layout, environment variables, Passenger deployment, administrator management, backups, rollback and isolated synthetic datasets.

## Current limitations

- Appointment notifications and automated reminders are **not supported product features**. Legacy browser-originated webhook controls do not provide a built-in gateway, background scheduler, delivery confirmation or deduplication.
- Google Calendar synchronization is disabled; `/api/google/*` returns `503`.
- Booking checks are not atomic reservations. Desktop drops reject non-working days and identical occupied start times, but do not enforce every overlap case.
- Cancelled records still occupy availability slots; no inter-appointment buffer is enforced.
- Patient and appointment creation are separate writes. If booking fails after creating a patient, retry using the saved patient.
- Some load failures outside the explicit retry screens can resemble empty data; check backend health before assuming records are absent.
- No automatic backups, general in-app JSON backup restore, in-app undo, offline patient-data support or database migration.
- No self-registration, password-reset flow, social login, account switching or multi-clinic data isolation.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for dated product and engineering changes. Historical entries describe behavior at the time; this README describes the current implementation. Neither document implies that changes have been deployed to production.
