export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

/** The language used when neither the cookie nor the browser names one (D-003: cookie, then browser, then this). */
export const DEFAULT_LOCALE: Locale = "en";

/** Each language's own name, shown in the language switch. A missing language is a compile error. */
export const LANGUAGE_NAMES = { en: "English", fr: "Français" } as const satisfies Record<Locale, string>;

/** Set by the language switch. Not a secret, so it is not HttpOnly (D-003); SameSite=Lax, Path=/, one year. */
export const LANGUAGE_COOKIE_NAME = "ajc_language";
const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;
export const LANGUAGE_COOKIE_MAX_AGE_SECONDS = DAYS_PER_YEAR * SECONDS_PER_DAY;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** One user-facing text in every language. A missing language is a compile error. */
export type Localised = Readonly<Record<Locale, string>>;

export function pickText(text: Localised, locale: Locale): string {
  return text[locale];
}
