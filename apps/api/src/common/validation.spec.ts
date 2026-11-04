import "reflect-metadata";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error.js";
import { createValidationPipe, toFieldErrors } from "./validation.js";

// Validators are applied by plain calls: the test runner does not emit decorator metadata.
class PersonDto {
  declare name: string;
  declare age: number;
  declare kind: string;
}
IsString()(PersonDto.prototype, "name");
MaxLength(50)(PersonDto.prototype, "name");
IsInt()(PersonDto.prototype, "age");
Min(1)(PersonDto.prototype, "age");
Max(120)(PersonDto.prototype, "age");
IsIn(["a", "b"])(PersonDto.prototype, "kind");

class UnitDto {
  declare nickname: string;
}
IsString()(UnitDto.prototype, "nickname");
MinLength(1)(UnitDto.prototype, "nickname");
MaxLength(5)(UnitDto.prototype, "nickname");

class HouseDto {
  declare units: UnitDto[];
  declare main: UnitDto;
}
Type(() => UnitDto)(HouseDto.prototype, "units");
ValidateNested({ each: true })(HouseDto.prototype, "units");
Type(() => UnitDto)(HouseDto.prototype, "main");
ValidateNested()(HouseDto.prototype, "main");

const run = (pipe: ReturnType<typeof createValidationPipe>, value: unknown, metatype: new () => object) =>
  pipe.transform(value, { type: "body", metatype });

async function rejection(value: unknown, metatype: new () => object, seen: string[] = []): Promise<ApiError> {
  const pipe = createValidationPipe((path, rule) => void seen.push(`${path}:${rule}`));
  try {
    await run(pipe, value, metatype);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the pipe to reject");
}
const fieldsOf = (error: ApiError) =>
  (error.details as unknown as { fields: { field: string; constraints?: unknown[] }[] }).fields;
const constraintsFor = (error: ApiError, field: string) => fieldsOf(error).find((f) => f.field === field)?.constraints;

describe("toFieldErrors", () => {
  it("joins nested properties with dots and array positions as numbers", () => {
    const issues = [
      {
        property: "units",
        children: [{ property: "0", children: [{ property: "nickname", constraints: { minLength: "too short" } }] }],
      },
    ];
    expect(toFieldErrors(issues).map((f) => f.field)).toEqual(["units.0.nickname"]);
  });

  it("lists every message of one field and skips fields without constraints", () => {
    const issues = [{ property: "a", constraints: { x: "one", y: "two" } }, { property: "b" }];
    const result = toFieldErrors(issues);
    expect(result).toHaveLength(1);
    expect(result[0]?.messages).toEqual(["one", "two"]);
  });

  it("answers invalid and reports it when the issue has no target", () => {
    const seen: string[] = [];
       const result = toFieldErrors([{ property: "a", constraints: { maxLength: "m" } }], (p, r) => void seen.push(`${p}:${r}`));
    expect(result[0]?.constraints).toEqual([{ name: "invalid" }]);
    expect(seen).toEqual(["a:maxLength"]);
  });
});

describe("createValidationPipe", () => {
  it("returns a class instance when the body is valid", async () => {
    const result = await run(createValidationPipe(), { name: "Ana", age: 5, kind: "a" }, PersonDto);
    expect(result).toBeInstanceOf(PersonDto);
  });

  it("rejects an unknown field and names it unknownField", async () => {
    const error = await rejection({ name: "Ana", age: 5, kind: "a", isAdmin: true }, PersonDto);
    expect(constraintsFor(error, "isAdmin")).toEqual([{ name: "unknownField" }]);
  });

  it("carries the upper bound as data when a string is too long", async () => {
    const error = await rejection({ name: "x".repeat(51), age: 5, kind: "a" }, PersonDto);
    expect(constraintsFor(error, "name")).toEqual([{ name: "maxLength", max: 50 }]);
  });

  it("carries the lower bound as data when a number is too small", async () => {
    const error = await rejection({ name: "Ana", age: 0, kind: "a" }, PersonDto);
    expect(constraintsFor(error, "age")).toEqual([{ name: "min", min: 1 }]);
  });

  it("carries the allowed values when the value is not in the list", async () => {
    const error = await rejection({ name: "Ana", age: 5, kind: "z" }, PersonDto);
    expect(constraintsFor(error, "kind")).toEqual([{ name: "isOneOf", values: ["a", "b"] }]);
  });

  it("rejects a number sent as a string when implicit conversion is off", async () => {
    const error = await rejection({ name: "Ana", age: "5", kind: "a" }, PersonDto);
    expect(constraintsFor(error, "age")).toContainEqual({ name: "isInt" });
  });

  it("carries the parameter of a rule on a nested object", async () => {
    const error = await rejection({ units: [], main: { nickname: "toolongvalue" } }, HouseDto);
    expect(constraintsFor(error, "main.nickname")).toEqual([{ name: "maxLength", max: 5 }]);
  });

  it("carries the parameter of a rule on a nested array item", async () => {
    const error = await rejection({ units: [{ nickname: "toolongvalue" }], main: { nickname: "ok" } }, HouseDto);
    expect(constraintsFor(error, "units.0.nickname")).toEqual([{ name: "maxLength", max: 5 }]);
  });

  it("reports no invalid rule when every rule is known", async () => {
    const seen: string[] = [];
    await rejection({ name: "x".repeat(51), age: 0, kind: "z" }, PersonDto, seen);
    expect(seen).toEqual([]);
  });
  it("never puts the offending value in the response or the invalid report", async () => {
    const seen: string[] = [];
    const error = await rejection({ name: "x".repeat(51), age: 5, kind: "hunter2-secret" }, PersonDto, seen);
    expect(JSON.stringify(error.details)).not.toContain("hunter2-secret");
    expect(seen.join()).not.toContain("hunter2-secret");
  });

  it("leaks no sibling field of the request body when another field fails", async () => {
    const seen: string[] = [];
    const body = { units: [{ nickname: "toolongvalue" }], main: { nickname: "ok" }, secret: "sentinel-8841" };
    const error = await rejection(body, HouseDto, seen);
    const text = JSON.stringify({ details: error.details, message: error.message, seen });
    expect(text).not.toContain("sentinel-8841");
    expect(text).not.toContain("toolongvalue");
  });

  it("keeps each request's class when two requests overlap", async () => {
    const pipe = createValidationPipe();
    const results = await Promise.allSettled([
      run(pipe, { name: "x".repeat(51), age: 5, kind: "a" }, PersonDto),
      run(pipe, { units: [], main: { nickname: "toolongvalue" } }, HouseDto),
      run(pipe, { name: "x".repeat(51), age: 5, kind: "a" }, PersonDto),
    ]);
    const errors = results.map((r) => (r.status === "rejected" ? (r.reason as ApiError) : undefined));
    expect(constraintsFor(errors[0] as ApiError, "name")).toEqual([{ name: "maxLength", max: 50 }]);
    expect(constraintsFor(errors[1] as ApiError, "main.nickname")).toEqual([{ name: "maxLength", max: 5 }]);
    expect(constraintsFor(errors[2] as ApiError, "name")).toEqual([{ name: "maxLength", max: 50 }]);
  });
});