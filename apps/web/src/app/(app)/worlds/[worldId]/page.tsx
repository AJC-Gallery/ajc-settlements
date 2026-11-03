import { DEFAULT_LOCALE, pickText } from "../../../../copy/locales";
import { OVERVIEW_COPY } from "../../../../copy/overview";

export default function WorldOverviewPage() {
  return (
    <>
      <h1>{pickText(OVERVIEW_COPY.heading, DEFAULT_LOCALE)}</h1>
      <p>{pickText(OVERVIEW_COPY.notBuilt, DEFAULT_LOCALE)}</p>
    </>
  );
}