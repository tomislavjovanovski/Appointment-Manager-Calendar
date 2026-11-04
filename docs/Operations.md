# Operations and deployment

Operational reference for МојаОрдинација. For product capabilities and local startup, see the [README](../README.md).

## Contents

- [Data storage](#data-storage)
- [Environment configuration](#environment-configuration)
- [Administrator management](#administrator-management)
- [Authentication behavior](#authentication-behavior)
- [cPanel / Phusion Passenger](#cpanel--phusion-passenger)
- [Startup logs and troubleshooting](#startup-logs-and-troubleshooting)
- [Backups and rollback](#backups-and-rollback)
- [Isolated synthetic data](#isolated-synthetic-data)
- [Future multi-clinic support](#future-multi-clinic-support)

## Data storage

The application uses **JSON files**, not a database.

| Data | Current location |
|---|---|
| Patients, appointments, settings and legacy Google tokens | `public/data/`, relative to the repository root |
| Users and sessions | `AUTH_DATA_DIR`, or `private/auth/` beside `server/` by default |
| Built frontend | `dist/`, deployed at the domain root |

[server/index.js](../server/index.js) fixes the normal application-data path to `../public/data` relative to the backend. A general production `DATA_DIR` environment override is **not implemented**. The guarded local override below is for development only.

**Do not expose application JSON through a public web directory.** A recommended production layout separates:

```text
backend/             # Server code, outside the public web root
private/data/        # Patients, appointments and settings
private/auth/        # Users and sessions
public_html/         # Built frontend only, when the domain document root is public_html
```

This layout is a recommendation, not an automatic migration or an existing production path override. Moving the data requires updating the backend's path configuration, preserving all records and verifying access before restart.

The [Vite build](../vite.config.ts) removes copied `public/data` from `dist/`. Verify `dist/data` is absent before uploading. Also remove obsolete publicly served data copies through a separately reviewed migration. Build exclusion alone does not protect the source directory or development server.

Keep tested private backups and restrict filesystem access. Automatic backups and a general in-app backup/restore workflow are not implemented.

## Environment configuration

| Variable | Purpose / default |
|---|---|
| `NODE_ENV` | Use `production` for a normal production Node process. Passenger is also recognized as production by authentication. |
| `HOST` | Backend bind host; `0.0.0.0`. |
| `PORT` | Backend port; `3000` for ordinary Node. **Do not set for Passenger.** |
| `DEV_PORT` | Frontend development port; `8081`. |
| `VITE_API_BASE_URL` | Optional frontend API base URL, set when building the frontend. |
| `AUTH_DATA_DIR` | Private users/session directory; defaults to `../private/auth` relative to `server/`. |
| `AUTH_SESSION_IDLE_HOURS` | Idle timeout; `0` disables it. |
| `AUTH_SESSION_MAX_HOURS` | Maximum session lifetime; `0` disables it. |
| `AUTH_MAX_FAILURES_PER_EMAIL` | Failed-login limit per email; `10` per 15 minutes. |
| `AUTH_MAX_FAILURES_PER_IP` | Failed-login limit per client address; `20` per 15 minutes. |
| `CORS_ORIGINS` | Comma-separated exact origins allowed for cross-origin access. |
| `STARTUP_INIT_ATTEMPTS` | Data-store initialization attempts; `3`, maximum `5`. |
| `STARTUP_INIT_RETRY_DELAY_MS` | Initialization retry delay; `500` ms. |
| `STARTUP_INIT_TIMEOUT_MS` | Timeout per initialization attempt; `10,000` ms. |

If changing a normal backend port, update the development launcher and Vite proxy together. Do not place credentials in frontend environment variables: Vite values are part of the public bundle.

## Administrator management

From the repository root:

```bash
node server/manage-users.js create --email you@example.com
node server/manage-users.js list
node server/manage-users.js set-password --email you@example.com
node server/manage-users.js disable --email you@example.com
node server/manage-users.js enable --email you@example.com
```

For a deployment where the contents of `server/` are the application root, run `node manage-users.js ...` from that directory instead. Activate the hosting provider's Node environment first if required.

Creation and password changes prompt without displaying the password. Passwords are never accepted as command-line arguments. Use the same `AUTH_DATA_DIR` in the management shell and running backend.

The private auth directory should have mode `0700`; auth files should have mode `0600`. If `auth.dir.permissions` appears in logs, check the resolved directory and correct permissions on that specific path.

## Authentication behavior

The current application supports **one clinic with one or more administrator accounts**.

- Passwords use scrypt (`N=2^16`, `r=8`, `p=2`) and a random salt. Minimum requirements: eight characters, one uppercase letter, one number and one special character.
- Session IDs are random 256-bit values; only their SHA-256 hashes are persisted. Cookies are `HttpOnly`, `SameSite=Strict` and `Secure` in the normal production configuration, using `__Host-medical_sid`.
- Idle and maximum timeouts default to disabled. Persistent cookies last up to 400 days and refresh on activity. Set positive timeout values when expiry is required.
- Login replaces the session; logout removes it. Disabling a user or changing their password invalidates that user's sessions.
- Writes require `X-CSRF-Token`, obtained through login or `/api/auth/me`. A same-host/allowed `Origin` is checked when supplied.
- Login rate-limit counters are in memory, per process, and reset after restart.
- Production restricts cross-origin access to configured exact origins. Development permits local/private-network origins.
- Patient, appointment, settings and detailed health endpoints require a session. The public health endpoint returns only `{"ok":true}`.
- Auth writes use atomic replacement and a filesystem lock shared by Passenger processes.
- Corrupt/unreadable `users.json` causes login failure rather than being reset. Corrupt `sessions.json` is renamed to `sessions.json.corrupt-<time>` and users must sign in again.

These mechanisms do not replace private storage, HTTPS, backups or deployment verification, and are not a compliance certification.

## cPanel / Phusion Passenger

### Runtime requirements

- Passenger manages the application process and socket. **Do not set `PORT`.**
- The startup entry calls `app.listen(PORT, HOST)` exactly once.
- [index.js](../server/index.js) must remain free of top-level `await`: Passenger loads it with `require()`.
- Deploy the backend either as the bundled `dist-server/` folder from `npm run build:server` (recommended: no host-side dependency install, faster cold spawns; see [Reducing cold-spawn latency](#reducing-cold-spawn-latency)) or as the complete source backend from [server/](../server/), including [app.js](../server/app.js), [dataStore.js](../server/dataStore.js), [startup.js](../server/startup.js), patient matching/import helpers, [manage-users.js](../server/manage-users.js), the auth directory and backend package/lock files.
- For a source deployment, install backend dependencies from [server/package.json](../server/package.json); do not upload local `node_modules`. The bundled deployment needs no dependency install.

### Deployment checklist

1. Back up the current backend, frontend, application JSON and private auth data to known private paths. Confirm that the backup can be restored.
2. Verify the private data layout and backend path configuration. Do not assume the recommended layout is already implemented.
3. Build and upload the backend: run `npm run build:server` and upload the contents of `dist-server/` to the backend application directory (or upload the complete source backend and install its dependencies using the hosting environment).
4. Configure the private auth directory and production environment. Create the first administrator only if one does not already exist.
5. Restart Passenger using the host's application controls or `touch tmp/restart.txt` from the backend application directory.
6. Check logs for `server.listening` and `auth.ready` with a non-zero active-user count.
7. Check the deployed API, substituting the deployment hostname:

   ```bash
   curl -fsS https://your-domain.example/api/health
   curl -s -o /dev/null -w '%{http_code}\n' https://your-domain.example/api/patients
   ```

   Expect `{"ok":true}` from health and `401` from patients without a session.

8. Build from the repository root:

   ```bash
   npm run build
   ```

   Confirm `dist/data` is absent. Upload the contents of `dist/` directly to the domain's document root, including `.htaccess`, brand and About preview assets. The `.htaccess` file provides the SPA fallback so direct visits and refreshes on routes such as `/about` serve `index.html`; it requires Apache `mod_rewrite` and `AllowOverride` to be enabled. For an Nginx-only static host, configure the equivalent `try_files $uri $uri/ /index.html` fallback in the site's server configuration instead.

9. Open the domain root over HTTPS and verify sign-in/out, calendar, patients, statistics, Settings and `/about`. Verify protected API access and public-page deep links.

Deploy frontend/backend changes together when API contracts change. Name resolution, merge, FZO import and user preferences require the corresponding backend endpoints; a healthy but stale backend can still return `404`.

### Reducing cold-spawn latency

Production measurements (November 3–4, 2026) show that slow keepalive responses are dominated by cold Passenger spawns: a fresh worker normally reaches `server.listening` in about 300–400 ms, but a spawn during the host's 02:00–07:00 UTC backup/maintenance window took 6–9 seconds because the page cache was evicted and the CPU was contended. The measures below reduce or eliminate that cost.

**Single-folder backend bundle.** `npm run build:server` builds a complete, self-contained backend in `dist-server/`: `index.js` (the bundled web application and Passenger startup file), `manage-users.js` (the bundled admin CLI) and a dependency-free `package.json`. Deploying the backend is then one step: upload the *contents* of `dist-server/` into the backend application directory, overwriting `index.js`, `manage-users.js` and `package.json`. No `npm install` and no `node_modules` are needed on the host, and a cold spawn reads one ~1.2 MB file instead of hundreds of `node_modules` files — the dominant cost when the page cache is cold. File names are unchanged, so the Passenger startup file setting and the documented `node manage-users.js` commands keep working. The bundles contain no top-level `await`, so Passenger's `require()` loading continues to work, and the default `public/data` and `private/auth` locations resolve relative to the deployed directory exactly as before.

**Keep a worker alive through the backup window.** The spawn itself can be avoided entirely: in the host's Passenger/cPanel application settings, set minimum instances to 1 and/or raise the pool idle time above the keepalive interval, or densify the keepalive cron (for example every 5 minutes between 02:00 and 07:00 UTC). A warm worker answered in 70–190 ms even during the backup window.

**Node 22 compile cache.** When the host's Node selector offers Node 22+, set the `NODE_COMPILE_CACHE` environment variable to a private writable directory. V8 then persists compiled bytecode between spawns, cutting module evaluation time on both warm and cold starts. Node 20 does not support this flag.

**Scrypt prewarm.** After `server.listening`, the backend computes the dummy password hash in the background and logs `auth.prewarm.ok` with its duration (or `auth.prewarm.failed`; both are non-fatal). This does not affect time-to-first-byte; it removes the extra scrypt cost that the first unknown-email login attempt on a fresh worker previously paid.

## Startup logs and troubleshooting

Startup emits structured JSON events:

- `startup.begin`, including `moduleLoadMs` plus host-contention diagnostics (`cpuUserMs`, `cpuSystemMs`, `majorPageFaults`, `fsReads`, `involuntaryContextSwitches`)
- `auth.init.begin`, `auth.init.ok`, each including `uptimeMs`
- `datastore.init.attempt`, `datastore.init.ok`, `datastore.init.failed`
- `server.listening`, `server.listen.failed`
- `auth.ready`, `auth.no_users`, `auth.users.unavailable`
- `auth.request.completed` for session/login checks, with status and duration
- `startup.failed`, `process.uncaughtException`

Startup diagnostics are not intended to log patient data or tokens. Keep logs private.

Initialization retries transient filesystem failures (`EMFILE`, `ENFILE`, `EAGAIN`, `EBUSY`, `EIO`, `ETIMEDOUT`) and per-attempt timeouts. Permission errors such as `EACCES` fail immediately. Defaults are created only for genuinely missing files (`ENOENT`); initialization does not overwrite existing records.

If the UI appears empty, verify the API, resolved data path, file permissions and logs before recreating records. Settings offers authenticated diagnostics at `/api/health/details`, showing the data directory and record counts with manual refresh.

### Detailed keepalive measurements

[scripts/keepalive.sh](../scripts/keepalive.sh) is a deployable replacement for the production keepalive script. It leaves `/api/health`, its response, and the cron frequency unchanged. Its default target is `https://mojaordinacija.mk/api/health`; `KEEPALIVE_URL` can override it. Each run performs one curl transfer, follows redirects as the previous script did, and retains the 60-second timeout. A response is not retried, with one exception: after a slow HTTP 200 (`SLOW_RESPONSE`), the script immediately sends one follow-up probe and logs `warm_retry_http_code`, `warm_retry_ttfb_seconds`, `warm_retry_total_seconds` and `warm_retry_exit`. A fast retry indicates the slowness was a cold Passenger spawn (the worker is warm now); a slow retry indicates a persistently slow application or host. The retry does not change the run's `RESULT` or exit code. Query strings, fragments and `@` characters are rejected so a credential-bearing URL is not accidentally logged by curl errors.

To deploy, back up the existing `/home/devforge/keepalive.sh` to a private location, upload this script to that same path, and preserve its executable permission if cron executes it directly. Keep the existing cron entry and schedule. Restrict the existing `/home/devforge/keepalive.log` to the account owner; new files are created with private permissions. No Node application restart is required.

Each run logs UTC start/end timestamps, the keepalive process PID, curl version, selected remote IP, HTTP version, connection/redirect counts, TLS verification result, response size, cumulative DNS/connect/TLS/pretransfer/TTFB/total timings, and curl exit code. It also reports approximate TCP setup, TLS handshake, and response wait after pretransfer when there are no redirects. Curl errors are retained rather than discarded. Response bodies, headers, cookies, authentication data, the configured URL and application records are not logged. Use only a public, non-sensitive health URL. `curl -q` ignores user curl configuration; environment proxy settings still apply.

`RESULT=OK` requires HTTP 200 and both total time and TTFB below five seconds. Slow HTTP 200 responses are `SLOW_RESPONSE`; non-200 responses are `HTTP_ERROR`; transport errors are `REQUEST_FAILED`. The script exits with curl's failure code, or 3 for an HTTP error, or 2 for invalid metrics/configuration. Slow successful responses exit 0.

The curl timing fields are cumulative, not separate phase durations. For a request without redirects, the script estimates TCP setup as connect minus DNS, TLS handshake as app-connect minus connect (HTTPS only), and response wait after pretransfer as TTFB minus pretransfer. That wait includes Passenger/proxy queues as well as application execution. Redirects complicate phase subtraction: inspect redirect count/duration first. These measurements cannot identify the Node worker PID or prove which process served the request; correlate UTC timestamps with Passenger startup logs. The backend's `server.listening` timestamp can be compared with the probe's TTFB/end time, while `moduleLoadMs` is process uptime at `startup.begin`, not a pure module-loader measurement: it covers Node bootstrap, module loading and all module-scope work in `index.js`, so the `auth.init` duration is a subset of `moduleLoadMs`, not an addition to it. The `uptimeMs` field on `auth.init.begin`/`auth.init.ok` splits that window into before-auth, auth, and after-auth segments.

The attached Oct 14–Nov 3, 2026 logs show why this comparison matters: of 431 recorded probe runs, 399 returned 200, 21 returned 404, five timed out after 60 seconds with no response bytes, and six failed with curl exit 127 after a malformed deployed `--write-out` argument. Among the 111 runs with parsed timing fields, median TTFB was about 0.096 seconds, p95 was about 4.214 seconds, and the maximum was about 46.262 seconds. One precise probe began at 06:30:01.684 UTC and took 45.193 seconds to first byte. Passenger logged `startup.begin` at 06:30:46.860 UTC and `server.listening` at 06:30:46.877 UTC for the new PID, matching the probe's first-byte time. Its `moduleLoadMs: 28767` implies the process began about 28.8 seconds before `startup.begin` (roughly 16.4 seconds after the probe began); datastore initialization and listen then took 4 ms and 12 ms. This strongly associates that sample with Passenger waiting for a worker to become ready, rather than JSON datastore initialization. The 21 consecutive 404s from Nov 2 21:30 UTC through Nov 3 07:30 UTC are a separate target/routing/deployment problem to resolve; the attached pre-update script defaulted to `devforge.mk`, not the current `mojaordinacija.mk` domain. Confirm the URL configured in the actual cron environment before interpreting those 404s.

Passenger logs also report auth-init durations around ten seconds in some workers, despite the current `createAuth()` path performing only synchronous configuration/router construction. The durations are real wall-clock intervals, but do not by themselves prove that auth code consumed ten seconds of CPU. The script can show when a slow external probe ends; use the accompanying Passenger timestamps and the `startup.begin` diagnostics to determine whether time is spent loading/evaluating modules, constructing auth, or waiting for the host to schedule the process: `cpuUserMs`/`cpuSystemMs` far below `moduleLoadMs` indicates CPU starvation or descheduling, while large `majorPageFaults`/`fsReads` indicate a cold page cache, such as a nightly backup evicting `node_modules` and the Node binary. The November 3–4, 2026 incidents (TTFB 8.9 s and 9.2 s at 03:30 and 06:30 UTC) followed exactly this pattern: every startup phase — including the pure in-memory `createAuth()` — inflated together on the first spawn after a multi-hour idle gap inside the host backup window, while the small datastore JSON reads stayed at 3–4 ms.

For isolated testing, `KEEPALIVE_LOG` and `KEEPALIVE_URL` override the defaults:

```bash
KEEPALIVE_LOG=/private/test/keepalive.log \
KEEPALIVE_URL=http://127.0.0.1:3000/api/health \
bash scripts/keepalive.sh
```

## Backups and rollback

Back up application JSON, private auth files and deployed code together. The FZO importer is a patient-list reconciliation workflow, **not** a whole-practice restore. Patient merges/deletions have no in-app undo.

For rollback:

1. Stop writes using the hosting application's maintenance/stop controls.
2. Restore a compatible frontend/backend pair from a verified backup.
3. If restoring data, verify patient/appointment relationships and auth files before restart.
4. Restart Passenger and verify health, authentication and representative records.

Do not remove `auth/` or expose an older unauthenticated API as a routine rollback procedure. Rolling back before authentication was introduced restores that historical unauthenticated behavior and must not be treated as an equivalent deployment.

## Isolated synthetic data

The local generator targets **1,000 fictional patients and 2,000 appointments**. It starts with the previous/current/next months and extends the end date if the unchanged working schedule lacks capacity.

Preview without writing:

```bash
npm run generate:synthetic
```

Explicitly write the isolated dataset:

```bash
ITERMIN_LOCAL_ONLY=1 NODE_ENV=development npm run generate:synthetic -- --write --confirm-synthetic-data
```

The default target is `.local/synthetic-data`. Writes require the development guards, are rejected under Passenger and cannot target ordinary application data. `--seed <value>` gives a repeatable alternative; the calendar date still affects the generated date range.

A manifest tracks IDs and rejects silent repair/duplication of modified generated records. Unrelated target records are preserved; the generator does not delete or replace data. Inspect the preview and remove only the isolated dataset when no longer needed.

Run the app against it:

```bash
ITERMIN_LOCAL_ONLY=1 NODE_ENV=development ITERMIN_LOCAL_DATA_DIR="$PWD/.local/synthetic-data" npm run dev
```

`ITERMIN_LOCAL_DATA_DIR` is allowed only below `.local/`, in development with `ITERMIN_LOCAL_ONLY=1`, and outside Passenger. Normal `public/data` records and settings remain unchanged.

## Future multi-clinic support

This is architectural guidance, **not an implemented feature**. Users currently contain `accountId` (`default`), and handlers receive identity through `req.auth`.

Before supporting multiple clinics:

1. Assign ownership to every patient, appointment and settings record, using per-account files or explicit account IDs.
2. Select the account's data store using authenticated membership, not an unchecked request body or URL.
3. Add memberships/account switching if users can access more than one clinic.
4. Migrate existing records to the default account.
5. Test that one account cannot read or modify another account's records.

Database transactions and account isolation should be evaluated as part of that work.
