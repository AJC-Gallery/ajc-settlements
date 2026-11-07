import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pickText } from "../../copy/locales";
import { SITE_COPY } from "../../copy/site";
import { getRequestLanguage } from "../../features/language";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLanguage();
  return { title: pickText(SITE_COPY.name, locale), description: pickText(SITE_COPY.description, locale) };
}

// Signed-in screens have no language prefix: the person's language comes from the cookie, then the browser (D-003).
export default async function AppLayout({ children }: { readonly children: ReactNode }) {
  const locale = await getRequestLanguage();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
