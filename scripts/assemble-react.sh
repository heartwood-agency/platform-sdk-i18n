#!/usr/bin/env bash
# assemble-react.sh
#
# Merges common + react-only source strings and translations
# into packages/react/locales/ for NPM package.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCALES_DIR="$REPO_ROOT/packages/react/locales"

echo "Assembling React locales..."

mkdir -p "$LOCALES_DIR"

# --- English source: merge common + react-only JSON ---
# Use node to deep-merge the two JSON files
node -e "
const fs = require('fs');
const path = require('path');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const common = JSON.parse(fs.readFileSync('$REPO_ROOT/sources/common/en.json', 'utf-8'));
const reactOnly = JSON.parse(fs.readFileSync('$REPO_ROOT/sources/react/en.json', 'utf-8'));
const merged = deepMerge(common, reactOnly);

fs.writeFileSync('$LOCALES_DIR/en.json', JSON.stringify(merged, null, 2) + '\n');
"

# --- Translations: merge common + react-only for each locale ---
if [ -d "$REPO_ROOT/translations/react" ]; then
  for json_file in "$REPO_ROOT/translations/react"/*.json; do
    [ -f "$json_file" ] || continue
    filename="$(basename "$json_file")"
    locale="${filename%.json}"

    # Skip platform files — they get merged below
    if [[ "$locale" == *_platform ]]; then
      continue
    fi

    common_file="$json_file"
    platform_file="$REPO_ROOT/translations/react/${locale}_platform.json"

    if [ -f "$platform_file" ]; then
      # Deep merge common + platform-specific
      node -e "
const fs = require('fs');
function deepMerge(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      t[k] = t[k] || {};
      deepMerge(t[k], s[k]);
    } else {
      t[k] = s[k];
    }
  }
  return t;
}
const common = JSON.parse(fs.readFileSync('$common_file', 'utf-8'));
const platform = JSON.parse(fs.readFileSync('$platform_file', 'utf-8'));
fs.writeFileSync('$LOCALES_DIR/${locale}.json', JSON.stringify(deepMerge(common, platform), null, 2) + '\n');
"
    else
      cp "$common_file" "$LOCALES_DIR/${locale}.json"
    fi
  done
fi

echo "React assembly complete: $LOCALES_DIR"
