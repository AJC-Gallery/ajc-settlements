import {
  MigratorConfigError,
  loadMigratorUrl,
  migrateDown,
  migrateUp,
  parseMigrateArgs,
} from "./migrator.js";

const USAGE = "usage: migrate-cli.js up | down [--all]\n";
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/** Name and SQLSTATE only: a driver message can carry a host name or a value. */
function describeFailure(error: unknown): string {
  if (error instanceof MigratorConfigError) return error.message;
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { code?: unknown } | null)?.code;
  const sqlState = typeof code === "string" && SQLSTATE_PATTERN.test(code) ? ` sqlstate ${code}` : "";
  return `migration failed: ${name}${sqlState}`;
}

async function run(): Promise<void> {
  const command = parseMigrateArgs(process.argv.slice(2));
  if (command === undefined) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
    return;
  }
  const url = loadMigratorUrl();
  if (command.kind === "up") {
    const applied = await migrateUp(url);
    process.stdout.write(`migrate up: applied ${applied.length} ${applied.join(" ")}\n`);
    return;
  }
  await migrateDown(url, command.all);
  process.stdout.write(command.all ? "migrate down: reverted all\n" : "migrate down: reverted the last one\n");
}

run().catch((error: unknown) => {
  process.stderr.write(`${describeFailure(error)}\n`);
  process.exitCode = 1;
});