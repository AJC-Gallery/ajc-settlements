import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "../../../../copy/locales";
import { NAVIGATION_COPY } from "../../../../copy/navigation";
import { NavigationList, worldNavigation } from "../../../../features/navigation";

interface WorldLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ worldId: string }>;
}

// No data is fetched here yet. The API is the only authority on who may see a world (Frontend document, routes).
export default async function WorldLayout({ children, params }: WorldLayoutProps) {
  const { worldId } = await params;
  return (
    <>
      <header>
        <NavigationList items={worldNavigation(worldId)} landmark={NAVIGATION_COPY.landmark} locale={DEFAULT_LOCALE} />
      </header>
      <main>{children}</main>
    </>
  );
}