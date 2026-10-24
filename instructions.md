# Billing App — Deployment Reference

Project root: `~/billing_app` (i.e. `/Users/zybrannox/billing_app`).

## Public URLs

- App: https://workspace.zybrannox.com
- API: https://workspace-api.zybrannox.com

## Architecture

Three always-on services, running as macOS LaunchDaemons (start at boot, before login, auto-restart on crash):

| Service | Label | Runs | Port |
|---|---|---|---|
| Backend | `com.zybrannox.billing.backend` | `billing_server/venv/bin/python -m uvicorn app.main:app` | 8000 |
| Frontend | `com.zybrannox.billing.frontend` | `node .../serve/build/main.js -s dist` | 4173 |
| Tunnel | `com.zybrannox.billing.cloudflared` | `cloudflared tunnel --config ~/.cloudflared/config.yml run` | — |

Plist source files live in [`deploy/`](../deploy) at the repo root; installed copies live in `/Library/LaunchDaemons/`.

Postgres (system install, port 5432) is boot-managed separately via its own LaunchDaemon from the original installer — not something we set up.

Cloudflare Tunnel name: `billing-app` (id `d79efff0-f4f5-441c-9956-239744d02029`). Ingress config: `~/.cloudflared/config.yml`.

## Restarting a service

```bash
sudo launchctl kickstart -k system/<label>
```

Use after changing anything the running process reads at startup (`.env`, `main.py`, `config.yml`). `-k` forces an immediate kill + restart.

To restart backend + tunnel together and confirm they came back up:

```bash
sudo launchctl kickstart -k system/com.zybrannox.billing.backend && \
sudo launchctl kickstart -k system/com.zybrannox.billing.cloudflared && \
sleep 3 && \
sudo launchctl print system/com.zybrannox.billing.backend | grep -E "state =|pid =" && \
sudo launchctl print system/com.zybrannox.billing.cloudflared | grep -E "state =|pid ="
```

The frontend doesn't need a restart after a rebuild — `serve` reads `dist/` from disk on every request.

## Before deploying to the live server (checklist)

Work through this top to bottom the first time you ship this version, and re-check the "every release" part each time after. Nothing here is optional unless marked.

### A. One-time preparation (do these first)

1. **Take a backup before touching anything.** On the live Mac: `cd billing_server && ./scripts/backup_db.sh`, then copy the dump off the machine. This is your rollback. (Needs the PostgreSQL client tools: `pg_dump`, `pg_restore`, `psql`, `createdb`, `dropdb` on `PATH`. Check with `which pg_dump`.)
2. **Prove the backup restores:** `./scripts/verify_restore.sh`. Do not skip this - the restore scripts were written without access to `pg_dump`, so they have never been run.
3. **Rotate the Gmail app password.** The old one was pasted into chat earlier and must be treated as exposed. Revoke it in Google (Account > Security > App passwords), create a new one, then on the server run `./scripts/set_secret.sh GMAIL_APP_PASSWORD --restart` (it verifies the login before saving, and rolls back on failure). Never paste the new value anywhere.
4. **Production `.env` (`billing_server/.env`, mode 600):** `ENVIRONMENT=production`; `SECRET_KEY` and `CLIENT_SECRET_KEY` each 32+ random characters and *different* (`python -c "import secrets; print(secrets.token_urlsafe(48))"`); correct `DATABASE_URL`; Gmail settings; leave `ENABLE_API_DOCS` unset (off). The app refuses to start in production with weak or missing keys. `ls -l .env` should show `-rw-------`.
5. **Admin account.** Production never uses the development default password. Either set `DEFAULT_ADMIN_PASSWORD` (10+ characters, not a dictionary word) in `.env` *before the first start of a fresh database*, or create the first admin by hand. Make sure no leftover test accounts exist (dev admin `zybrannox@gmail.com` with a weak password, any `load@example.com`, sample customers) - log in and check Employees and Customers.
6. **Tune for the 8 GB iMac** (see "Operations" below): set `DB_POOL_SIZE=5` and `DB_MAX_OVERFLOW=5` in `.env`; keep Postgres `shared_buffers` around 256 MB and `max_connections` modest (50 is plenty); run a **single** uvicorn worker (request timings and the System Health numbers are per process). Exclude `billing_server/uploads` and the backup folder from Spotlight (System Settings > Siri & Spotlight > Search Privacy) and from Time Machine.
7. **Disk space.** Check `df -h` - you need room for uploads, thumbnails, the database and at least two weeks of backups. System Health warns below 10% free; do not deploy below that.
8. **Backups on a schedule.** Add `scripts/backup_db.sh` to a daily cron/launchd job (e.g. 02:00) and `scripts/verify_restore.sh` monthly. Decide where copies go besides this Mac.

