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

## Deploying changes

**Frontend:** edit code, then rebuild — the running `serve` daemon picks it up automatically:
```bash
cd billing && npx vite build
```
(`VITE_API_URL` is baked in at build time — if it changes, rebuild is required.)

**Backend:** edit code, then restart the daemon:
```bash
sudo launchctl kickstart -k system/com.zybrannox.billing.backend
```

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