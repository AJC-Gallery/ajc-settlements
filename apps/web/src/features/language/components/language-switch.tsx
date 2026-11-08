import { LANGUAGE_SWITCH_PATH } from "../../../copy/language";
import { LANGUAGE_SWITCH_COPY } from "../../../copy/language-switch";
import { LANGUAGE_NAMES, LOCALES, pickText, type Locale } from "../../../copy/locales";

// A plain form post, so it works without JavaScript. Unstyled on purpose: the design is on hold (D-001A).
export function LanguageSwitch({ current }: { readonly current: Locale }) {
  return (
    <form method="post" action={LANGUAGE_SWITCH_PATH} role="group" aria-label={pickText(LANGUAGE_SWITCH_COPY.label, current)}>
      {LOCALES.map((locale) => (
        <button key={locale} type="submit" name="locale" value={locale} lang={locale} aria-current={locale === current ? "true" : undefined}>
          {LANGUAGE_NAMES[locale]}
        </button>
      ))}
    </form>
  );
}
