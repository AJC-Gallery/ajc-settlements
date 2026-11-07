import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./locales";

/** Only this many language ranges of an Accept-Language header are read; the rest is ignored. */
export const MAX_ACCEPT_LANGUAGE_RANGES = 20;

/** The route that the language switch posts to. */
export const LANGUAGE_SWITCH_PATH = "/language";

/** The one place that adds the language prefix to a public path (D-003: public pages carry /en or /fr). */
export function publicPath(locale: Locale, rest = ""): string {
  return `/${locale}${rest}`;
}

interface LanguageRange {
  readonly tag: string;
  readonly quality: number;
  readonly position: number;
}

function parseRange(text: string, position: number): LanguageRange | null {
  const [tagPart = "", ...params] = text.split(";");
  const tag = tagPart.trim().toLowerCase();
  if (tag === "") return null;
  const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
  const quality = q === undefined ? 1 : Math.min(Number(q.slice(2)), 1);
  // q=0 means "not acceptable"; a q that is not a number is a malformed range.
  return Number.isNaN(quality) || quality <= 0 ? null : { tag, quality, position };
}

/** The first supported language in an Accept-Language header, best quality first; null when none matches. */
export function fromAcceptLanguage(header: string | null): Locale | null {
  if (header === null) return null;
  const ranges = header
    .split(",")
    .slice(0, MAX_ACCEPT_LANGUAGE_RANGES)
    .flatMap((text, position) => {
      const range = parseRange(text, position);
      return range === null ? [] : [range];
    })
    .sort((a, b) => b.quality - a.quality || a.position - b.position);
  for (const { tag } of ranges) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}

export interface LanguageInput {
  readonly cookie: string | undefined;
  readonly acceptLanguage: string | null;
}

/** D-003: the cookie, then the browser's language, then the default. A cookie value we do not know is ignored. */
export function chooseLanguage(input: LanguageInput): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  return fromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

const PUBLIC_PREFIX = new RegExp(`^/(?:${LOCALES.join("|")})(?=[/?#]|$)`);

/** Where to go after a switch: the same public page in the new language, the same signed-in page, or the public home. */
export function languageSwitchTarget(returnPath: string | null, locale: Locale): string {
  const isSafe =
    returnPath !== null && returnPath.startsWith("/") && !returnPath.startsWith("//") && !returnPath.includes("\\");
  if (!isSafe) return publicPath(locale);
  return PUBLIC_PREFIX.test(returnPath) ? returnPath.replace(PUBLIC_PREFIX, publicPath(locale)) : returnPath;
}

/** The path and query of a Referer header, only when it points at this same host. */
export function pathFromReferer(referer: string | null, host: string): string | null {
  if (referer === null) return null;
  try {
    const url = new URL(referer);
    return url.host === host ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
