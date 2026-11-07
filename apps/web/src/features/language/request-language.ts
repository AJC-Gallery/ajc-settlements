import { cookies, headers } from "next/headers";
import { chooseLanguage } from "../../copy/language";
import { LANGUAGE_COOKIE_NAME, type Locale } from "../../copy/locales";

/** The language of a signed-in screen: the cookie, then the browser's language, then English (D-003). */
export async function getRequestLanguage(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return chooseLanguage({
    cookie: cookieStore.get(LANGUAGE_COOKIE_NAME)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
}
