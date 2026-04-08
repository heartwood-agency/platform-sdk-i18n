// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "YVPlatformI18n",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .watchOS(.v8),
        .tvOS(.v15),
    ],
    products: [
        .library(
            name: "YVPlatformI18n",
            targets: ["YVPlatformI18n"]
        ),
    ],
    targets: [
        .target(
            name: "YVPlatformI18n",
            path: "Sources/YVPlatformI18n",
            resources: [
                .process("Resources"),
            ]
        ),
    ]
)
