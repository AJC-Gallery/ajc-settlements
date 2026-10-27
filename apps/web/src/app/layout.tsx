import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_COPY } from "../copy/site";

export const metadata: Metadata = {
  title: SITE_COPY.name,
  description: SITE_COPY.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}