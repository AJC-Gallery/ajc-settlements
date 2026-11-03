import { API_PREFIX, IDEMPOTENCY_KEY_HEADER } from "@ajc/contracts";
import { ApiError } from "./api-error";
import { failureFromResponse } from "./error-envelope";
import { isValidIdempotencyKey } from "./idempotency";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface RequestOptions {
  readonly method?: HttpMethod;
  /** Starts with "/" and is relative to the API prefix, for example "/worlds". */
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly body?: unknown;
  /** From `createIdempotencyAttempt`. Required by the API on creates; never sent on a GET. */
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
}

export interface ApiClientConfig {
  readonly fetch?: FetchLike;
  /** Empty in the browser: the app talks to one origin and the /api rewrite forwards to the API. */
  readonly baseUrl?: string;
  /** Renews the session and says whether it worked. Supplied when the auth contract exists; without it a 401 is final. */
  readonly refreshSession?: () => Promise<boolean>;
  /** Paths whose 401 is never answered with a refresh (sign-in and refresh itself), so a wrong password cannot loop. */
  readonly noRefreshPaths?: readonly string[];
}

export interface ApiClient {
  request<T>(options: RequestOptions): Promise<T>;
}

interface Transport {
  readonly fetchFn: FetchLike;
  readonly baseUrl: string;
}

const UNAUTHENTICATED_STATUS = 401;
const NO_CONTENT_STATUS = 204;

// These are mistakes in our own code, not answers from the API, so they throw before anything is sent.
function checkOptions(options: RequestOptions): void {
  if (!options.path.startsWith("/") || /[?#]/.test(options.path)) {
    throw new Error(`The path must start with "/" and carry no query or fragment: ${options.path}`);
  }
  if (options.idempotencyKey === undefined) return;
  if ((options.method ?? "GET") === "GET") throw new Error("An idempotency key is never sent on a GET");
  if (!isValidIdempotencyKey(options.idempotencyKey)) throw new Error("The idempotency key does not match the contract");
}

function buildUrl(baseUrl: string, options: RequestOptions): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) params.set(name, String(value));
  }
  const text = params.toString();
  return `${baseUrl}${API_PREFIX}${options.path}${text === "" ? "" : `?${text}`}`;
}

function buildInit(options: RequestOptions): RequestInit {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.idempotencyKey !== undefined) headers[IDEMPOTENCY_KEY_HEADER] = options.idempotencyKey;
  return {
    method: options.method ?? "GET",
    headers,
    // The browser talks to one origin, so the session cookie goes along and never to another site.
    credentials: "same-origin",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  };
}

async function sendOnce(transport: Transport, options: RequestOptions): Promise<Response> {
  try {
    return await transport.fetchFn(buildUrl(transport.baseUrl, options), buildInit(options));
  } catch (error) {
    if (options.signal?.aborted === true) throw error;
    throw new ApiError({ kind: "network" });
  }
}

async function readSuccess<T>(response: Response): Promise<T> {
  if (response.status === NO_CONTENT_STATUS) return undefined as T;
  try {
    return await response.json();
  } catch {
    throw new ApiError({ kind: "unreadable", status: response.status });
  }
}

// A refresh token is rotated on use (P-03), so two refreshes at once would invalidate each other:
// every request that gets a 401 while one is running waits for that one.
function createSharedRefresh(refreshSession: (() => Promise<boolean>) | undefined): (() => Promise<boolean>) | null {
  if (refreshSession === undefined) return null;
  let inFlight: Promise<boolean> | null = null;
  return () => {
    inFlight ??= refreshSession().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const transport: Transport = {
    fetchFn: config.fetch ?? ((input, init) => globalThis.fetch(input, init)),
    baseUrl: config.baseUrl ?? "",
  };
  const refresh = createSharedRefresh(config.refreshSession);
  const noRefreshPaths = config.noRefreshPaths ?? [];
  return {
    async request<T>(options: RequestOptions): Promise<T> {
      checkOptions(options);
      let response = await sendOnce(transport, options);
      const canRefresh = refresh !== null && !noRefreshPaths.includes(options.path);
      // One refresh and one retry: a second 401 is final (Frontend document, error table).
      if (response.status === UNAUTHENTICATED_STATUS && canRefresh && (await refresh())) {
        response = await sendOnce(transport, options);
      }
      if (response.ok) return readSuccess<T>(response);
      throw new ApiError(await failureFromResponse(response));
    },
  };
}
