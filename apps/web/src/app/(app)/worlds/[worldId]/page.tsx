import { pickText } from "../../../../copy/locales";
import { OVERVIEW_COPY } from "../../../../copy/overview";
import { getRequestLanguage } from "../../../../features/language";

export default async function WorldOverviewPage() {
  const locale = await getRequestLanguage();
  return (
    <>
      <h1>{pickText(OVERVIEW_COPY.heading, locale)}</h1>
      <p>{pickText(OVERVIEW_COPY.notBuilt, locale)}</p>
    </>
  );
}
