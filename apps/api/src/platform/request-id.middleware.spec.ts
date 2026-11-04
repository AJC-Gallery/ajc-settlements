import { describe, expect, it } from "vitest";
import { createRequestIdMiddleware, type IncomingLike } from "./request-id.middleware.js";

function run(headers: IncomingLike["headers"]) {
  const req: IncomingLike = { headers };
  const set: Record<string, string> = {};
  let nextCalls = 0;
  createRequestIdMiddleware(() => "generated-id-1")(
    req,
    { setHeader: (name, value) => void (set[name] = value) },
    () => void (nextCalls += 1),
  );
  return { req, set, nextCalls };
}

describe("createRequestIdMiddleware", () => {
  it("keeps a well-formed incoming id on the request and the response", () => {
    const { req, set, nextCalls } = run({ "x-request-id": "req_1234-abcd" });
    expect(req.requestId).toBe("req_1234-abcd");
    expect(set["x-request-id"]).toBe("req_1234-abcd");
    expect(nextCalls).toBe(1);
  });

  it("makes an id when the header is missing", () => {
    expect(run({}).req.requestId).toBe("generated-id-1");
  });

  it("makes an id when the incoming one could inject into the logs", () => {
    const { req, set } = run({ "x-request-id": 'abcdefgh\n{"level":"error"}' });
    expect(req.requestId).toBe("generated-id-1");
    expect(set["x-request-id"]).toBe("generated-id-1");
  });
});