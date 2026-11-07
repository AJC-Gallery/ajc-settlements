/** What the log shows when no route matched. Never the raw URL (D-003). */
export const UNMATCHED_ROUTE_LABEL = "unmatched";

/** The few request members read. `route.path` is the registered pattern, such as `/assets/:id`. */
export interface RouteRequestLike {
  readonly route?: { readonly path?: unknown };
}

/**
 * Pure: the matched route pattern for logs. It never reads `url` or `originalUrl`, so a query
 * string or a path value (a future token in a path) cannot reach a log line (P-13).
 */
export function routeLabelOf(request: RouteRequestLike): string {
  const path = request.route?.path;
  return typeof path === "string" && path !== "" ? path : UNMATCHED_ROUTE_LABEL;
}