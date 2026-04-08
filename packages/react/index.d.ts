/**
 * Returns all available locale codes (e.g. ["en", "es"]).
 */
export function getAvailableLocales(): string[];

/**
 * Loads the locale JSON for a given language code.
 */
export function getLocale(locale: string): Record<string, unknown>;

/**
 * Returns a map of all locales keyed by language code.
 * Suitable for passing to i18next.init({ resources }).
 */
export function getAllLocales(): Record<
  string,
  { translation: Record<string, unknown> }
>;
