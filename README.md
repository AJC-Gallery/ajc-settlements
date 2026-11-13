# AJC Settlements

Assets and income records for multi-user owners. One repository: `apps/api` (NestJS), `apps/web` (Next.js), `packages/contracts` (shared types).

Governance lives in `docs/`. Start with the Master Project Document.

## Run from a clean Windows machine

Work inside WSL2 (Ubuntu), with the repo cloned into the Linux filesystem (`~/code/ajc-settlements`), never under `C:\`.

1. `wsl --install -d Ubuntu` in an admin PowerShell, then reboot and create the Ubuntu user.
2. Install Docker Desktop with the WSL2 backend; enable Ubuntu under Settings > Resources > WSL integration.
3. In Ubuntu: `sudo apt update && sudo apt install -y git build-essential curl`.
4. Install Node 24: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash`, reopen the terminal, then `nvm install` inside the repo (reads `.nvmrc`).
5. `corepack enable`
6. `git clone https://github.com/AJC-Gallery/ajc-settlements.git && cd ajc-settlements`
7. `pnpm install --frozen-lockfile`
8. `docker compose up -d db`
9. `pnpm verify:fast`

## Run the API locally

1. `pnpm db:up`, which starts the local database with the roles `ajc_migrator` and `ajc_app`.
2. `cp apps/api/.env.example apps/api/.env`.
3. `pnpm --filter @ajc/api build`, then `node --env-file=apps/api/.env apps/api/dist/main.js`.
4. `curl http://localhost:3100/api/v1/health/live` and `.../api/v1/health/ready`.

The API reads only the process environment and loads no `.env` file itself, which is why step 3 passes one.

## Database migrations

Migrations are compiled with the API and run by a small command, as the role `ajc_migrator` only (it refuses any other role).

- `pnpm --filter @ajc/api db:migrate` applies every pending migration. It is safe to run twice.
- `pnpm --filter @ajc/api db:migrate:revert` reverts the last one. Add `-- --all` to revert every migration.

Both read `MIGRATOR_DATABASE_URL` from the environment or from `apps/api/.env`. The running API never reads it. A migration is a file `src/migrations/<timestamp>-<name>.ts` with a why-header and a working `down()`, registered in `src/migrations/index.ts`.

## API environment variables

Every variable is read once, in `apps/api/src/config`, and validated at start. The API refuses to boot on a missing or malformed value and names the variable, never its value. `apps/api/.env.example` has the same list with local values.

| Variable | Required | Meaning |
|----------|----------|---------|
| `NODE_ENV` | yes | `development`, `test` or `production`. Every deployed environment, dev included, uses `production` |
| `PORT` | yes | HTTP port. Provided by the host in deployment |
| `ALLOWED_ORIGINS` | yes | Comma-separated browser origins for CORS. Origins only, no path |
| `TRUST_PROXY_HOPS` | yes | Exact number of proxies in front of the API, 0 to 10. Never `true` |
| `DATABASE_URL` | yes | Application-role connection string (`ajc_app`, pooled host). A secret |
| `DB_POOL_MAX` | yes | Connection pool size, 1 to 50 |
| `LOG_LEVEL` | no | `debug`, `info`, `warn` or `error`. Defaults to `info` |
| `RENDER_GIT_COMMIT` | no | Set by Render. Reported by the health endpoints |
| `MIGRATOR_DATABASE_URL` | migrations only | Read only by the migration command, never by the running API |

## Logging

Logs are JSON lines with a request id. A line for an unexpected error (status 500 or more) carries the error name, the SQLSTATE when the error has a five-character `code`, the request id and the stack frames without the message line. The error message and the first line of the stack are never logged for non-HTTP errors, in any environment, because a driver message can contain values. Request routes are logged as the matched pattern (`/api/v1/assets/:id`) or `unmatched`, never the raw URL. Passwords, tokens, hashes and request bodies are never logged.