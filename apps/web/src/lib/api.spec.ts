import {
  ERROR_CODES,
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_KEY_MIN_LENGTH,
  type PageResponse,
} from "@ajc/contracts";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiFailure } from "./api-error";
import { createApiClient } from "./api";
import { createFakeFetch, errorResponse, headerOf, jsonResponse, type Step } from "./fake-fetch";
import { createIdempotencyAttempt } from "./idempotency";

const UNAUTHENTICATED = (): Response => errorResponse(ERROR_CODES.UNAUTHENTICATED);

async function failureOf(promise: Promise<unknown>): Promise<ApiFailure | null> {
  const error: unknown = await promise.then(() => null, (e: unknown) => e);
  return error instanceof ApiError ? error.failure : null;
}

function clientWith(steps: readonly Step[], config: Parameters<typeof createApiClient>[0] = {}) {
  const fake = createFakeFetch(steps);
  return { client: createApiClient({ ...config, fetch: fake.fetchFn }), calls: fake.calls };
}

describe("request, what is sent", () => {
  it("does call the path under the API prefix with same-origin credentials when a GET is made", async () => {
    const { client, calls } = clientWith([jsonResponse(200, {})]);
    await client.request({ path: "/worlds" });
    expect(calls[0]?.url).toBe("/api/v1/worlds");
    expect(calls[0]?.init).toMatchObject({ method: "GET", credentials: "same-origin" });
  });

  it("does add only the defined query values when a query is given", async () => {
    const { client, calls } = clientWith([jsonResponse(200, {})]);
    await client.request({ path: "/assets", query: { page: 2, closed: false, search: undefined } });
    expect(calls[0]?.url).toBe("/api/v1/assets?page=2&closed=false");
  });

  it("does put the base URL in front when one is configured", async () => {
    const { client, calls } = clientWith([jsonResponse(200, {})], { baseUrl: "https://web.example" });
    await client.request({ path: "/me" });
    expect(calls[0]?.url).toBe("https://web.example/api/v1/me");
  });

  it("does send a JSON body with the JSON content type when a body is given", async () => {
    const { client, calls } = clientWith([jsonResponse(201, {})]);
    await client.request({ method: "POST", path: "/worlds", body: { name: "Mine" } });
    expect(calls[0]?.init.body).toBe('{"name":"Mine"}');
    expect(headerOf(calls[0], "content-type")).toBe("application/json");
  });

  it("does send no body and no content type when none is given", async () => {
    const { client, calls } = clientWith([jsonResponse(200, {})]);
    await client.request({ path: "/me" });
    expect(calls[0]?.init.body).toBeUndefined();
    expect(headerOf(calls[0], "content-type")).toBeNull();
  });

  it("does set the idempotency header when a key is given on a POST", async () => {
    const key = createIdempotencyAttempt().keyFor({});
    const { client, calls } = clientWith([jsonResponse(201, {})]);
    await client.request({ method: "POST", path: "/worlds", body: {}, idempotencyKey: key });
    expect(headerOf(calls[0], IDEMPOTENCY_KEY_HEADER)).toBe(key);
  });
});

describe("request, mistakes in our own code", () => {
  it.each([
    ["a key shorter than the contract allows", { method: "POST", path: "/worlds", idempotencyKey: "k".repeat(IDEMPOTENCY_KEY_MIN_LENGTH - 1) }],
    ["a key on a GET", { path: "/worlds", idempotencyKey: createIdempotencyAttempt().keyFor({}) }],
    ["a path without a leading slash", { path: "worlds" }],
    ["a path with a query string", { path: "/worlds?x=1" }],
  ] as const)("does throw before sending when given %s", async (_name, options) => {
    const { client, calls } = clientWith([jsonResponse(200, {})]);
    await expect(client.request(options)).rejects.toThrow(Error);
    expect(calls).toHaveLength(0);
  });
});

