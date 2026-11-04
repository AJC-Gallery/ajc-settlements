import { describe, expect, it } from "vitest";
import { toConstraint } from "./constraint-map.js";

describe("toConstraint", () => {
  it.each([
    ["whitelistValidation", [], { name: "unknownField" }],
    ["isString", [], { name: "isString" }],
    ["isNotEmpty", [], { name: "required" }],
    ["isDefined", [], { name: "required" }],
    ["matches", [/x/], { name: "pattern" }],
    ["minLength", [1], { name: "minLength", min: 1 }],
    ["maxLength", [50], { name: "maxLength", max: 50 }],
    ["min", [0], { name: "min", min: 0 }],
    ["max", [10], { name: "max", max: 10 }],
    ["arrayMinSize", [1], { name: "arrayMinSize", min: 1 }],
    ["arrayMaxSize", [20], { name: "arrayMaxSize", max: 20 }],
    ["isIn", [["a", "b"]], { name: "isOneOf", values: ["a", "b"] }],
  ])("maps %s with %j", (rule, args, expected) => {
    expect(toConstraint(rule, args)).toEqual(expected);
  });

  it.each([
    ["an unknown rule", "isMysterious", []],
    ["a numeric rule without its argument", "maxLength", []],
    ["a numeric rule with a string argument", "maxLength", ["50"]],
    ["a numeric rule with NaN", "min", [Number.NaN]],
    ["isIn with a non-string value", "isIn", [[1, 2]]],
    ["isIn without arguments", "isIn", []],
    ["a name that is an object prototype member", "constructor", []],
    ["another prototype member", "toString", []],
  ])("answers invalid for %s", (_label, rule, args) => {
    expect(toConstraint(rule, args)).toEqual({ name: "invalid" });
  });
});