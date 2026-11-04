import type { FieldConstraint } from "@ajc/contracts";

/** The stored arguments of one rule: `[50]` for MaxLength(50), `[["a","b"]]` for IsIn. */
export type RuleArguments = readonly unknown[];

const INVALID: FieldConstraint = { name: "invalid" };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

type Builder = (args: RuleArguments) => FieldConstraint;

function withNumber(build: (value: number) => FieldConstraint): Builder {
  return (args) => (isNumber(args[0]) ? build(args[0]) : INVALID);
}

function plain(constraint: FieldConstraint): Builder {
  return () => constraint;
}

/** class-validator rule name to contract constraint. Anything not listed becomes `invalid`. */
const BUILDERS: Readonly<Record<string, Builder>> = {
  whitelistValidation: plain({ name: "unknownField" }),
  isString: plain({ name: "isString" }),
  isInt: plain({ name: "isInt" }),
  isNumber: plain({ name: "isNumber" }),
  isBoolean: plain({ name: "isBoolean" }),
  isArray: plain({ name: "isArray" }),
  isEmail: plain({ name: "isEmail" }),
  isUuid: plain({ name: "isUuid" }),
  isDate: plain({ name: "isDate" }),
  isNotEmpty: plain({ name: "required" }),
  isDefined: plain({ name: "required" }),
  matches: plain({ name: "pattern" }),
  minLength: withNumber((min) => ({ name: "minLength", min })),
  maxLength: withNumber((max) => ({ name: "maxLength", max })),
  min: withNumber((min) => ({ name: "min", min })),
  max: withNumber((max) => ({ name: "max", max })),
  arrayMinSize: withNumber((min) => ({ name: "arrayMinSize", min })),
  arrayMaxSize: withNumber((max) => ({ name: "arrayMaxSize", max })),
  isIn: (args) => (isStringList(args[0]) ? { name: "isOneOf", values: args[0] } : INVALID),
};

/** Pure. Never throws, and never returns a parameter it did not read as the right type. */
export function toConstraint(ruleName: string, args: RuleArguments): FieldConstraint {
  const build = Object.hasOwn(BUILDERS, ruleName) ? BUILDERS[ruleName] : undefined;
  return build === undefined ? INVALID : build(args);
}