import { NextResponse, type NextRequest } from "next/server";
import { chooseLanguage, publicPath } from "./copy/language";
import { LANGUAGE_COOKIE_NAME } from "./copy/locales";

// A temporary redirect (307), because the answer depends on the cookie and the browser's language.
const TEMPORARY_REDIRECT_STATUS = 307;

// "/" has no page of its own: it sends the person to the public home in their language (D-003).
export function proxy(request: NextRequest): NextResponse {
  const locale = chooseLanguage({
    cookie: request.cookies.get(LANGUAGE_COOKIE_NAME)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const response = NextResponse.redirect(new URL(publicPath(locale), request.url), TEMPORARY_REDIRECT_STATUS);
  response.headers.set("vary", "Cookie, Accept-Language");
  return response;
}

export const config = { matcher: ["/"] };
