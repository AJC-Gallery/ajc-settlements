-- Bootstrap the two database roles for one environment (dev or production).
-- Run ONCE, as the project's admin role, connected to the application database:
--   psql "$ADMIN_URL" -v migrator_password="$MIGRATOR_PW" -v app_password="$APP_PW" -f scripts/db/bootstrap-roles.sql
-- Passwords come from the command line and are never committed.
\set ON_ERROR_STOP on
SELECT current_database() AS dbname \gset

-- ajc_migrator: runs migrations from the pipeline only. Owns every table it creates.
CREATE ROLE ajc_migrator LOGIN PASSWORD :'migrator_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- ajc_app: used by the running API only. Owns nothing, so row-level security always applies to it.
-- Gets no privileges here: each migration grants it exactly what its tables need (deny by default).
-- history_event gets SELECT and INSERT only (rule F-12).
CREATE ROLE ajc_app LOGIN PASSWORD :'app_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO ajc_migrator, ajc_app;
GRANT USAGE, CREATE ON SCHEMA public TO ajc_migrator;
GRANT USAGE ON SCHEMA public TO ajc_app;

-- Proof: both roles are plain, and belong to no other role (zero rows expected from the second query).
SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
  FROM pg_roles WHERE rolname IN ('ajc_migrator', 'ajc_app') ORDER BY rolname;
SELECT roleid::regrole AS member_of, member::regrole AS role
  FROM pg_auth_members WHERE member IN ('ajc_migrator'::regrole, 'ajc_app'::regrole);
