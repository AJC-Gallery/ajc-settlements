import type { ErrorCode, FieldConstraint, FieldError } from "@ajc/contracts";
import { ValidationPipe } from "@nestjs/common";
import { getMetadataStorage } from "class-validator";
import { ApiError } from "./api-error.js";
import { toConstraint, type RuleArguments } from "./constraint-map.js";

/**
 * A structural subset of class-validator's ValidationError. `target` is read only for its
 * constructor, to find which class owns the property. Its contents are never read or
 * copied: it is the whole request object and can hold passwords and tokens.
 */
export interface ValidationIssue {
  readonly property: string;
  readonly target?: object;
  readonly constraints?: Readonly<Record<string, string>>;
  readonly children?: readonly ValidationIssue[];
}

/** Told about every rule that fell back to `invalid`. Path and rule name only, never a value. */
export type InvalidReporter = (fieldPath: string, ruleName: string) => void;

type ClassRef = abstract new (...args: never[]) => object;

/** Typed against the contract list, so a rename there breaks the compile here. */
const VALIDATION_FAILED = "VALIDATION_FAILED" satisfies ErrorCode;

/** The arguments class-validator stored for one rule on one property of the issue's own class. */
function storedArguments(issue: ValidationIssue, rule: string): RuleArguments {
  const cls = issue.target?.constructor as unknown as ClassRef | undefined;
  if (cls === undefined) return [];
  const found = getMetadataStorage()
    .getTargetValidationMetadatas(cls, "", false, false)
    .find((meta) => meta.propertyName === issue.property && meta.name === rule);
  return found?.constraints ?? [];
}

function constraintsOf(issue: ValidationIssue, field: string, onInvalid: InvalidReporter): FieldConstraint[] {
  return Object.keys(issue.constraints ?? {}).map((rule) => {
    const constraint = toConstraint(rule, storedArguments(issue, rule));
    if (constraint.name === "invalid") onInvalid(field, rule);
    return constraint;
  });
}

/**
 * Flattens class-validator's tree into the contract's field paths: dot-separated,
 * array positions as numbers (`units.0.nickname`).
 */
export function toFieldErrors(
  issues: readonly ValidationIssue[],
  onInvalid: InvalidReporter = () => undefined,
  parent = "",
): FieldError[] {
  return issues.flatMap((issue) => {
    const field = parent === "" ? issue.property : `${parent}.${issue.property}`;
    const messages = Object.values(issue.constraints ?? {});
    const own = messages.length > 0 ? [{ field, messages, constraints: constraintsOf(issue, field, onInvalid) }] : [];
    return [...own, ...toFieldErrors(issue.children ?? [], onInvalid, field)];
  });
}

export function validationFailed(issues: readonly ValidationIssue[], onInvalid?: InvalidReporter): ApiError {
  return new ApiError(VALIDATION_FAILED, "Request validation failed", {
    fields: toFieldErrors(issues, onInvalid),
  });
}

/**
 * The global pipe (C-02): unknown fields are refused, and nothing is converted
 * implicitly (C-04). Query strings use explicit transforms in their DTOs.
 */
export function createValidationPipe(onInvalid?: InvalidReporter): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    // `target` is on so each issue names its owning class; `value` stays off, always.
    validationError: { target: true, value: false },
    // This factory is the ONLY consumer of the raw issues. They carry whole request objects
    // (`target`), so they are converted straight into FieldErrors and dropped here: never
    // logged, serialised, attached to an error or passed to the filter.
    exceptionFactory: (issues) => validationFailed(issues, onInvalid),
  });
}