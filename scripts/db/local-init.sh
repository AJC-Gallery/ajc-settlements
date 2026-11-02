#!/usr/bin/env bash
# Runs once, when the local database volume is first created (docker-entrypoint-initdb.d).
# Creates the two roles with THROWAWAY local passwords. These values are public on purpose:
# the database listens on 127.0.0.1 only and holds no real data. Never reuse them anywhere else.
# To run it again: pnpm db:reset (this deletes the local data).
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_password=ajc_migrator_local -v app_password=ajc_app_local \
  -f /ajc-db/bootstrap-roles.sql
