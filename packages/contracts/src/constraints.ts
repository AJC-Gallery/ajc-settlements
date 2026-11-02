/**
 * Why a field failed, as data. The frontend maps `name` plus its parameters to French or
 * English text. The API sends no localised copy, and `messages` is for logs only.
 * Parameters appear only where the sentence needs a number or a list.
 */
export type FieldConstraint =
  /** The value is absent, null, or a blank string. */
  | { readonly name: "required" }
  | { readonly name: "unknownField" }
  | { readonly name: "isString" }
  | { readonly name: "isInt" }
  | { readonly name: "isNumber" }
  | { readonly name: "isBoolean" }
  | { readonly name: "isArray" }
  | { readonly name: "isEmail" }
  | { readonly name: "isUuid" }
  | { readonly name: "isDate" }
  | { readonly name: "minLength"; readonly min: number }
  | { readonly name: "maxLength"; readonly max: number }
  | { readonly name: "min"; readonly min: number }
  | { readonly name: "max"; readonly max: number }
  | { readonly name: "arrayMinSize"; readonly min: number }
  | { readonly name: "arrayMaxSize"; readonly max: number }
  | { readonly name: "isOneOf"; readonly values: readonly string[] }
  | { readonly name: "pattern" }
  /** Any rule without its own name above. The field is wrong, and the UI shows a generic text. */
  | { readonly name: "invalid" };

export type FieldConstraintName = FieldConstraint["name"];
