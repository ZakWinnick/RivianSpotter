#!/bin/sh
# Builds the widget harness for macOS from the widget's own sources (minus the @main bundle and the
# family switch, which are iOS-only), runs its check-in checks, and renders each state to PNGs.
# Usage: sh Tools/widget-harness.sh [output folder]   (default: .build/widget-states)
set -eu
cd "$(dirname "$0")/.."
out="${1:-.build/widget-states}"
mkdir -p .build/widget-harness "$out"
swiftc -parse-as-library -D WIDGET_HARNESS -swift-version 5 -target "$(uname -m)-apple-macos14.0" \
  Sources/SpotterCore/Place.swift Sources/SpotterCore/CatalogUpdates.swift Sources/SpotterCore/Journal.swift \
  Sources/SpotterCore/CloudJournalStorage.swift Sources/SpotterCore/CheckInSuggestion.swift \
  Sources/SpotterCore/SharedStore.swift Sources/SpotterCore/PlacesSnapshot.swift \
  Sources/SpotterWidget/WidgetStore.swift Sources/SpotterWidget/CheckInProvider.swift Sources/SpotterWidget/WidgetLocation.swift \
  Sources/SpotterWidget/MapSnapshot.swift Sources/SpotterWidget/CheckInIntents.swift Sources/SpotterWidget/CheckInViews.swift \
  Tools/WidgetHarness.swift -o .build/widget-harness/WidgetHarness
.build/widget-harness/WidgetHarness Sources/SpotterCore/Resources/catalog.json Assets.xcassets/BrandMark.imageset/BrandMark.png "$out"
