#!/usr/bin/env bash
# assemble-android.sh
#
# Merges common + android-only source strings and translations
# into packages/android/src/main/res/ for AAR building.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RES_DIR="$REPO_ROOT/packages/android/src/main/res"

echo "Assembling Android resources..."

# --- English source strings ---
mkdir -p "$RES_DIR/values"

# Common strings (generated from JSON)
cp "$REPO_ROOT/sources/common/strings.xml" "$RES_DIR/values/strings.xml"

# Android-only strings
cp "$REPO_ROOT/sources/android/strings.xml" "$RES_DIR/values/strings_platform.xml"

# --- Translations ---
if [ -d "$REPO_ROOT/translations/android" ]; then
  for locale_dir in "$REPO_ROOT/translations/android"/values-*/; do
    [ -d "$locale_dir" ] || continue
    locale_name="$(basename "$locale_dir")"
    mkdir -p "$RES_DIR/$locale_name"

    # Copy common translated strings
    if [ -f "$locale_dir/strings.xml" ]; then
      cp "$locale_dir/strings.xml" "$RES_DIR/$locale_name/strings.xml"
    fi

    # Copy platform-specific translated strings
    if [ -f "$locale_dir/strings_platform.xml" ]; then
      cp "$locale_dir/strings_platform.xml" "$RES_DIR/$locale_name/strings_platform.xml"
    fi
  done
fi

echo "Android assembly complete: $RES_DIR"
