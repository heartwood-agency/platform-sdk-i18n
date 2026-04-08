/**
 * generate-platform-sources.ts
 *
 * Converts the canonical JSON source (sources/common/en.json) into:
 *   - Android XML (sources/common/strings.xml)
 *   - iOS .strings (sources/common/Localizable.strings)
 *
 * Key conversion rules:
 *   JSON nested keys:  { "common": { "auth": { "signInButton": "Sign In" } } }
 *   Android XML key:   yv_i18n_common_auth_signInButton
 *   iOS .strings key:  "common.auth.signInButton"
 *
 * Interpolation conversion:
 *   JSON (i18next):    {{name}}
 *   Android XML:       %1$s (positional, ordered by first appearance)
 *   iOS .strings:      %@ (ordered by first appearance, %1$@ for multiple)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const COMMON_DIR = path.join(REPO_ROOT, "sources", "common");
const SOURCE_JSON = path.join(COMMON_DIR, "en.json");
const OUTPUT_XML = path.join(COMMON_DIR, "strings.xml");
const OUTPUT_STRINGS = path.join(COMMON_DIR, "Localizable.strings");

interface FlatEntry {
  dotKey: string; // e.g. "common.auth.signInButton"
  value: string; // e.g. "Sign In"
}

/** Flatten nested JSON into dot-separated key-value pairs. */
function flattenJson(
  obj: Record<string, unknown>,
  prefix = ""
): FlatEntry[] {
  const entries: FlatEntry[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      entries.push({ dotKey, value });
    } else if (typeof value === "object" && value !== null) {
      entries.push(
        ...flattenJson(value as Record<string, unknown>, dotKey)
      );
    }
  }
  return entries;
}

/** Escape a string value for Android XML resource format. */
function escapeXmlValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

/** Escape a string value for iOS .strings format. */
function escapeStringsValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Convert i18next interpolation ({{name}}) to Android positional format (%1$s, %2$s, ...).
 */
function convertInterpolationToAndroid(value: string): string {
  let index = 0;
  return value.replace(/\{\{(\w+)\}\}/g, () => {
    index++;
    return `%${index}$s`;
  });
}

/**
 * Convert i18next interpolation ({{name}}) to iOS positional format.
 * Single param uses %@, multiple params use %1$@, %2$@, etc.
 */
function convertInterpolationToIOS(value: string): string {
  const matches = value.match(/\{\{(\w+)\}\}/g);
  if (!matches) return value;

  if (matches.length === 1) {
    return value.replace(/\{\{(\w+)\}\}/, "%@");
  }

  let index = 0;
  return value.replace(/\{\{(\w+)\}\}/g, () => {
    index++;
    return `%${index}$@`;
  });
}

/** Convert dot key to Android resource name: dots → underscores, prefixed with yv_i18n_. */
function toAndroidKey(dotKey: string): string {
  return `yv_i18n_${dotKey.replace(/\./g, "_")}`;
}

/** Generate Android strings.xml content. */
function generateAndroidXml(entries: FlatEntry[]): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- AUTO-GENERATED from en.json — do not edit manually -->",
    "<resources>",
  ];

  for (const { dotKey, value } of entries) {
    const androidKey = toAndroidKey(dotKey);
    const androidValue = escapeXmlValue(convertInterpolationToAndroid(value));
    lines.push(`    <string name="${androidKey}">${androidValue}</string>`);
  }

  lines.push("</resources>", "");
  return lines.join("\n");
}

/** Generate iOS Localizable.strings content. */
function generateIOSStrings(entries: FlatEntry[]): string {
  const lines = [
    "/* AUTO-GENERATED from en.json — do not edit manually */",
    "",
  ];

  for (const { dotKey, value } of entries) {
    const iosValue = escapeStringsValue(convertInterpolationToIOS(value));
    lines.push(`"${dotKey}" = "${iosValue}";`);
  }

  lines.push("");
  return lines.join("\n");
}

function main(): void {
  if (!fs.existsSync(SOURCE_JSON)) {
    console.error(`Source file not found: ${SOURCE_JSON}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE_JSON, "utf-8");
  const json = JSON.parse(raw) as Record<string, unknown>;
  const entries = flattenJson(json);

  console.log(`Parsed ${entries.length} string entries from en.json`);

  const xmlContent = generateAndroidXml(entries);
  fs.writeFileSync(OUTPUT_XML, xmlContent, "utf-8");
  console.log(`Generated ${OUTPUT_XML}`);

  const stringsContent = generateIOSStrings(entries);
  fs.writeFileSync(OUTPUT_STRINGS, stringsContent, "utf-8");
  console.log(`Generated ${OUTPUT_STRINGS}`);

  console.log("Done.");
}

main();
