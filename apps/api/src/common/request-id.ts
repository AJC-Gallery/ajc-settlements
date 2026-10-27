/** Header carrying the request id in and out. The same id is in every log line and error body (P-13). */
export const REQUEST_ID_HEADER = "x-request-id";

/** Letters, digits, underscore and hyphen, 8 to 64 characters. Stops log injection through the header. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Pure: the incoming id when it is well-formed, otherwise a fresh one from `generate`. */
export function resolveRequestId(
  incoming: string | readonly string[] | undefined,
  generate: () => string,
): string {
  if (typeof incoming === "string" && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return generate();
}