# yv-platform-i18n

Multi-platform i18n monorepo for YouVersion. Manages localized strings for Android, iOS, React, and React Native from a single source of truth, with CrowdIn integration for translation management.

## How It Works

**JSON is the canonical source format.** Common strings are authored once in `sources/common/en.json`. A generation script converts them into Android XML (`strings.xml`) and iOS `.strings` files. All three formats are uploaded to CrowdIn, where translators work in native formats with full fidelity. Translations are downloaded back in native formats, assembled into platform packages, and published.

Platform-specific strings (Android-only, iOS-only, React-only) are authored directly in their native format and skip the generation step.

## Repository Structure

```
sources/                          # English source strings (you edit these)
├── common/
│   ├── en.json                   # Canonical source (edit this for shared strings)
│   ├── strings.xml               # Auto-generated — do not edit
│   └── Localizable.strings       # Auto-generated — do not edit
├── android/
│   └── strings.xml               # Android-only strings (hand-authored)
├── ios/
│   └── Localizable.strings       # iOS-only strings (hand-authored)
└── react/
    └── en.json                   # React/RN-only strings (hand-authored)

translations/                     # CrowdIn writes translated files here
├── android/
│   └── values-{locale}/strings.xml
├── ios/
│   └── {locale}.lproj/Localizable.strings
└── react/
    └── {locale}.json

packages/                         # Assembled platform packages (auto-committed)
├── android/                      # Android AAR library
├── ios/                          # Swift Package
└── react/                        # NPM package (React + React Native)
```

## Prerequisites

