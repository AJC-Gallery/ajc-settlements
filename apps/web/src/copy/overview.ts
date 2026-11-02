import type { Localised } from "./locales";

export const OVERVIEW_COPY = {
  heading: { en: "Overview", fr: "Aperçu" },
  notBuilt: { en: "This area is not built yet.", fr: "Cette zone n’est pas encore disponible." },
} as const satisfies Record<string, Localised>;