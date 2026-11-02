import Link from "next/link";
import { pickText, type Locale, type Localised } from "../../../copy/locales";
import type { NavigationItem } from "../navigation";

interface NavigationListProps {
  readonly items: readonly NavigationItem[];
  readonly landmark: Localised;
  readonly locale: Locale;
}

// Unstyled on purpose: the design is on hold (D-001A). The desktop and mobile navigations replace this later.
export function NavigationList({ items, landmark, locale }: NavigationListProps) {
  return (
    <nav aria-label={pickText(landmark, locale)}>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href}>{pickText(item.label, locale)}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}