### B. Frontend build (on the machine that builds it)

1. `cd billing && git status` - `vite.config.ts` must be exactly the committed production one.
2. **Delete or move `billing/.env.local` on the build machine.** Vite loads it *over* `.env`, so a leftover copy makes the production build call `http://localhost:8000` and the live app shows a blank page / failed logins. `ls -a billing | grep .env` should list only `.env` (which points at `https://workspace-api.zybrannox.com`).
3. `pnpm install --frozen-lockfile`, then `pnpm typecheck && pnpm lint && pnpm test`, then `npx vite build`, then `pnpm check:bundle` (initial load must stay under 300 KB gzipped; it is about 205 KB now).
4. Set **CSP and HSTS headers at the static host / Cloudflare** for `workspace.zybrannox.com` (the repo cannot set them). Suggested: `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a CSP that allows only your own origin plus the API origin.

### C. Backend release (every release)

1. `git pull`, then `./venv/bin/pip install -r requirements.txt` (new packages arrive: `psutil`, `sentry-sdk`, ...).
2. `./venv/bin/python -m pytest -q` - all tests green. (If you changed a route or schema, also run `./venv/bin/python scripts/export_openapi.py` and `pnpm api:types`; a test fails if `openapi.json` is stale.)
3. **Migrations, then restart - always in that order:**
   ```bash
   cd billing_server && ./venv/bin/alembic upgrade head
   sudo launchctl kickstart -k system/com.zybrannox.billing.backend
   ```
   In production the app checks at startup that the database is at the latest migration and **refuses to start** otherwise (the log says `Run alembic upgrade head`). If the very first `alembic upgrade head` complains the database has no revision, the database predates Alembic tracking: find the newest migration whose changes are already present, run `alembic stamp <that revision>` once, then `alembic upgrade head`. Ask before guessing the revision - stamping the wrong one skips migrations. `SKIP_SCHEMA_CHECK=true` is an emergency bypass, not a fix.
4. **Launchd settings to verify once** (`/Library/LaunchDaemons/com.zybrannox.billing.backend.plist`): `WorkingDirectory` is `billing_server` (uploads and thumbnails are stored in `./uploads`, relative to it - a different working directory silently creates a second, empty uploads folder), `KeepAlive` is on, and the log paths exist and are writable.
5. Confirm the backend came back: `sudo launchctl print system/com.zybrannox.billing.backend | grep -E "state =|pid ="` and `curl -s -o /dev/null -w "%{http_code}\n" https://workspace-api.zybrannox.com/auth/me` (expect `401`, not `502`/`530`).

### D. Smoke test on the live site (10 minutes, as admin)

- [ ] Log in; log out; log in again. Check `https://workspace-api.zybrannox.com/docs` returns 404 (API docs are off).
- [ ] Wrong password 3 times: a normal "Invalid credentials" message and no lockout of *other* people (rate limits are per real client IP behind the tunnel - try from your phone on mobile data while a colleague stays logged in).
- [ ] Customers, Companies, Employees, Projects, Dashboard all load (no blank sections; Dashboard cards line up).
- [ ] Create a project, generate an invoice, record a part payment, mark it paid. Open **System Setup > Audit Log** - the payment and mark-paid appear.
- [ ] Download an invoice PDF, share one to WhatsApp, open a shared link in a private window.
- [ ] Upload a photo and a PDF to a project; open the thumbnail; try a renamed `.exe` as `.pdf` (must be refused).
- [ ] Forgot-password email arrives (proves the new Gmail app password works).
- [ ] Client portal: invite, activate, log in, see invoices.
- [ ] **System Setup > System Health** shows the live iMac's real numbers (not "can't load"), with a sensible verdict. Note the baseline memory free and app memory.

### E. After going live

