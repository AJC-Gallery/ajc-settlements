import { NAVIGATION_COPY } from "../../copy/navigation";
import type { Localised } from "../../copy/locales";

export type NavigationArea = "public" | "world";

export interface NavigationItem {
  readonly id: string;
  readonly label: Localised;
  readonly href: string;
}

interface NavigationEntry {
  readonly id: string;
  readonly label: Localised;
  readonly hrefTemplate: string;
}

const WORLD_ID_PLACEHOLDER = ":worldId";

// The one place that lists navigation items. The desktop and the mobile navigation will both read it.
// Add an entry only when its page exists; a test fails on a link to a missing page.
const NAVIGATION: Readonly<Record<NavigationArea, readonly NavigationEntry[]>> = {
  public: [{ id: "home", label: NAVIGATION_COPY.home, hrefTemplate: "/" }],
  world: [{ id: "overview", label: NAVIGATION_COPY.overview, hrefTemplate: `/worlds/${WORLD_ID_PLACEHOLDER}` }],
};

// `worldId` is the URL segment exactly as Next passes it (route params arrive still percent-encoded),
// so it is placed in the link as given and never encoded a second time.
function toItem(entry: NavigationEntry, worldId: string): NavigationItem {
  return { id: entry.id, label: entry.label, href: entry.hrefTemplate.replace(WORLD_ID_PLACEHOLDER, () => worldId) };
}

export function publicNavigation(): readonly NavigationItem[] {
  return NAVIGATION.public.map((entry) => toItem(entry, ""));
}

export function worldNavigation(worldId: string): readonly NavigationItem[] {
  return NAVIGATION.world.map((entry) => toItem(entry, worldId));
}