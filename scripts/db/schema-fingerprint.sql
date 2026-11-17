-- Prints one line: a hash of the public schema (tables, columns, row-level security, policies, functions and their grants).
-- Used by CI to prove that migrate up, down --all, up again gives the same schema. Read-only; run with psql -At.
WITH parts AS (
  SELECT 'column ' || c.table_name || '.' || c.column_name || ' ' || c.data_type || ' ' || c.is_nullable || ' ' || coalesce(c.column_default, '') AS line
    FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name <> 'typeorm_migrations'
  UNION ALL
  SELECT 'rls ' || c.relname || ' ' || c.relrowsecurity || ' ' || c.relforcerowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname <> 'typeorm_migrations'
  UNION ALL
  SELECT 'policy ' || tablename || ' ' || policyname || ' ' || cmd || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
    FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'function ' || pg_get_functiondef(p.oid) || ' acl ' || coalesce(p.proacl::text, 'NULL')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
  UNION ALL
  SELECT 'tablegrant ' || table_name || ' ' || grantee || ' ' || privilege_type
    FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name <> 'typeorm_migrations'
)
SELECT md5(coalesce(string_agg(line, E'\n' ORDER BY line), 'empty')) FROM parts;
