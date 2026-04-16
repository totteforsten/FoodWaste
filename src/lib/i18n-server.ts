import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

export function getLocale(): Locale {
  try {
    const c = cookies().get("locale")?.value as Locale | undefined;
    if (c === "sv" || c === "en") return c;
  } catch { /* outside request scope */ }
  return DEFAULT_LOCALE;
}
