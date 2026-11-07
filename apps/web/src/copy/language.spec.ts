import { describe, expect, it } from "vitest";
import {
  chooseLanguage,
  fromAcceptLanguage,
  languageSwitchTarget,
  MAX_ACCEPT_LANGUAGE_RANGES,
  pathFromReferer,
  publicPath,
} from "./language";
import { isLocale, LANGUAGE_COOKIE_MAX_AGE_SECONDS } from "./locales";

describe("chooseLanguage", () => {
  it("does use the cookie when the cookie names a language", () => {
    expect(chooseLanguage({ cookie: "fr", acceptLanguage: "en" })).toBe("fr");
  });

  it("does prefer the cookie over the browser language when they differ", () => {
    expect(chooseLanguage({ cookie: "en", acceptLanguage: "fr-FR,fr;q=0.9" })).toBe("en");
  });

  it("does use the browser language when there is no cookie", () => {
    expect(chooseLanguage({ cookie: undefined, acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" })).toBe("fr");
  });

  it.each(["de", "FR", "fr-FR", "", " fr", "constructor", "__proto__"])(
    "does fall back to the browser language when the cookie value is %j",
    (cookie) => {
      expect(chooseLanguage({ cookie, acceptLanguage: "en" })).toBe("en");
      expect(chooseLanguage({ cookie, acceptLanguage: null })).toBe("en");
    },
  );

  it("does use English when there is no cookie and no usable browser language", () => {
    expect(chooseLanguage({ cookie: undefined, acceptLanguage: null })).toBe("en");
    expect(chooseLanguage({ cookie: undefined, acceptLanguage: "de,es" })).toBe("en");
  });
});

describe("fromAcceptLanguage", () => {
  it.each([
    ["fr", "fr"],
    ["fr-CA", "fr"],
    ["FR-ca", "fr"],
    ["de,fr;q=0.5", "fr"],
    ["en;q=0.5,fr", "fr"],
    ["fr;q=0.4,en;q=0.9", "en"],
    ["fr, en", "fr"],
    ["en, fr", "en"],
    ["fr;q=0, en", "en"],
    ["fr;q=abc, en", "en"],
  ])("does read %j as %s", (header, expected) => {
    expect(fromAcceptLanguage(header)).toBe(expected);
  });

  it.each([null, "", "*", "de", "fr;q=0", ",,,", "frx"])("does return null when the header is %j", (header) => {
    expect(fromAcceptLanguage(header)).toBeNull();
  });

  it("does ignore the ranges after the limit when a header is very long", () => {
    const filler = Array.from({ length: MAX_ACCEPT_LANGUAGE_RANGES }, () => "de").join(",");
    expect(fromAcceptLanguage(`${filler},fr`)).toBeNull();
  });
});

describe("languageSwitchTarget", () => {
  it.each([
    ["/en", "fr", "/fr"],
    ["/fr", "en", "/en"],
    ["/en/sign-in", "fr", "/fr/sign-in"],
    ["/en?x=1", "fr", "/fr?x=1"],
    ["/en#top", "fr", "/fr#top"],
  ] as const)("does swap the prefix of a public page when given %s", (path, locale, expected) => {
    expect(languageSwitchTarget(path, locale)).toBe(expected);
  });

  it("does keep a signed-in path as it is when the language changes", () => {
    expect(languageSwitchTarget("/worlds/abc?tab=1", "fr")).toBe("/worlds/abc?tab=1");
  });

  it("does not treat a path that only starts with a language code as a public page", () => {
    expect(languageSwitchTarget("/english", "fr")).toBe("/english");
    expect(languageSwitchTarget("/frames/1", "en")).toBe("/frames/1");
  });

  it.each([null, "", "worlds", "//evil.example", "//evil.example/x", "/\\evil.example", "https://evil.example"])(
    "does go to the public home when the return path is %j",
    (path) => {
      expect(languageSwitchTarget(path, "fr")).toBe("/fr");
    },
  );
});

describe("pathFromReferer", () => {
  it("does return the path and query when the referer is on the same host", () => {
    expect(pathFromReferer("https://dev.example/en/page?x=1", "dev.example")).toBe("/en/page?x=1");
  });

  it("does keep the port when it is part of the host", () => {
    expect(pathFromReferer("http://localhost:3000/worlds/a", "localhost:3000")).toBe("/worlds/a");
  });

  it.each([null, "", "not a url", "https://evil.example/en"])("does return null when the referer is %j", (referer) => {
    expect(pathFromReferer(referer, "dev.example")).toBeNull();
  });
});

describe("language constants", () => {
  it("does add the prefix in one place when a public path is built", () => {
    expect(publicPath("fr")).toBe("/fr");
    expect(publicPath("en", "/sign-in")).toBe("/en/sign-in");
  });

  it("does recognise only the product's languages", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect([undefined, null, "de", "EN", 1, {}].some(isLocale)).toBe(false);
  });

  it("does keep the cookie for one year when it is set", () => {
    expect(LANGUAGE_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });
});
