import type { Localised } from "./locales";

export const SITE_COPY = {
  name: { en: "AJC Settlements", fr: "AJC Settlements" },
  description: {
    en: "Complete, trustworthy records of your assets and the income they generate.",
    fr: "Des registres complets et fiables de vos biens et des revenus qu’ils génèrent.",
  },
} as const satisfies Record<string, Localised>;