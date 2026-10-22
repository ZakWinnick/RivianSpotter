#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
preview_app="$PWD/.build/RivianSpotter Preview.app"
preview_sdk="$(xcrun --sdk macosx --show-sdk-path)"
# The installed macOS 27 Command Line Tools omit the new SwiftUI macro plugin.
# Use the installed macOS 26 SDK for the desktop development preview when present.
if [ -d /Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk ]; then
  preview_sdk=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk
fi
mkdir -p "$preview_app/Contents/MacOS" "$preview_app/Contents/Resources"
swiftc -sdk "$preview_sdk" -target "$(uname -m)-apple-macos14.0" \
  -swift-version 5 -parse-as-library \
  Sources/SpotterCore/Place.swift Sources/SpotterCore/CatalogUpdates.swift Sources/SpotterCore/Journal.swift Sources/SpotterCore/CloudJournalStorage.swift \
  Sources/SpotterApp/DeviceServices.swift Sources/SpotterApp/PlacePresentation.swift Sources/SpotterApp/PlaceGallery.swift Sources/SpotterApp/PlaceDetailView.swift \
  Sources/SpotterApp/Directory.swift Sources/SpotterApp/Collections.swift Sources/SpotterApp/SpotterApp.swift -o "$preview_app/Contents/MacOS/SpotterPreview"
cp Sources/SpotterCore/Resources/catalog.json "$preview_app/Contents/Resources/catalog.json"
cat > "$preview_app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>SpotterPreview</string>
<key>CFBundleIdentifier</key><string>com.rivianspotter.preview</string>
<key>CFBundleName</key><string>RivianSpotter Preview</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>15</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSLocationUsageDescription</key><string>Find Rivian places near you. Your location is used only when you tap Near me and is not saved in your journal.</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$preview_app"
printf 'Desktop preview: %s\n' "$preview_app"