- Watch **System Health** for the first day: memory free should stay above ~20%, no swap, the slowest 5% of requests under ~1 s. If it shows a problem it names the cause.
- Set `SENTRY_DSN` if you want error alerts (optional).
- Run the load test once against the live data when nobody is working: `./venv/bin/python scripts/load_test.py --base https://workspace-api.zybrannox.com --email <admin> --password <...> --users 5 --seconds 20` (read-only; target p95 under 200 ms).
- Keep the pre-deploy backup for at least two weeks.

### F. Rolling back

- **Frontend:** rebuild the previous commit (`git checkout <previous> && npx vite build`) - `serve` picks it up immediately.
- **Backend code only (no migration ran):** check out the previous commit and restart the backend.
- **After a migration:** `./venv/bin/alembic downgrade -1` reverses the newest migration (each phase 4 migration is reversible), then check out the previous commit and restart. If data was damaged, restore the pre-deploy dump with `pg_restore --clean --no-owner --dbname <url> <dump>` (stop the backend first).

## Deploying changes

**Frontend:** edit code, then rebuild — the running `serve` daemon picks it up automatically:
```bash
cd billing && npx vite build
```
(`VITE_API_URL` is baked in at build time — if it changes, rebuild is required.)

**Backend:** run any new migrations, **then** restart the daemon:
```bash
cd billing_server && ./venv/bin/alembic upgrade head
sudo launchctl kickstart -k system/com.zybrannox.billing.backend
```
In production the app no longer creates tables itself: at startup it checks the database is at the Alembic head and refuses to boot otherwise (the error says `Run alembic upgrade head`). So the order is always migrate, then restart. `SKIP_SCHEMA_CHECK=true` bypasses the check in an emergency.

After changing any route or response model: `./venv/bin/python scripts/export_openapi.py` (a test fails if `openapi.json` is stale), then `pnpm api:types` in `billing` to refresh the frontend's generated types.

**Tunnel routing:** edit `~/.cloudflared/config.yml`, then:
```bash
sudo launchctl kickstart -k system/com.zybrannox.billing.cloudflared
```
To add a new public hostname: `cloudflared tunnel route dns billing-app <hostname>`, then add it to the ingress list in `config.yml` before restarting.

## Pulling in new changes from git

Both `billing/` and `billing_server/` are separate git repos. Pulling updates the files on disk, but the *running* app doesn't pick anything up until you rebuild/restart. Steps, in order:

1. **Pull both repos:**
   ```bash
   cd ~/billing_app/billing && git pull
   cd ~/billing_app/billing_server && git pull
   ```

2. **Check `.env` didn't get overwritten.** This has already happened once — a commit on the remote included a local-dev `.env`, which flipped `billing/.env`'s `VITE_API_URL` back to `http://localhost:8000` on pull. If that ships in a build, the live site breaks for every visitor since their browser can't reach `localhost:8000`. After every pull:
   ```bash
   git diff HEAD@{1} HEAD -- .env   # run in whichever repo you just pulled
   ```
   `billing/.env` must read `VITE_API_URL=https://workspace-api.zybrannox.com`. `billing_server/.env` must keep `DATABASE_URL=postgresql+psycopg://postgres:00000@localhost:5432/billing`, `ENVIRONMENT=production`, `PORT=8000`. Fix by hand if a pull changed them — don't rebuild/restart until they're correct.

3. **Check for new backend dependencies:**
   ```bash
   cd ~/billing_app/billing_server
   git diff HEAD@{1} HEAD -- requirements.txt
   ```
   If it changed: `venv/bin/python -m pip install -r requirements.txt` (use `python -m pip`, not `venv/bin/pip` directly — see caveat below on why that can silently be broken).

4. **Check for schema changes that need a migration.** Don't assume a migration file exists just because one *should* — compare the models against the live DB:
   ```bash
   cd ~/billing_app/billing_server
   venv/bin/python -m alembic current      # what the DB thinks it's at
   venv/bin/python -m alembic heads        # what migration files exist up to
   ```
   If they match but the pulled code added/changed model fields anyway (check `git diff HEAD@{1} HEAD -- app/entities/`), a migration is missing from the pull. This has already happened once — a `customers` table and five new `projects` columns landed with no migration file. **Before generating or applying anything, back up the database:**
   ```bash
   PGPASSWORD=00000 /Library/PostgreSQL/18/bin/pg_dump -h localhost -p 5432 -U postgres -d billing -F c \
     -f ~/billing_app/db_backups/billing_$(date +%Y%m%d_%H%M%S).dump
   ```
   (Use the `pg_dump` binary matching the running Postgres server version — `/Library/PostgreSQL/18/bin/pg_dump`, not the Homebrew one, which errors on a version mismatch.) Then:
   ```bash
   venv/bin/python -m alembic upgrade head                                  # apply any pre-existing pending migrations first
   venv/bin/python -m alembic revision --autogenerate -m "describe the change"
   # read the generated file in migrations/versions/ before applying anything
   venv/bin/python -m alembic upgrade head
   ```

