import { ERROR_CODES } from "@ajc/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiFailure } from "./api-error";
import { createApiClient, REQUEST_TIMEOUT_MS } from "./api";
import { createFakeFetch, errorResponse, hangUntilAborted, jsonResponse, type Step } from "./fake-fetch";

async function failureOf(promise: Promise<unknown>): Promise<ApiFailure | null> {
  const error: unknown = await promise.then(() => null, (e: unknown) => e);
  return error instanceof ApiError ? error.failure : null;
}

function clientWith(steps: readonly Step[]) {
  const fake = createFakeFetch(steps);
  return createApiClient({ fetch: fake.fetchFn });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("request timeout", () => {
  it("does use the 30 seconds that D-003 names", () => {
    expect(REQUEST_TIMEOUT_MS).toBe(30_000);
  });

  it("does give a network failure when the API does not answer within the limit", async () => {
    vi.useFakeTimers();
    const outcome = failureOf(clientWith([hangUntilAborted]).request({ path: "/me" }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await outcome).toEqual({ kind: "network" });
  });

  it("does not give up before the limit is reached", async () => {
    vi.useFakeTimers();
    let settled = false;
    const outcome = failureOf(clientWith([hangUntilAborted]).request({ path: "/me" })).then((failure) => {
      settled = true;
      return failure;
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toEqual({ kind: "network" });
  });

  it("does time out each request on its own when two run at once", async () => {
    vi.useFakeTimers();
    const client = clientWith([hangUntilAborted, jsonResponse(200, { ok: true })]);
    const slow = failureOf(client.request({ path: "/slow" }));
    expect(await client.request({ path: "/fast" })).toEqual({ ok: true });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await slow).toEqual({ kind: "network" });
  });
});

describe("request timeout, the caller's own signal", () => {
  it("does rethrow the caller's abort unchanged when the caller aborts first", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new DOMException("stop", "AbortError");
    const outcome = clientWith([hangUntilAborted]).request({ path: "/me", signal: controller.signal }).catch((e: unknown) => e);
    controller.abort(reason);
    expect(await outcome).toBe(reason);
  });

  it("does rethrow the caller's abort unchanged when the signal was already aborted", async () => {
    vi.useFakeTimers();
    const reason = new DOMException("already", "AbortError");
    const outcome = clientWith([hangUntilAborted]).request({ path: "/me", signal: AbortSignal.abort(reason) }).catch((e: unknown) => e);
    expect(await outcome).toBe(reason);
  });

  it("does not turn the caller's abort into a network failure when the limit passes afterwards", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new DOMException("stop", "AbortError");
    const outcome = clientWith([hangUntilAborted]).request({ path: "/me", signal: controller.signal }).catch((e: unknown) => e);
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await outcome).toBe(reason);
  });
});

describe("request timeout, no timer left behind", () => {
  it("does leave no timer running after a successful call", async () => {
    vi.useFakeTimers();
    await clientWith([jsonResponse(200, {})]).request({ path: "/me" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does leave no timer running after a call the API answered with an error", async () => {
    vi.useFakeTimers();
    await failureOf(clientWith([errorResponse(ERROR_CODES.NOT_FOUND)]).request({ path: "/me" }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does leave no timer running after a call that did not reach the API", async () => {
    vi.useFakeTimers();
    await failureOf(clientWith([new TypeError("fetch failed")]).request({ path: "/me" }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does leave no timer running after the caller aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const outcome = clientWith([hangUntilAborted]).request({ path: "/me", signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    await outcome;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does leave no timer running after a call that timed out", async () => {
    vi.useFakeTimers();
    const outcome = failureOf(clientWith([hangUntilAborted]).request({ path: "/me" }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await outcome;
    expect(vi.getTimerCount()).toBe(0);
  });
});
