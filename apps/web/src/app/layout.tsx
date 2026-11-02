import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, pickText } from "../copy/locales";
import { SITE_COPY } from "../copy/site";

export const metadata: Metadata = {
  title: pickText(SITE_COPY.name, DEFAULT_LOCALE),
  description: pickText(SITE_COPY.description, DEFAULT_LOCALE),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>{children}</body>
    </html>
  );
}