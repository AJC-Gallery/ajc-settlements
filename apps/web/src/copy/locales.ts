export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

// Placeholder until the owner decides how the language is chosen (F-002, section 3).
// It is the only place that names a default language.
export const DEFAULT_LOCALE: Locale = "en";

/** One user-facing text in every language. A missing language is a compile error. */
export type Localised = Readonly<Record<Locale, string>>;

export function pickText(text: Localised, locale: Locale): string {
  return text[locale];
}