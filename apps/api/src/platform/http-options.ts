import { IDEMPOTENCY_KEY_HEADER } from "@ajc/contracts";
import { REQUEST_ID_HEADER } from "../common/request-id.js";

const CORS_MAX_AGE_SECONDS = 600;
const RETRY_AFTER_HEADER = "Retry-After";

/** CORS from the ALLOWED_ORIGINS allowlist only: never "*", because cookies are sent (P-07). */
export function corsOptions(origins: readonly string[]) {
  return {
    origin: [...origins],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER, RETRY_AFTER_HEADER],
    maxAge: CORS_MAX_AGE_SECONDS,
  };
}