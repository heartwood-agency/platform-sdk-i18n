/**
 * validate-keys.ts
 *
 * Verifies that the generated Android XML and iOS .strings files have exactly
 * the same keys as the canonical en.json source. Exits with code 1 on mismatch.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const COMMON_DIR = path.join(REPO_ROOT, "sources", "common");
const SOURCE_JSON = path.join(COMMON_DIR, "en.json");
const ANDROID_XML = path.join(COMMON_DIR, "strings.xml");
const IOS_STRINGS = path.join(COMMON_DIR, "Localizable.strings");

/** Flatten nested JSON into dot-separated keys. */
function flattenJsonKeys(
  obj: Record<string, unknown>,
  prefix = ""
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(dotKey);
    } else if (typeof value === "object" && value !== null) {
      keys.push(
        ...flattenJsonKeys(value as Record<string, unknown>, dotKey)
      );
    }
  }
  return keys;
}

/** Extract key names from Android strings.xml (yv_i18n_ prefix, underscores → dots). */
function extractAndroidKeys(xml: string): string[] {
  const keys: string[] = [];
  const regex = /<string name="yv_i18n_([^"]+)">/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    // Convert underscore-separated key back to dot-separated
    // We need to be careful: camelCase parts shouldn't be split
    // The pattern is: scope_feature_element where dots were replaced with underscores
    // Original: common.auth.signInButton → yv_i18n_common_auth_signInButton
    // We reconstruct by matching against known JSON keys, but for validation
    // we just need to compare sets, so we store the android key as-is
    keys.push(match[1]);
  }
  return keys;
}

/** Extract key names from iOS .strings file. */
function extractIOSKeys(strings: string): string[] {
  const keys: string[] = [];
  const regex = /^"([^"]+)"\s*=/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(strings)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/** Convert dot-separated key to Android format (underscores). */
function dotKeyToAndroid(dotKey: string): string {
  return dotKey.replace(/\./g, "_");
}

function main(): void {
  let hasErrors = false;

  // Read JSON source
  if (!fs.existsSync(SOURCE_JSON)) {
    console.error(`ERROR: Source file not found: ${SOURCE_JSON}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf-8"));
  const jsonKeys = flattenJsonKeys(json).sort();

  console.log(`JSON source: ${jsonKeys.length} keys`);

  // Validate Android XML
  if (!fs.existsSync(ANDROID_XML)) {
    console.error(
      `ERROR: Android XML not found: ${ANDROID_XML}\n  Run 'npm run generate' first.`
    );
    hasErrors = true;
  } else {
    const xmlContent = fs.readFileSync(ANDROID_XML, "utf-8");
    const androidKeys = extractAndroidKeys(xmlContent).sort();
    const expectedAndroidKeys = jsonKeys.map(dotKeyToAndroid).sort();

    const missingInAndroid = expectedAndroidKeys.filter(
      (k) => !androidKeys.includes(k)
    );
    const extraInAndroid = androidKeys.filter(
      (k) => !expectedAndroidKeys.includes(k)
    );

    if (missingInAndroid.length > 0) {
      console.error(
        `ERROR: Keys in JSON but missing from Android XML:\n  ${missingInAndroid.join("\n  ")}`
      );
      hasErrors = true;
    }
    if (extraInAndroid.length > 0) {
      console.error(
        `ERROR: Keys in Android XML but missing from JSON:\n  ${extraInAndroid.join("\n  ")}`
      );
      hasErrors = true;
    }
    if (missingInAndroid.length === 0 && extraInAndroid.length === 0) {
      console.log(`Android XML: ${androidKeys.length} keys — OK`);
    }
  }

  // Validate iOS .strings
  if (!fs.existsSync(IOS_STRINGS)) {
    console.error(
      `ERROR: iOS .strings not found: ${IOS_STRINGS}\n  Run 'npm run generate' first.`
    );
    hasErrors = true;
  } else {
    const stringsContent = fs.readFileSync(IOS_STRINGS, "utf-8");
    const iosKeys = extractIOSKeys(stringsContent).sort();
    const expectedIOSKeys = [...jsonKeys].sort();

    const missingInIOS = expectedIOSKeys.filter(
      (k) => !iosKeys.includes(k)
    );
    const extraInIOS = iosKeys.filter(
      (k) => !expectedIOSKeys.includes(k)
    );

    if (missingInIOS.length > 0) {
      console.error(
        `ERROR: Keys in JSON but missing from iOS .strings:\n  ${missingInIOS.join("\n  ")}`
      );
      hasErrors = true;
    }
    if (extraInIOS.length > 0) {
      console.error(
        `ERROR: Keys in iOS .strings but missing from JSON:\n  ${extraInIOS.join("\n  ")}`
      );
      hasErrors = true;
    }
    if (missingInIOS.length === 0 && extraInIOS.length === 0) {
      console.log(`iOS .strings: ${iosKeys.length} keys — OK`);
    }
  }

  if (hasErrors) {
    console.error("\nValidation FAILED.");
    process.exit(1);
  }

  console.log("\nAll keys consistent across formats.");
}

main();