5. **Check for new frontend dependencies:**
   ```bash
   cd ~/billing_app/billing
   git diff HEAD@{1} HEAD -- package.json
   ```
   If it changed: `pnpm install`.

6. **Rebuild the frontend and restart the backend:**
   ```bash
   cd ~/billing_app/billing && npx vite build
   sudo launchctl kickstart -k system/com.zybrannox.billing.backend
   ```
   (Frontend doesn't need a daemon restart — `serve` reads `dist/` from disk on every request. Tunnel doesn't need one either unless `config.yml` changed.)

7. **Verify:** `curl -s -o /dev/null -w "%{http_code}\n" https://workspace.zybrannox.com/` and the same for `https://workspace-api.zybrannox.com/docs` should both return `200`. Also check `billing_server/logs/backend.err.log` for anything past the last `Uvicorn running on` line.

## Secrets (Gmail app password, etc.)

Secrets live in locked-down files, not in `.env`. The app reads `<NAME>_FILE=<path>` (see `_secret()` in `app/config.py`); `.env` holds only the *path*.

**Set or rotate one** (run on the production Mac, from `~/billing_app/billing_server`):

```bash
scripts/set_secret.sh GMAIL_APP_PASSWORD --restart
```

It asks for the value with hidden input (nothing in shell history or `ps`), writes `~/.config/zybrannox/secrets/gmail_app_password` (mode 600, folder 700), **tests the new value with a real Gmail login before switching** (a wrong value is rolled back and nothing changes), points `.env` at the file, removes the old plain `GMAIL_APP_PASSWORD=` line, then restarts the backend (`sudo` prompt). Afterwards revoke the old password at Google (Account > Security > App passwords).

Check it any time: `venv/bin/python -m scripts.check_email_credentials` (logs in, sends nothing).

Notes:
- Keep secret files under `~` but **not** `~/Desktop`/`~/Documents`/`~/Downloads` (the TCC caveat below applies to them too).
- If the backend ever logs `... is readable by other users`, run `chmod 600` on that file.
- Gmail has no API for creating app passwords, so rotation itself stays a manual step (every few months, or immediately after any exposure). Only a provider with an API key you can mint programmatically (SES, Resend, Postmark) can be rotated fully automatically.
- The same `<NAME>_FILE` convention works with other hosts: Docker/Compose `secrets:` (mounted at `/run/secrets/...`), systemd `LoadCredential=`, Kubernetes secret volumes - set `GMAIL_APP_PASSWORD_FILE` to the mounted path.

## Operations: backups, monitoring, load testing

* **Backups:** `billing_server/scripts/backup_db.sh` writes a compressed `pg_dump` to `~/zybrannox-backups` (override with `BACKUP_DIR`) and prunes dumps older than 14 days. Schedule it daily (cron/launchd). It needs the PostgreSQL client tools (`pg_dump`). `scripts/verify_restore.sh` restores the newest dump into a throw-away database and compares row counts with the live one - run it monthly; a backup that has never been restored is only a hope.
* **Errors:** set `SENTRY_DSN` to turn on error tracking (off by default; request bodies, cookies and headers are never sent).
* **Slow queries:** anything over `SLOW_QUERY_MS` (300) is logged as `slow query N ms: ...` (statement text only, never parameters).
* **Load test:** `./venv/bin/python scripts/load_test.py --email ... --password ... --users 10 --seconds 20` (read-only GETs; target p95 <= 200 ms). On 20,000 projects/invoices it measured a worst p95 of 49 ms.
* **System Health (admin):** System Setup -> System Health shows the server machine's memory/CPU/disk, space used by the app (customer files, thumbnails, database, backups), memory per component, response times, slow queries, a 7-day trend, and a plain-English "why is it lagging?" verdict. Read-only and admin-only; it reports numbers and role labels only (never paths, command lines or settings). Folder sizes are measured by a background job every 10 minutes, so the screen itself costs almost nothing. If Postgres runs as a different macOS user, its memory shows "can't be read" - the database size is still shown. Needs `alembic upgrade head` (adds the `system_metrics` table) and `pip install -r requirements.txt` (adds `psutil`).
* **Audit log:** payments, cancellations and deletions are recorded (System Setup -> Audit Log). The table is append-only; on Postgres a trigger rejects UPDATE/DELETE/TRUNCATE.
* **Sessions:** a password change or reset signs the user out everywhere; an admin can also `POST /users/{id}/revoke-sessions`. After `LOGIN_MAX_FAILURES` (10) wrong passwords an account locks for `LOGIN_LOCKOUT_MINUTES` (15).

