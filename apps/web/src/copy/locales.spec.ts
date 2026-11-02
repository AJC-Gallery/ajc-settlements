import { describe, expect, it } from "vitest";
import { LOCALES, pickText, type Localised } from "./locales";

describe("Localised", () => {
  it("does not compile a text that is missing a language", () => {
    // @ts-expect-error a text with no French must fail to compile
    const missingFrench: Localised = { en: "only English" };
    expect(missingFrench.en).toBe("only English");
  });

  it("does not compile a text that names a language the product does not have", () => {
    // @ts-expect-error a text with an unknown language must fail to compile
    const unknownLanguage: Localised = { en: "Hello", fr: "Bonjour", de: "Hallo" };
    expect(unknownLanguage.en).toBe("Hello");
  });
});

describe("pickText", () => {
  const text: Localised = { en: "Home", fr: "Accueil" };

  it("returns the English text when the locale is en", () => {
    expect(pickText(text, "en")).toBe("Home");
  });

  it("returns the French text when the locale is fr", () => {
    expect(pickText(text, "fr")).toBe("Accueil");
  });

  it("lists English and French as the only languages", () => {
    expect(LOCALES).toEqual(["en", "fr"]);
  });
});