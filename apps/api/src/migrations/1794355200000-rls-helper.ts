import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Why: row-level security needs one stable way to read the world a transaction acts in (Protocol,
 * world boundary). The setting reads as an empty string once a transaction has ended, so the helper
 * turns '' into NULL before the uuid cast. Without the NULLIF, an unset world would raise an error.
 * Rights: Postgres grants EXECUTE on a new function to PUBLIC, so PUBLIC is revoked and only ajc_app
 * (the running API's role) is granted it. Nothing else is granted.
 * Rollback: down() drops the function. Nothing depends on it yet, and this migration creates no table.
 * Rollout: expand only (S-11). It adds one function and removes nothing.
 */
export class RlsHelper1794355200000 implements MigrationInterface {
  name = "RlsHelper1794355200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE FUNCTION public.app_world_id() RETURNS uuid LANGUAGE sql STABLE AS $$ " +
        "SELECT NULLIF(current_setting('app.world_id', true), '')::uuid $$",
    );
    await queryRunner.query("REVOKE ALL ON FUNCTION public.app_world_id() FROM PUBLIC");
    await queryRunner.query("GRANT EXECUTE ON FUNCTION public.app_world_id() TO ajc_app");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP FUNCTION public.app_world_id()");
  }
}