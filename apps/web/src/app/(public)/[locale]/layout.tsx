import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocale, LOCALES, pickText } from "../../../copy/locales";
import { NAVIGATION_COPY } from "../../../copy/navigation";
import { SITE_COPY } from "../../../copy/site";
import { NavigationList, publicNavigation } from "../../../features/navigation";

interface PublicLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

// Only the product's languages exist as a first segment; anything else is a 404 (D-003).
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<PublicLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: pickText(SITE_COPY.name, locale), description: pickText(SITE_COPY.description, locale) };
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <header>
          <NavigationList items={publicNavigation(locale)} landmark={NAVIGATION_COPY.landmark} locale={locale} />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
