import { notFound } from "next/navigation";
import { HOME_COPY } from "../../../copy/home";
import { isLocale, pickText } from "../../../copy/locales";

export default async function HomePage({ params }: { readonly params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <h1>{pickText(HOME_COPY.heading, locale)}</h1>
      <p>{pickText(HOME_COPY.intro, locale)}</p>
    </>
  );
}
