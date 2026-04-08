#!/usr/bin/env bash
# assemble-ios.sh
#
# Merges common + iOS-only source strings and translations
# into packages/ios/Sources/YVPlatformI18n/Resources/ for Swift Package.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES_DIR="$REPO_ROOT/packages/ios/Sources/YVPlatformI18n/Resources"

echo "Assembling iOS resources..."

# --- English source strings ---
mkdir -p "$RESOURCES_DIR/en.lproj"

# Common strings (generated from JSON)
cp "$REPO_ROOT/sources/common/Localizable.strings" "$RESOURCES_DIR/en.lproj/Localizable.strings"

# iOS-only strings — append to the same file
cat "$REPO_ROOT/sources/ios/Localizable.strings" >> "$RESOURCES_DIR/en.lproj/Localizable.strings"

# --- Translations ---
if [ -d "$REPO_ROOT/translations/ios" ]; then
  for lproj_dir in "$REPO_ROOT/translations/ios"/*.lproj/; do
    [ -d "$lproj_dir" ] || continue
    lproj_name="$(basename "$lproj_dir")"
    mkdir -p "$RESOURCES_DIR/$lproj_name"

    # Start with common translated strings
    if [ -f "$lproj_dir/Localizable.strings" ]; then
      cp "$lproj_dir/Localizable.strings" "$RESOURCES_DIR/$lproj_name/Localizable.strings"
    fi

    # Append platform-specific translated strings
    if [ -f "$lproj_dir/Localizable_platform.strings" ]; then
      cat "$lproj_dir/Localizable_platform.strings" >> "$RESOURCES_DIR/$lproj_name/Localizable.strings"
    fi
  done
fi

echo "iOS assembly complete: $RESOURCES_DIR"
