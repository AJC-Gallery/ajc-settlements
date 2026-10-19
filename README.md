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

Environment variables will be documented in `apps/api/.env.example` once the backend adds the config module.
