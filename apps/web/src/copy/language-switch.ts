import type { Localised } from "./locales";

export const LANGUAGE_SWITCH_COPY = {
  label: { en: "Language", fr: "Langue" },
} as const satisfies Record<string, Localised>;
