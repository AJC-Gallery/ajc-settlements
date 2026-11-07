import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { LANGUAGE_COOKIE_NAME } from "./copy/locales";
import { config, proxy } from "./proxy";

function run(headers: Record<string, string> = {}) {
  return proxy(new NextRequest("http://localhost:3000/", { headers }));
}

describe("proxy", () => {
  it("does redirect to the public home in the cookie's language when the cookie is fr", () => {
    const response = run({ cookie: `${LANGUAGE_COOKIE_NAME}=fr`, "accept-language": "en" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/fr");
  });

  it("does redirect to the browser's language when there is no cookie", () => {
    expect(run({ "accept-language": "fr-CA,fr;q=0.9,en;q=0.8" }).headers.get("location")).toBe("http://localhost:3000/fr");
  });

  it("does ignore a cookie value it does not know and use the browser's language", () => {
    const response = run({ cookie: `${LANGUAGE_COOKIE_NAME}=de`, "accept-language": "fr" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/fr");
  });

  it("does redirect to English when there is no cookie and no browser language", () => {
    expect(run().headers.get("location")).toBe("http://localhost:3000/en");
  });

  it("does mark the answer as depending on the cookie and the browser language", () => {
    expect(run().headers.get("vary")).toBe("Cookie, Accept-Language");
  });

  it("does run for the root path only", () => {
    expect(config.matcher).toEqual(["/"]);
  });
});
