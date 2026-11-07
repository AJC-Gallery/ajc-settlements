import { publicPath } from "../../copy/language";
import type { Locale, Localised } from "../../copy/locales";
import { NAVIGATION_COPY } from "../../copy/navigation";

export type NavigationArea = "public" | "world";

export interface NavigationItem {
  readonly id: string;
  readonly label: Localised;
  readonly href: string;
}

const WORLD_ID_PLACEHOLDER = ":worldId";

// The one place that lists navigation items. The desktop and the mobile navigation will both read it.
// Add an entry only when its page exists; a test fails on a link to a missing page.
// Public paths are relative to the language prefix, which `publicPath` adds in one place.
const PUBLIC_ENTRIES = [{ id: "home", label: NAVIGATION_COPY.home, path: "" }] as const;
const WORLD_ENTRIES = [
  { id: "overview", label: NAVIGATION_COPY.overview, hrefTemplate: `/worlds/${WORLD_ID_PLACEHOLDER}` },
] as const;

export function publicNavigation(locale: Locale): readonly NavigationItem[] {
  return PUBLIC_ENTRIES.map((entry) => ({ id: entry.id, label: entry.label, href: publicPath(locale, entry.path) }));
}

// `worldId` is the URL segment exactly as Next passes it (route params arrive still percent-encoded),
// so it is placed in the link as given and never encoded a second time.
export function worldNavigation(worldId: string): readonly NavigationItem[] {
  return WORLD_ENTRIES.map((entry) => ({
    id: entry.id,
    label: entry.label,
    href: entry.hrefTemplate.replace(WORLD_ID_PLACEHOLDER, () => worldId),
  }));
}
