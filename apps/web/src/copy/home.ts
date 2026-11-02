import type { Localised } from "./locales";

export const HOME_COPY = {
  heading: { en: "AJC Settlements", fr: "AJC Settlements" },
  intro: {
    en: "Complete, trustworthy records of your assets and the income they generate.",
    fr: "Des registres complets et fiables de vos biens et des revenus qu’ils génèrent.",
  },
} as const satisfies Record<string, Localised>;