describe("request, what comes back", () => {
  it("does return the parsed body typed as the contract type when the answer is 200", async () => {
    const page = { results: [{ id: "a" }], page: 1, limit: 15, total: 1, totalPages: 1 } satisfies PageResponse<{ id: string }>;
    const { client } = clientWith([jsonResponse(200, page)]);
    expect(await client.request<PageResponse<{ id: string }>>({ path: "/assets" })).toEqual(page);
  });

  it("does return undefined when the answer is 204", async () => {
    const { client } = clientWith([new Response(null, { status: 204 })]);
    expect(await client.request<void>({ method: "DELETE", path: "/x" })).toBeUndefined();
  });

  it("does give an unreadable failure when a 200 body is not JSON", async () => {
    const { client } = clientWith([new Response("<html>", { status: 200 })]);
    expect(await failureOf(client.request({ path: "/me" }))).toEqual({ kind: "unreadable", status: 200 });
  });

  it("does throw the typed failure when the API answers with an error", async () => {
    const { client } = clientWith([errorResponse(ERROR_CODES.NOT_FOUND)]);
    expect(await failureOf(client.request({ path: "/worlds/x" }))).toEqual({ kind: "notFound", requestId: "req-1" });
  });

  it("does give a network failure when the request does not reach the API", async () => {
    const { client } = clientWith([new TypeError("fetch failed")]);
    expect(await failureOf(client.request({ path: "/me" }))).toEqual({ kind: "network" });
  });

  it("does rethrow the original error when the request was aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException("aborted", "AbortError");
    const { client } = clientWith([abort]);
    await expect(client.request({ path: "/me", signal: controller.signal })).rejects.toBe(abort);
  });
});

describe("request, a 401", () => {
  it("does refresh once and retry once when the first answer is 401", async () => {
    const refreshSession = vi.fn(() => Promise.resolve(true));
    const { client, calls } = clientWith([UNAUTHENTICATED(), jsonResponse(200, { ok: true })], { refreshSession });
    expect(await client.request({ path: "/me" })).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("does give an unauthenticated failure when the retry is a 401 again", async () => {
    const refreshSession = vi.fn(() => Promise.resolve(true));
    const { client, calls } = clientWith([UNAUTHENTICATED(), UNAUTHENTICATED()], { refreshSession });
    expect(await failureOf(client.request({ path: "/me" }))).toEqual({ kind: "unauthenticated", requestId: "req-1" });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("does not retry when the refresh is refused", async () => {
    const { client, calls } = clientWith([UNAUTHENTICATED()], { refreshSession: () => Promise.resolve(false) });
    expect((await failureOf(client.request({ path: "/me" })))?.kind).toBe("unauthenticated");
    expect(calls).toHaveLength(1);
  });

  it("does not refresh when the path is one that never refreshes", async () => {
    const refreshSession = vi.fn(() => Promise.resolve(true));
    const { client, calls } = clientWith([UNAUTHENTICATED()], { refreshSession, noRefreshPaths: ["/sign-in"] });
    expect((await failureOf(client.request({ method: "POST", path: "/sign-in", body: {} })))?.kind).toBe("unauthenticated");
    expect(refreshSession).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("does not refresh when no refresh function is configured", async () => {
    const { client, calls } = clientWith([UNAUTHENTICATED()]);
    expect((await failureOf(client.request({ path: "/me" })))?.kind).toBe("unauthenticated");
    expect(calls).toHaveLength(1);
  });

  it("does call the refresh once when two requests get a 401 at the same time", async () => {
    const refreshSession = vi.fn(() => Promise.resolve(true));
    const { client } = clientWith([UNAUTHENTICATED(), UNAUTHENTICATED(), jsonResponse(200, {}), jsonResponse(200, {})], { refreshSession });
    await Promise.all([client.request({ path: "/a" }), client.request({ path: "/b" })]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does start a new refresh when a later request gets a 401 after the first refresh finished", async () => {
    const refreshSession = vi.fn(() => Promise.resolve(true));
    const { client } = clientWith([UNAUTHENTICATED(), jsonResponse(200, {}), UNAUTHENTICATED(), jsonResponse(200, {})], { refreshSession });
    await client.request({ path: "/a" });
    await client.request({ path: "/b" });
    expect(refreshSession).toHaveBeenCalledTimes(2);
  });

  it("does pass on the error when the refresh itself fails", async () => {
    const failure = new ApiError({ kind: "network" });
    const { client } = clientWith([UNAUTHENTICATED()], { refreshSession: () => Promise.reject(failure) });
    await expect(client.request({ path: "/me" })).rejects.toBe(failure);
  });
});

describe("request, retry with the same idempotency key", () => {
  it("does send the same key when a submit is repeated after a 503 and a new one after it succeeded", async () => {
    const attempt = createIdempotencyAttempt();
    const input = { name: "Mine" };
    const steps: Step[] = [errorResponse(ERROR_CODES.SERVICE_UNAVAILABLE), jsonResponse(201, {}), jsonResponse(201, {})];
    const { client, calls } = clientWith(steps);
    const submit = () => client.request({ method: "POST", path: "/worlds", body: input, idempotencyKey: attempt.keyFor(input) });
    expect((await failureOf(submit()))?.kind).toBe("server");
    await submit();
    attempt.succeeded();
    await submit();
    const keys = calls.map((call) => headerOf(call, IDEMPOTENCY_KEY_HEADER));
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });
});
