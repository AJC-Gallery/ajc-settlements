import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "../../copy/locales";
import { NAVIGATION_COPY } from "../../copy/navigation";
import { NavigationList, publicNavigation } from "../../features/navigation";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <NavigationList items={publicNavigation()} landmark={NAVIGATION_COPY.landmark} locale={DEFAULT_LOCALE} />
      </header>
      <main>{children}</main>
    </>
  );
}