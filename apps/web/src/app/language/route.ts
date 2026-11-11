import { NextResponse, type NextRequest } from "next/server";
import { languageSwitchTarget, pathFromReferer } from "../../copy/language";
import { isLocale, LANGUAGE_COOKIE_MAX_AGE_SECONDS, LANGUAGE_COOKIE_NAME, type Locale } from "../../copy/locales";

const SEE_OTHER_STATUS = 303;
const BAD_REQUEST_STATUS = 400;

async function readLocale(request: NextRequest): Promise<Locale | null> {
  try {
    const value = (await request.formData()).get("locale");
    return isLocale(value) ? value : null;
  } catch {
    // A body that is not a form is a bad request, not a server error.
    return null;
  }
}

// Secure only on https (D-004), decided from the request alone: its own protocol first, then what a proxy in
// front of us says it received. Plain http (local development) gets no Secure, because a browser would refuse
// to store the cookie.
function isHttps(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return forwarded === "https";
}

// The language switch posts here (D-003). It sets the cookie and goes back to the page the person was on.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const locale = await readLocale(request);
  if (locale === null) return new NextResponse(null, { status: BAD_REQUEST_STATUS });
  const returnPath = pathFromReferer(request.headers.get("referer"), request.nextUrl.host);
  const target = new URL(languageSwitchTarget(returnPath, locale), request.url);
  const response = NextResponse.redirect(target, SEE_OTHER_STATUS);
  response.cookies.set(LANGUAGE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    secure: isHttps(request),
    maxAge: LANGUAGE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
