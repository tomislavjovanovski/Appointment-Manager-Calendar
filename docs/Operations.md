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
| Built frontend | `dist/`, deployed under `/app/` |

[server/index.js](../server/index.js) fixes the normal application-data path to `../public/data` relative to the backend. A general production `DATA_DIR` environment override is **not implemented**. The guarded local override below is for development only.

**Do not expose application JSON through a public web directory.** A recommended production layout separates:

```text
backend/             # Server code, outside the public web root
private/data/        # Patients, appointments and settings
private/auth/        # Users and sessions
public_html/app/     # Built frontend only
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
- Deploy the complete backend from [server/](../server/), including [app.js](../server/app.js), [dataStore.js](../server/dataStore.js), [startup.js](../server/startup.js), patient matching/import helpers, [manage-users.js](../server/manage-users.js), the auth directory and backend package/lock files.
- Install backend dependencies from [server/package.json](../server/package.json); do not upload local `node_modules`.

### Deployment checklist

1. Back up the current backend, frontend, application JSON and private auth data to known private paths. Confirm that the backup can be restored.
2. Verify the private data layout and backend path configuration. Do not assume the recommended layout is already implemented.
3. Upload the complete backend as a consistent version and install its dependencies using the hosting environment.
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

   Confirm `dist/data` is absent. Upload the contents of `dist/` to the frontend's `/app/` directory, including brand and About preview assets.

9. Open `/app/` over HTTPS and verify sign-in/out, calendar, patients, statistics, Settings and `/app/about`. Verify protected API access and public-page deep links.

Deploy frontend/backend changes together when API contracts change. Name resolution, merge, FZO import and user preferences require the corresponding backend endpoints; a healthy but stale backend can still return `404`.

## Startup logs and troubleshooting

Startup emits structured JSON events:

- `startup.begin`, including `moduleLoadMs`
- `auth.init.begin`, `auth.init.ok`
- `datastore.init.attempt`, `datastore.init.ok`, `datastore.init.failed`
- `server.listening`, `server.listen.failed`
- `auth.ready`, `auth.no_users`, `auth.users.unavailable`
- `auth.request.completed` for session/login checks, with status and duration
- `startup.failed`, `process.uncaughtException`

Startup diagnostics are not intended to log patient data or tokens. Keep logs private.

Initialization retries transient filesystem failures (`EMFILE`, `ENFILE`, `EAGAIN`, `EBUSY`, `EIO`, `ETIMEDOUT`) and per-attempt timeouts. Permission errors such as `EACCES` fail immediately. Defaults are created only for genuinely missing files (`ENOENT`); initialization does not overwrite existing records.

If the UI appears empty, verify the API, resolved data path, file permissions and logs before recreating records. Settings offers authenticated diagnostics at `/api/health/details`, showing the data directory and record counts with manual refresh.

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