- Node.js 22+
- npm
- [CrowdIn CLI](https://crowdin.github.io/crowdin-cli/) (`brew install crowdin`)

```bash
npm install
```

## Key Naming Convention

```
<scope>.<feature>.<element>
```

| Scope | Example | Used In |
|-------|---------|---------|
| `common` | `common.auth.signInButton` | All platforms |
| `android` | `android.permissions.cameraRationale` | Android only |
| `ios` | `ios.settings.notificationToggle` | iOS only |
| `react` | `react.nav.breadcrumbHome` | React / React Native only |

Keys are automatically converted per platform:

| Format | Key Style | Interpolation |
|--------|-----------|---------------|
| JSON (i18next) | Nested objects | `{{name}}` |
| Android XML | `yv_i18n_common_auth_signInButton` | `%1$s`, `%2$s` |
| iOS .strings | `"common.auth.signInButton"` | `%@` (single), `%1$@` (multiple) |

## Adding New Strings

### Common strings (shared across all platforms)

1. Edit `sources/common/en.json`:

```json
{
  "common": {
    "bible": {
      "newString": "Your new string with {{param}} interpolation"
    }
  }
}
```

2. Generate the platform files:

```bash
npm run generate
```

This creates/updates `sources/common/strings.xml` and `sources/common/Localizable.strings`.

3. Verify everything is consistent:

```bash
npm run validate
```

4. Create a branch, commit, and open a PR:

```bash
git checkout -b add-new-string
git add sources/common/en.json sources/common/strings.xml sources/common/Localizable.strings
git commit -m "Add common.bible.newString"
git push -u origin add-new-string
```

5. The **Validate** workflow runs on the PR to check that generated files are up to date and keys are consistent.

6. After peer review and merge to `main`, two workflows run automatically:
   - **CrowdIn Upload** — pushes the new string to CrowdIn for translation
   - **Assemble Packages** — rebuilds and commits updated package files

### Platform-specific strings

Edit the native file directly. No generation step needed.

- **Android:** Edit `sources/android/strings.xml`
- **iOS:** Edit `sources/ios/Localizable.strings`
- **React/RN:** Edit `sources/react/en.json`

Create a branch, commit, open a PR, and merge after review. The same workflows trigger on merge to `main`.

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run generate` | Convert `en.json` to Android XML + iOS .strings |
| `npm run validate` | Check key consistency across all three formats |
| `npm run assemble` | Merge common + platform-specific into `packages/` |
| `npm run prebuild` | Full pipeline: generate + validate + assemble |
| `npm run check-coverage` | Translation completeness report |

## Working with CrowdIn

Uploading and downloading translations happens automatically via GitHub Actions. You should not need to run CrowdIn commands locally during normal development.

- **Uploads** happen automatically when source files are merged to `main`.
- **Downloads** happen automatically on a weekly schedule (Monday 6am UTC), or on-demand from the Actions tab ("CrowdIn Download Translations" > "Run workflow"). Downloads open a PR with the new translations for review.

### Translation coverage

Check how complete translations are across all platforms:

```bash
npm run check-coverage
```

### Local CrowdIn CLI (troubleshooting only)

If you need to debug CrowdIn integration, you can run the CLI locally. Install it with `brew install crowdin` and create a `.env` file at the repo root (gitignored):

```
CROWDIN_PROJECT_ID=<your-project-id>
CROWDIN_API_TOKEN=<your-api-token>
CROWDIN_BASE_URL=https://heartwood.crowdin.com
```

```bash
source .env && export CROWDIN_PROJECT_ID CROWDIN_API_TOKEN CROWDIN_BASE_URL

# Test what would be uploaded
crowdin upload sources --dryrun

# Upload sources
crowdin upload sources

# Download translations
crowdin download translations
```

### Translation coverage

Check how complete translations are across all platforms:

```bash
npm run check-coverage
```

Output:

```
Translation Coverage Report
===========================

React/RN (30 source keys)
  es       ████████████████████ 100.0% (30/30, 0 missing)

Android (26 source keys)
  es-rES   ████████████████████ 100.0% (26/26, 0 missing)

iOS (28 source keys)
  es       ████████████████████ 100.0% (28/28, 0 missing)
```

## GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **Validate** | Pull requests to `main` | Checks generated files are up to date and keys are consistent |
| **CrowdIn Upload Sources** | Push to `main` (when `sources/` changes) | Uploads source files to CrowdIn |
| **CrowdIn Download Translations** | Weekly cron + manual trigger | Downloads approved translations, opens PR |
| **Assemble Packages** | Push to `main` (when `sources/` or `translations/` change) + manual trigger | Rebuilds packages and commits to `main` |
| **Build and Publish** | Git tag `v*` | Builds and publishes to npm + Maven Central |

## Publishing a New Version

Versioning is unified across all packages:

| Change | Version Bump | Example |
|--------|-------------|---------|
| Translation updates only | PATCH | `1.0.0` -> `1.0.1` |
| New string keys added | MINOR | `1.0.0` -> `1.1.0` |
| String keys removed or renamed | MAJOR | `1.0.0` -> `2.0.0` |

To publish:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the **Build and Publish** workflow, which:

1. Runs the full `prebuild` pipeline
2. Publishes the React/RN package to npm as `@youversion/platform-i18n`
3. Publishes the Android AAR to Maven Central as `com.youversion.platform:i18n`
4. iOS consumers use this repo directly as a Swift Package via the git tag (no separate publish)

### Required GitHub Secrets for publishing

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | npm publish token |
| `MAVEN_CENTRAL_USERNAME` | Maven Central / Sonatype username |
| `MAVEN_CENTRAL_PASSWORD` | Maven Central / Sonatype password |
| `SIGNING_KEY_ID` | GPG signing key ID |
| `SIGNING_KEY` | GPG private key |
| `SIGNING_PASSWORD` | GPG key passphrase |

## Consuming the Packages

### Android

Add the dependency in your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.youversion.platform:i18n:1.0.0")
}
```

Strings are available via standard Android resource access. All keys are prefixed with `yv_i18n_` to avoid conflicts:

```kotlin
getString(R.string.yv_i18n_common_auth_signInButton)
```

### iOS (Swift Package)

Add this repository as a Swift Package dependency in Xcode, pointing to the version tag.

```swift
import YVPlatformI18n

let text = NSLocalizedString("common.auth.signInButton",
                              bundle: YVPlatformI18n.bundle,
                              comment: "")
```

**Important:** Your host app's `Info.plist` must list all supported languages in `CFBundleLocalizations`, otherwise iOS falls back to English even if translations exist in the package.

### React / React Native

```bash
npm install @youversion/platform-i18n
```

```javascript
import { getAllLocales } from '@youversion/platform-i18n';
import i18next from 'i18next';

i18next.init({
  resources: getAllLocales(),
  lng: 'en',
  fallbackLng: 'en',
});

// Use in components
i18next.t('common.auth.signInButton');
```

## Full Workflow: End to End

```
1. Developer creates a branch
2. Edit sources/common/en.json
3. Run: npm run generate
4. Run: npm run validate
5. Commit, push, and open a PR
6. [Auto] Validate workflow checks key consistency
7. Peer review and merge
        |
        v
8. [Auto] CrowdIn Upload — new string appears in CrowdIn
9. [Auto] Assemble Packages — packages/ updated on main
        |
        v
10. Translators translate and approve strings in CrowdIn
        |
        v
11. [Auto/Manual] CrowdIn Download — opens PR with translations
12. Review and merge translation PR
        |
        v
13. [Auto] Assemble Packages — packages/ updated with translations
        |
        v
14. Tag a release: git tag v1.2.3 && git push origin v1.2.3
15. [Auto] Build and Publish — npm + Maven Central
16. iOS consumers update their SPM dependency to the new tag
```
