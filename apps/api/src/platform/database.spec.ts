import { describe, expect, it } from "vitest";
import { assertWorldId, createDataSource } from "./database.js";

const SETTINGS = { databaseUrl: "postgres://ajc_app:pw@localhost:5432/ajc", dbPoolMax: 4 };

describe("assertWorldId", () => {
  it("accepts a UUID", () => {
    expect(assertWorldId("0b1c7a52-3f4e-4c1a-9a3d-6f1d2e8b9c10")).toBe("0b1c7a52-3f4e-4c1a-9a3d-6f1d2e8b9c10");
  });

  it.each(["", "not-a-uuid", "0b1c7a52-3f4e-4c1a-9a3d-6f1d2e8b9c1", "'; DROP TABLE x;--"])(
    "rejects %j",
    (value) => {
      expect(() => assertWorldId(value)).toThrow("worldId must be a UUID");
    },
  );
});

describe("createDataSource", () => {
  it("never synchronizes, never runs migrations at boot and never logs queries", () => {
    const options = createDataSource(SETTINGS).options;
    expect(options).toMatchObject({
      type: "postgres",
      synchronize: false,
      migrationsRun: false,
      logging: false,
      poolSize: 4,
      connectTimeoutMS: 3_000,
    });
  });

  it("does not connect when it is built", () => {
    expect(createDataSource(SETTINGS).isInitialized).toBe(false);
  });
});