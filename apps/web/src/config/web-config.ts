import { parseWebConfig } from "./env";

// The only place in apps/web that reads process.env. Importing this module validates the configuration,
// so `next build` and `next start` both refuse to run on a missing or malformed value.
export const webConfig = parseWebConfig(process.env);