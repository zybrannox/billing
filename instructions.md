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

## Logs

- `billing_server/logs/backend.{out,err}.log`
- `billing/logs/frontend.{out,err}.log`
- `~/.cloudflared/logs/tunnel.{out,err}.log`

## Known caveats

- **Never move this project under `~/Desktop`, `~/Documents`, `~/Downloads`, or iCloud Drive.** Those are TCC-protected folders — macOS blocks LaunchDaemons (boot-time, pre-login) from accessing anything under them until a user logs in, even when the daemon runs as your own user. The app originally lived at `~/Desktop/billing_app` and the backend/frontend daemons silently failed on every cold boot as a result (they worked fine when manually restarted after login, which is what made it hard to catch — always test with an actual shutdown + power-on, not just `launchctl kickstart`). Moved to `~/billing_app` to fix this permanently.
- **DB password is weak** (`00000` in `billing_server/.env`). Low risk today since Postgres isn't internet-exposed — the backend is the only thing that talks to it, over localhost — but worth rotating eventually.
- **Cloudflare's default Universal SSL wildcard only covers one subdomain level** (`*.zybrannox.com`). A hostname like `api.workspace.zybrannox.com` (two levels deep) will fail TLS handshake with no cert served. Keep new hostnames as direct children of `zybrannox.com` (e.g. `foo.zybrannox.com`), not nested under `workspace.zybrannox.com`.
- Two stale, unused DNS records (`billing.zybrannox.com`, `billing-api.zybrannox.com`) still exist in Cloudflare from before the rename to `workspace`. They 404 via the tunnel's catch-all rule and are harmless, but can be deleted from the Cloudflare dashboard if you want it tidy.
