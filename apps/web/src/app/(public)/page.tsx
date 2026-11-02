import { HOME_COPY } from "../../copy/home";
import { DEFAULT_LOCALE, pickText } from "../../copy/locales";

export default function HomePage() {
  return (
    <>
      <h1>{pickText(HOME_COPY.heading, DEFAULT_LOCALE)}</h1>
      <p>{pickText(HOME_COPY.intro, DEFAULT_LOCALE)}</p>
    </>
  );
}