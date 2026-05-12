export { fr } from "./locales/fr";
export { en } from "./locales/en";
export type { Messages } from "./locales/fr";

export type Locale = "fr" | "en";

const locales = { fr: () => import("./locales/fr").then((m) => m.fr), en: () => import("./locales/en").then((m) => m.en) };

export async function getMessages(locale: Locale) {
  return locales[locale]();
}
