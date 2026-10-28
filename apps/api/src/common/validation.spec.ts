import "reflect-metadata";
import { Type } from "class-transformer";
import { IsInt, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error.js";
import { createValidationPipe, toFieldErrors } from "./validation.js";

// Validators are applied by plain calls: the test runner does not emit decorator metadata.
class PersonDto {
  declare name: string;
  declare age: number;
}
IsString()(PersonDto.prototype, "name");
MaxLength(50)(PersonDto.prototype, "name");
IsInt()(PersonDto.prototype, "age");

class UnitDto {
  declare nickname: string;
}
IsString()(UnitDto.prototype, "nickname");
MinLength(1)(UnitDto.prototype, "nickname");

class HouseDto {
  declare units: UnitDto[];
}
Type(() => UnitDto)(HouseDto.prototype, "units");
ValidateNested({ each: true })(HouseDto.prototype, "units");

const pipe = createValidationPipe();
const run = (value: unknown, metatype: new () => object) =>
  pipe.transform(value, { type: "body", metatype });

async function rejection(value: unknown, metatype: new () => object): Promise<ApiError> {
  try {
    await run(value, metatype);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the pipe to reject");
}

describe("toFieldErrors", () => {
  it("joins nested properties with dots and array positions as numbers", () => {
    const issues = [
      {
        property: "units",
        children: [{ property: "0", children: [{ property: "nickname", constraints: { minLength: "too short" } }] }],
      },
    ];
    expect(toFieldErrors(issues)).toEqual([{ field: "units.0.nickname", messages: ["too short"] }]);
  });

  it("lists every message of one field and skips fields without constraints", () => {
    const issues = [{ property: "a", constraints: { x: "one", y: "two" } }, { property: "b" }];
    expect(toFieldErrors(issues)).toEqual([{ field: "a", messages: ["one", "two"] }]);
  });
});

describe("createValidationPipe", () => {
  it("returns a class instance when the body is valid", async () => {
    const result = await run({ name: "Ana", age: 5 }, PersonDto);
    expect(result).toBeInstanceOf(PersonDto);
    expect(result).toMatchObject({ name: "Ana", age: 5 });
  });

  it("rejects with VALIDATION_FAILED when an unknown field is sent", async () => {
    const error = await rejection({ name: "Ana", age: 5, isAdmin: true }, PersonDto);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.details).toMatchObject({ fields: [{ field: "isAdmin" }] });
  });

  it("rejects a number sent as a string when implicit conversion is off", async () => {
    const error = await rejection({ name: "Ana", age: "5" }, PersonDto);
    expect(error.details).toMatchObject({ fields: [{ field: "age" }] });
  });

  it("rejects a value above its upper bound", async () => {
    const error = await rejection({ name: "x".repeat(51), age: 5 }, PersonDto);
    expect(error.details).toMatchObject({ fields: [{ field: "name" }] });
  });

  it("reports the path of a nested array item", async () => {
    const error = await rejection({ units: [{ nickname: "" }] }, HouseDto);
    expect(error.details).toMatchObject({ fields: [{ field: "units.0.nickname" }] });
  });
});