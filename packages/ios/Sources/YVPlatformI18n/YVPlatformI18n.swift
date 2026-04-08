import Foundation

/// Provides access to the localization bundle for YouVersion Platform i18n strings.
///
/// Usage:
/// ```swift
/// let text = NSLocalizedString("common.auth.signInButton",
///                               bundle: YVPlatformI18n.bundle,
///                               comment: "")
/// ```
///
/// **Important**: Your host app's Info.plist must include all supported languages
/// in `CFBundleLocalizations`, otherwise iOS will fall back to English.
public enum YVPlatformI18n {
    /// The resource bundle containing localized strings.
    public static let bundle: Bundle = .module
}