## Logs

- `billing_server/logs/backend.{out,err}.log`
- `billing/logs/frontend.{out,err}.log`
- `~/.cloudflared/logs/tunnel.{out,err}.log`

## Known caveats

- **Use `venv/bin/python -m pip` / `-m alembic`, not `venv/bin/pip` / `venv/bin/alembic` directly.** Console scripts installed by pip get a shebang hardcoded to the exact venv path at install time. When the project moved from `~/Desktop/billing_app` to `~/billing_app`, every pre-existing console script's shebang kept pointing at the old, now-nonexistent path — `venv/bin/pip` broke outright (`bad interpreter`). `python -m <module>` imports the package directly instead of executing the shebang, so it's unaffected regardless of where the venv lives. `pip` itself was already fixed once (`venv/bin/python -m pip install --upgrade --force-reinstall pip`); if another console script turns up broken the same way, that's the fix.
- **Tunnel runs over `http2`, not the cloudflared default of `quic`.** QUIC is UDP-based, and this network's router/NAT was silently dropping idle UDP mappings faster than cloudflared's own keepalive — causing recurring `timeout: no recent network activity` disconnects in `~/.cloudflared/logs/tunnel.err.log` and brief Cloudflare **error 1033**s for users during the reconnect window (every 15–45 min). Set via `protocol: http2` in `~/.cloudflared/config.yml`, which runs over TCP and isn't subject to that NAT behavior. If 1033s ever come back, check that log first for the same `timeout: no recent network activity` pattern before assuming it's something else.
- **Never move this project under `~/Desktop`, `~/Documents`, `~/Downloads`, or iCloud Drive.** Those are TCC-protected folders — macOS blocks LaunchDaemons (boot-time, pre-login) from accessing anything under them until a user logs in, even when the daemon runs as your own user. The app originally lived at `~/Desktop/billing_app` and the backend/frontend daemons silently failed on every cold boot as a result (they worked fine when manually restarted after login, which is what made it hard to catch — always test with an actual shutdown + power-on, not just `launchctl kickstart`). Moved to `~/billing_app` to fix this permanently.
- **DB password is weak** (`00000` in `billing_server/.env`). Low risk today since Postgres isn't internet-exposed — the backend is the only thing that talks to it, over localhost — but worth rotating eventually.
- **Cloudflare's default Universal SSL wildcard only covers one subdomain level** (`*.zybrannox.com`). A hostname like `api.workspace.zybrannox.com` (two levels deep) will fail TLS handshake with no cert served. Keep new hostnames as direct children of `zybrannox.com` (e.g. `foo.zybrannox.com`), not nested under `workspace.zybrannox.com`.
- Two stale, unused DNS records (`billing.zybrannox.com`, `billing-api.zybrannox.com`) still exist in Cloudflare from before the rename to `workspace`. They 404 via the tunnel's catch-all rule and are harmless, but can be deleted from the Cloudflare dashboard if you want it tidy.

Same answer as before, and nothing since has changed it:

Automatic idle sleep: disabled (sleep 0) — the app stays up regardless of inactivity.
Manual sleep (Apple menu → Sleep, or a physical sleep key): this overrides pmset entirely and suspends everything — backend, frontend, tunnel — until the Mac wakes up. There's no pmset setting that can block a deliberate sleep action; that would require restricting who can physically use the machine, which isn't something I can configure.

So: won't go offline on its own, will go offline if someone at the keyboard deliberately puts it to sleep. Since that requires a person physically there doing it on purpose, it's a different situation than the unattended "was off, turned back on" scenario this was originally built to survive.