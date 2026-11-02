import type { Localised } from "./locales";

export const NAVIGATION_COPY = {
  landmark: { en: "Main navigation", fr: "Navigation principale" },
  home: { en: "Home", fr: "Accueil" },
  overview: { en: "Overview", fr: "Aperçu" },
} as const satisfies Record<string, Localised>;