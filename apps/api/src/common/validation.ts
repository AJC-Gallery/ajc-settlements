import type { ErrorCode, FieldError } from "@ajc/contracts";
import { ValidationPipe } from "@nestjs/common";
import { ApiError } from "./api-error.js";

/** A structural subset of class-validator's ValidationError, so this file owns its input shape. */
export interface ValidationIssue {
  readonly property: string;
  readonly constraints?: Readonly<Record<string, string>>;
  readonly children?: readonly ValidationIssue[];
}

/** Typed against the contract list, so a rename there breaks the compile here. */
const VALIDATION_FAILED = "VALIDATION_FAILED" satisfies ErrorCode;

/**
 * Flattens class-validator's tree into the contract's field paths: dot-separated,
 * array positions as numbers (`units.0.nickname`).
 */
export function toFieldErrors(issues: readonly ValidationIssue[], parent = ""): FieldError[] {
  return issues.flatMap((issue) => {
    const field = parent === "" ? issue.property : `${parent}.${issue.property}`;
    const messages = Object.values(issue.constraints ?? {});
    const own = messages.length > 0 ? [{ field, messages }] : [];
    return [...own, ...toFieldErrors(issue.children ?? [], field)];
  });
}

export function validationFailed(issues: readonly ValidationIssue[]): ApiError {
  return new ApiError(VALIDATION_FAILED, "Request validation failed", {
    fields: toFieldErrors(issues),
  });
}

/**
 * The global pipe (C-02): unknown fields are refused, and nothing is converted
 * implicitly (C-04). Query strings use explicit transforms in their DTOs.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: validationFailed,
  });
}