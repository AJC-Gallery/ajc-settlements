import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error.js";

describe("ApiError", () => {
  it("carries the code and message and has null details when none are given", () => {
    const error = new ApiError("NOT_FOUND", "No such record");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("No such record");
    expect(error.details).toBeNull();
  });

  it("carries typed details when they are given", () => {
    const error = new ApiError("MISSING_PERMISSION", "Denied", { permission: "assets.close" });
    expect(error.details).toEqual({ permission: "assets.close" });
  });
});