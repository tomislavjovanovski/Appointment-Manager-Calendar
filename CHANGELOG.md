# Changelog

Notable product and engineering changes to МојаОрдинација, newest first. Dates describe repository changes, not production deployments. Older entries describe the implementation at that time; see the [README](README.md) for current capabilities and limitations.

## 2026-11-01

### Added

- Public **About & features** page at `/app/about`, linked from desktop/mobile login and public-page footers.
- Nine verified dental-practice capabilities in Macedonian and English, with concise benefit-oriented descriptions and responsive feature cards.
- Calendar preview captured from the actual application using fictional demo patients.
- Monthly working-time utilization and completed-visit-based new/returning patient counts and percentage shares.

### Changed

- Settings organized into Practice, Working hours, Appointments and activities, Notifications, User profile, and System and data.
- Patient import/merge and API Health remain separate operational sections; health loading, success and failure states are clearer.
- Calendar grid contrast improved with theme-aware separators, time/day surfaces and full-hour boundary emphasis for 15/30/60-minute intervals.
- Patient-history rows use shared theme tokens.
- README reorganized into current product/setup guidance, a separate [operations guide](docs/Operations.md) and this changelog.
- Documentation now distinguishes supported FZO patient imports and predefined category colors from unsupported general restores or customizable categories/colors. Notifications and automated reminders are not advertised as supported features.

### Verification

- Production build, frontend TypeScript and changed-presentation lint passed after the About implementation.
- About/login regression selection passed **12 tests**, including Macedonian/English copy, public navigation, assets and 375/390/768/1024/1440px layouts.
- The earlier full configured browser run passed **47/49**; two sidebar-branding assertions remained failing and were excluded from the later About/login selection.
- FZO server coverage passed **13/13**.
- Build warnings remain for stale Browserslist data and the large JavaScript bundle.

## 2026-10-31

### Changed

- Rebranded product copy and public/browser/PWA identity to **МојаОрдинација**; English interfaces use **Dental Practice Management**.
- Adopted the supplied transparent calendar/smile PNG directly and regenerated favicon/install/social assets without background removal or cropping.
- Standardized the desktop sidebar to 80px expanded and zero width collapsed across calendar, patients, statistics and settings; retained the saved per-user preference and mobile navigation.
- Aligned custom practice branding and product wordmark in the calendar header.
- Refined desktop appointment-card hierarchy and inset category stripes without changing category colors or appointment positioning.
- Unified desktop control, panel and dialog radii, typography, theme-aware surfaces and focus/hover styling.
- Fixed appointment-dialog corner clipping while preserving the date-picker popup.
- Refined FZO import preview/matching and date handling: EMBG-based matching, missing birth-date derivation and registration-date synchronization.
- Displayed birth/registration dates as `DD.MM.YYYY`, with registration dates read-only in patient details and separate desktop table columns.

## 2026-10-30

### Added

- Shared [patient appointment history](src/components/patients/PatientAppointmentHistory.tsx) in patient and appointment edit dialogs, newest first with date, type and notes.
- Appointment Details/History tabs that preserve unsaved edits and follow the selected patient; creation remains a single form.
- History loading, empty, missing-patient and retry states, plus current-appointment labeling.
- Name-based patient resolution through `POST /api/patients/resolve`, reusing unique matches and requiring explicit selection for ambiguous names.
- Duplicate review/merge through `POST /api/patients/merge`, with appointment reassignment, preserved conflicting details and a recovery journal.
- Patient-deduplication and appointment-history coverage in the configured Chromium suite.

### Changed

- Replaced the separate patient picker with first/last-name suggestions, contextual guidance, delayed local search and paged results for large lists.
- Closing booking clears patient input and pending searches.
- Calendar cards use a subtle category tint and accent; current appointments have stronger emphasis and a clock indicator.
- Serialized data-changing operations to avoid lost writes.

## 2026-10-29

### Added

- Mobile weekly availability snapshot preview with native Share/Download.
- Mobile agenda coverage in the smoke suite.

### Changed

- Continuous mobile agenda scrolling with pinned day/week controls and scroll-following day selection.
- Day/Today actions scroll to the selected day; week arrows select the first working day.
- Stabilized selected-day styling and transitions.
- Simplified patient-dialog history layout, notes sizing and tab heights.

## 2026-10-15

### Added

- Monthly Statistics screen, month navigation, summary values, category breakdown and previous-month comparisons.
- Shared statistics calculations and focused browser coverage.

### Fixed

- Mocked authenticated health checks in Settings tests to avoid false session expiry.
- Redirected public HTTP to HTTPS except on local/private-network hosts, matching production Secure-cookie requirements.

### Changed

- Browser tests standardized on Chromium.

## 2026-10-14

### Added

- Per-user desktop sidebar preference and authenticated `PUT /api/auth/preferences`.
- Configurable appointment-type durations and default category for new bookings.
- Login/logout, password visibility and validation, session-expiry feedback, server sessions, CSRF protection and rate limiting.
- Private auth storage and administrator-management CLI.
- Minimal public health endpoint and authenticated detailed diagnostics.
- Structured startup logging, bounded data-store retries and backend startup/health tests.

### Changed

- Moved desktop navigation into page headers while retaining the mobile menu.
- Refined category labels, descriptions, legend and current-appointment colors.
- Removed inactive Google Calendar controls from the desktop calendar.
- Removed the redundant sidebar Today appointment list, retaining overview counts.
- Split backend startup/routes/persistence responsibilities and declared backend dependencies.
- Excluded private development data from production frontend builds.
- Removed the unused Google API dependency; Google synchronization remained disabled.

### Fixed

- Initialization creates defaults only for missing files, rather than overwriting data after other filesystem errors.
- Backend remains compatible with Passenger's `require()` entry-point loading without top-level `await`.

## 2026-10-13

### Changed

- Introduced an inset mobile patient-picker card with search, improved touch targets, viewport/keyboard sizing and safe-area support. This picker was later replaced by inline name suggestions.

## 2026-10-12

### Changed

- Improved desktop calendar readability, disabled-slot backgrounds and patient text alignment.

### Fixed

- Patient-picker wheel/touch scrolling inside the booking dialog.

## 2026-10-11

### Changed

- Refined desktop/mobile appointment text, grid insets, day headers and sidebar summaries.
- Corrected calendar width so the final day remains visible.

## October 2026 — Initial booking and setup refinements

- Aligned routing with `/app/` and introduced single-command frontend/backend startup.
- Standardized 24-hour time controls and 15-minute picker increments.
- Added 45/90-minute appointment durations and duration-aware availability guidance.
- Simplified inline patient creation and compacted the booking dialog.
- Added practice-name/logo settings and updated browser titles.
- Disabled Google synchronization while retaining legacy settings/code.
- Shared concurrent API reads, cached Settings briefly and added startup retry feedback.
