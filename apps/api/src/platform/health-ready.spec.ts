import { describe, expect, it } from "vitest";
import { ApiError } from "../common/api-error.js";
import { readyResponse } from "./health.js";

describe("readyResponse", () => {
  it("answers ok with the commit when the database answers", async () => {
    await expect(readyResponse("abc123", async () => undefined)).resolves.toEqual({
      status: "ok",
      commit: "abc123",
    });
  });

  it("answers SERVICE_UNAVAILABLE with fixed text and none of the driver error", async () => {
    const driver = new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2");
    const error = await readyResponse("abc123", () => Promise.reject(driver)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("SERVICE_UNAVAILABLE");
    expect((error as ApiError).details).toBeNull();
    expect(JSON.stringify([(error as ApiError).message, (error as ApiError).cause])).not.toMatch(
      /ECONNREFUSED|hunter2|10\.0\.0\.5/,
    );
  });
});