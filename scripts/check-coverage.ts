/**
 * check-coverage.ts
 *
 * Generates a translation completeness report by comparing
 * translated files against the English source keys.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TRANSLATIONS_DIR = path.join(REPO_ROOT, "translations");
const SOURCES_DIR = path.join(REPO_ROOT, "sources");

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

/** Extract keys from Android strings.xml. */
function extractAndroidKeys(xml: string): string[] {
  const keys: string[] = [];
  const regex = /<string name="([^"]+)">/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/** Extract keys from iOS .strings file. */
function extractIOSKeys(strings: string): string[] {
  const keys: string[] = [];
  const regex = /^"([^"]+)"\s*=/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(strings)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

interface PlatformReport {
  platform: string;
  sourceKeyCount: number;
  locales: { locale: string; translated: number; missing: number; percent: string }[];
}

function checkReactCoverage(): PlatformReport {
  const commonJson = JSON.parse(
    fs.readFileSync(path.join(SOURCES_DIR, "common", "en.json"), "utf-8")
  );
  const reactJson = JSON.parse(
    fs.readFileSync(path.join(SOURCES_DIR, "react", "en.json"), "utf-8")
  );
  const sourceKeys = [
    ...flattenJsonKeys(commonJson),
    ...flattenJsonKeys(reactJson),
  ];

  const locales: PlatformReport["locales"] = [];
  const reactDir = path.join(TRANSLATIONS_DIR, "react");

  if (fs.existsSync(reactDir)) {
    for (const file of fs.readdirSync(reactDir)) {
      if (!file.endsWith(".json") || file.includes("_platform")) continue;
      const locale = file.replace(".json", "");
      const translated = flattenJsonKeys(
        JSON.parse(fs.readFileSync(path.join(reactDir, file), "utf-8"))
      );

      // Also check platform file
      const platformFile = path.join(reactDir, `${locale}_platform.json`);
      if (fs.existsSync(platformFile)) {
        translated.push(
          ...flattenJsonKeys(
            JSON.parse(fs.readFileSync(platformFile, "utf-8"))
          )
        );
      }

      const missing = sourceKeys.length - translated.length;
      locales.push({
        locale,
        translated: translated.length,
        missing: Math.max(0, missing),
        percent: ((translated.length / sourceKeys.length) * 100).toFixed(1),
      });
    }
  }

  return { platform: "React/RN", sourceKeyCount: sourceKeys.length, locales };
}

function checkAndroidCoverage(): PlatformReport {
  const commonXml = fs.readFileSync(
    path.join(SOURCES_DIR, "common", "strings.xml"),
    "utf-8"
  );
  const platformXml = fs.readFileSync(
    path.join(SOURCES_DIR, "android", "strings.xml"),
    "utf-8"
  );
  const sourceKeys = [
    ...extractAndroidKeys(commonXml),
    ...extractAndroidKeys(platformXml),
  ];

  const locales: PlatformReport["locales"] = [];
  const androidDir = path.join(TRANSLATIONS_DIR, "android");

  if (fs.existsSync(androidDir)) {
    for (const dir of fs.readdirSync(androidDir)) {
      if (!dir.startsWith("values-")) continue;
      const locale = dir.replace("values-", "");
      let translated: string[] = [];

      const commonFile = path.join(androidDir, dir, "strings.xml");
      if (fs.existsSync(commonFile)) {
        translated.push(
          ...extractAndroidKeys(fs.readFileSync(commonFile, "utf-8"))
        );
      }

      const platformFile = path.join(androidDir, dir, "strings_platform.xml");
      if (fs.existsSync(platformFile)) {
        translated.push(
          ...extractAndroidKeys(fs.readFileSync(platformFile, "utf-8"))
        );
      }

      const missing = sourceKeys.length - translated.length;
      locales.push({
        locale,
        translated: translated.length,
        missing: Math.max(0, missing),
        percent: ((translated.length / sourceKeys.length) * 100).toFixed(1),
      });
    }
  }

  return { platform: "Android", sourceKeyCount: sourceKeys.length, locales };
}

function checkIOSCoverage(): PlatformReport {
  const commonStrings = fs.readFileSync(
    path.join(SOURCES_DIR, "common", "Localizable.strings"),
    "utf-8"
  );
  const platformStrings = fs.readFileSync(
    path.join(SOURCES_DIR, "ios", "Localizable.strings"),
    "utf-8"
  );
  const sourceKeys = [
    ...extractIOSKeys(commonStrings),
    ...extractIOSKeys(platformStrings),
  ];

  const locales: PlatformReport["locales"] = [];
  const iosDir = path.join(TRANSLATIONS_DIR, "ios");

  if (fs.existsSync(iosDir)) {
    for (const dir of fs.readdirSync(iosDir)) {
      if (!dir.endsWith(".lproj")) continue;
      const locale = dir.replace(".lproj", "");
      let translated: string[] = [];

      const commonFile = path.join(iosDir, dir, "Localizable.strings");
      if (fs.existsSync(commonFile)) {
        translated.push(
          ...extractIOSKeys(fs.readFileSync(commonFile, "utf-8"))
        );
      }

      const platformFile = path.join(
        iosDir,
        dir,
        "Localizable_platform.strings"
      );
      if (fs.existsSync(platformFile)) {
        translated.push(
          ...extractIOSKeys(fs.readFileSync(platformFile, "utf-8"))
        );
      }

      const missing = sourceKeys.length - translated.length;
      locales.push({
        locale,
        translated: translated.length,
        missing: Math.max(0, missing),
        percent: ((translated.length / sourceKeys.length) * 100).toFixed(1),
      });
    }
  }

  return { platform: "iOS", sourceKeyCount: sourceKeys.length, locales };
}

function main(): void {
  console.log("Translation Coverage Report");
  console.log("===========================\n");

  const reports = [
    checkReactCoverage(),
    checkAndroidCoverage(),
    checkIOSCoverage(),
  ];

  for (const report of reports) {
    console.log(`${report.platform} (${report.sourceKeyCount} source keys)`);
    if (report.locales.length === 0) {
      console.log("  No translations found yet.\n");
      continue;
    }
    for (const locale of report.locales) {
      const bar = "█".repeat(Math.round(parseFloat(locale.percent) / 5));
      console.log(
        `  ${locale.locale.padEnd(8)} ${bar.padEnd(20)} ${locale.percent}% (${locale.translated}/${report.sourceKeyCount}, ${locale.missing} missing)`
      );
    }
    console.log();
  }
}

main();
