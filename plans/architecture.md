# yv-platform-i18n: Multi-Platform i18n Monorepo

## Context

YouVersion has four Platform API SDKs (Kotlin/Android, Swift/iOS, React, React Native) that all need localization. This repo is the single source of truth for all localized strings, integrated with CrowdIn for translation management, with automated packaging and publishing for each platform.

## Architecture Overview

### Source Format Decision: JSON as canonical, auto-generate platform files

Rather than maintaining three copies of every common string by hand, we use **JSON (i18next format) as the single authoring format** for common strings. A local generation script converts JSON → Android XML and iOS .strings before commit. Platform-specific strings use their native format directly.

This avoids CrowdIn's known bundle export bugs (plurals don't convert correctly) while still uploading native formats to CrowdIn for translation.

**Why not pure platform-native for everything?**
- Maintaining identical strings in 3 formats manually is error-prone and tedious
- Key drift between formats is the #1 risk

**Why not JSON-only with CrowdIn bundle conversion?**
- CrowdIn bundle export has known bugs with plural conversion between formats
- Platform-native features (Android plurals, iOS stringsdict) don't map cleanly from JSON

**The hybrid approach:**
1. Authors write common strings once in JSON
2. A script generates the Android XML and iOS .strings equivalents
3. All files (JSON + generated native) are uploaded to CrowdIn as native format files
4. CrowdIn translates each format natively with full fidelity
5. Translations download in native formats, ready for packaging

### React + React Native share one NPM package

Both use i18next JSON, so there's no reason for separate packages unless they have genuinely different string sets. If platform-specific strings diverge significantly in the future, the package can export namespaced subsets.

## Pipeline Flow

```
1. Developer adds/edits strings in sources/common/en.json (or platform-specific files)
         │
2. Run `npm run generate` → auto-generates strings.xml + Localizable.strings
         │
3. PR opened → validate.yml checks key consistency across formats
         │
4. PR merged → crowdin-upload.yml uploads all source files to CrowdIn
         │
5. Translators work in CrowdIn (duplicates hidden, each unique string translated once)
         │
6. crowdin-download.yml runs (weekly schedule or manual trigger)
   → Downloads translations → Opens PR with new translations
         │
7. Translation PR reviewed and merged
         │
8. Developer creates git tag (v1.2.3)
         │
9. build-and-publish.yml triggers:
   a. Assemble: merge common + platform-specific into packages/
   b. Android AAR → publish to Maven Central
   c. NPM package → publish to npmjs.com
   d. iOS: Swift Package consumed via git tag on this repo (no separate publish needed)
```

## Platform Packaging Details

### Android (AAR → Maven)
- Gradle `com.android.library` + `maven-publish` plugin
- Resource prefix `yv_i18n_` prevents naming conflicts with host app
- Published to Maven Central

### iOS (Swift Package → Git tag on this repo)
- `Package.swift` with `defaultLocalization: "en"` and `.process("Resources")`
- Helper exposes `Bundle.module` for string lookup
- Consumed by adding SPM dependency pointing at this repo + version tag
- **Critical consumer requirement**: Host app must declare all supported languages in `Info.plist` `CFBundleLocalizations`

### React + React Native (NPM package)
- Exports JSON locale files compatible with i18next / react-i18next
- Single package serves both React web and React Native
- Consumers import locale files and pass to their i18n provider

## Key Naming Convention

```
<scope>.<feature>.<element>
```
- `common.auth.signInButton` — shared across all platforms
- `android.permissions.cameraRationale` — Android only
- `ios.settings.notificationToggle` — iOS only
- `react.nav.breadcrumbHome` — React/RN only

## Interpolation

- JSON (i18next): `{{name}}`
- Android XML: `%1$s` (positional)
- iOS .strings: `%@` (single) or `%1$@` (multiple)
- Generation script converts automatically

## Versioning Strategy

Unified SemVer across all packages:
- **PATCH** (1.0.X): Translation updates only
- **MINOR** (1.X.0): New string keys added
- **MAJOR** (X.0.0): String keys removed or renamed (breaking for consumers)

## Decisions

- **Source format**: JSON as canonical, auto-generate Android XML + iOS .strings
- **React packages**: Single shared NPM package for React + React Native
- **Package registries**: Public registries — npmjs.com for NPM, Maven Central for Android AAR
- **iOS distribution**: Swift Package consumed directly from this monorepo via git tags
- **Package naming**: `@youversion/platform-i18n` (NPM), `com.youversion.platform:i18n` (Maven), `YVPlatformI18n` (Swift)
- **Quality gate**: Require approved translations (`export_only_approved: true` in CrowdIn download)
