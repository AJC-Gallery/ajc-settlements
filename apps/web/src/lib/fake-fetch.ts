import { ERROR_HTTP_STATUS, type ErrorCode } from "@ajc/contracts";
import type { FetchLike } from "./api";

// Test support only: nothing in the app imports this file.

export interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit;
}

/** A Response (used once), an Error (the request fails to reach the API), or a function that builds one. */
export type Step = Response | Error | ((init: RequestInit) => Response | Promise<Response>);

export function createFakeFetch(steps: readonly Step[]): { readonly fetchFn: FetchLike; readonly calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  let next = 0;
  const fetchFn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const step = steps[next++];
    if (step === undefined) throw new Error("The fake fetch ran out of steps");
    if (step instanceof Error) throw step;
    return typeof step === "function" ? step(init) : step;
  };
  return { fetchFn, calls };
}

/** A request that never answers until it is aborted, then fails with the abort reason, as a real fetch does. */
export function hangUntilAborted(init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const { signal } = init;
    if (signal?.aborted === true) reject(signal.reason);
    else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export function errorResponse(code: ErrorCode, details: unknown = null, requestId = "req-1"): Response {
  return jsonResponse(ERROR_HTTP_STATUS[code], { code, message: "English text for logs", details, requestId });
}

export function headerOf(call: RecordedCall | undefined, name: string): string | null {
  return new Headers(call?.init.headers).get(name);
}
