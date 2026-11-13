-- Database audit (D-004). Expect ZERO rows. Run as ajc_app by audit.int.spec.ts and by the db job.
-- "World-owned" means a table with a world_id column. pg_catalog and information_schema are ignored.
-- Check 1: a world-owned table must have row-level security enabled (world boundary, P-05).
-- Check 2: no non-system function may be executable by PUBLIC (a NULL ACL means the default, which is PUBLIC).
SELECT 'world_table_without_rls'::text AS check_name,
       format('%I.%I', n.nspname, c.relname)::text AS object_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname !~ '^pg_toast'
  AND EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = c.oid AND a.attname = 'world_id' AND a.attnum > 0 AND NOT a.attisdropped
  )
  AND NOT c.relrowsecurity
UNION ALL
SELECT 'function_executable_by_public'::text,
       p.oid::regprocedure::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname !~ '^pg_toast'
  AND (
    p.proacl IS NULL
    OR EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) x
      WHERE x.grantee = 0 AND x.privilege_type = 'EXECUTE'
    )
  );