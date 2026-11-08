import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { LANGUAGE_SWITCH_PATH } from "../../copy/language";
import { LANGUAGE_COOKIE_MAX_AGE_SECONDS, LANGUAGE_COOKIE_NAME } from "../../copy/locales";
import { POST } from "./route";

const HOST = "http://localhost:3000";

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return POST(new NextRequest(`${HOST}${LANGUAGE_SWITCH_PATH}`, { method: "POST", body, headers }));
}

function form(locale: string): URLSearchParams {
  return new URLSearchParams({ locale });
}

describe("language switch route", () => {
  it("does have its route file at the path the switch posts to", () => {
    expect(existsSync(fileURLToPath(new URL(`.${LANGUAGE_SWITCH_PATH}/route.ts`, new URL("../", import.meta.url))))).toBe(true);
  });

  it("does set the cookie and go to the same public page in the new language when posted from it", async () => {
    const response = await post(form("fr"), { referer: `${HOST}/en` });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${HOST}/fr`);
    expect(response.cookies.get(LANGUAGE_COOKIE_NAME)?.value).toBe("fr");
  });

  it("does stay on a signed-in page when posted from it", async () => {
    const response = await post(form("fr"), { referer: `${HOST}/worlds/abc?tab=1` });
    expect(response.headers.get("location")).toBe(`${HOST}/worlds/abc?tab=1`);
  });

  it("does go to the public home when there is no referer", async () => {
    expect((await post(form("fr"))).headers.get("location")).toBe(`${HOST}/fr`);
  });

  it("does go to the public home when the referer is on another host", async () => {
    const response = await post(form("en"), { referer: "https://evil.example/worlds/abc" });
    expect(response.headers.get("location")).toBe(`${HOST}/en`);
  });

  it("does not follow a protocol-relative path in the referer", async () => {
    const response = await post(form("en"), { referer: `${HOST}//evil.example/x` });
    expect(response.headers.get("location")).toBe(`${HOST}/en`);
  });

  it("does set a cookie for one year with Path=/ and SameSite=Lax and without HttpOnly", async () => {
    const setCookie = (await post(form("fr"))).headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${LANGUAGE_COOKIE_NAME}=fr`);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain(`Max-Age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}`);
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).not.toContain("HttpOnly");
  });

  it.each([["an unknown language", form("de")], ["no language", new URLSearchParams()]])(
    "does answer 400 and set no cookie when the form has %s",
    async (_name, body) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(response.headers.get("set-cookie")).toBeNull();
    },
  );

  it("does answer 400 when the body is not a form", async () => {
    const response = await post(JSON.stringify({ locale: "fr" }), { "content-type": "application/json" });
    expect(response.status).toBe(400);
  });
});
