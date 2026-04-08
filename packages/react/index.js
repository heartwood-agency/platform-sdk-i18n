const fs = require("fs");
const path = require("path");

const localesDir = path.join(__dirname, "locales");

/**
 * Returns all available locale codes.
 * @returns {string[]}
 */
function getAvailableLocales() {
  return fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Loads the locale JSON for a given language code.
 * @param {string} locale - e.g. "en", "es"
 * @returns {object} The parsed locale object
 */
function getLocale(locale) {
  return require(path.join(localesDir, `${locale}.json`));
}

/**
 * Returns a map of all locales keyed by language code.
 * Suitable for passing to i18next.init({ resources }).
 * @returns {Record<string, { translation: object }>}
 */
function getAllLocales() {
  const resources = {};
  for (const locale of getAvailableLocales()) {
    resources[locale] = { translation: getLocale(locale) };
  }
  return resources;
}

module.exports = { getAvailableLocales, getLocale, getAllLocales };
