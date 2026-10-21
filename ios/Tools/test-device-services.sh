#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p .build/device-checks
cp Sources/SpotterCore/Resources/catalog.json .build/device-checks/catalog.json
service_sdk="$(xcrun --sdk macosx --show-sdk-path)"
if [ -d /Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk ]; then
  service_sdk=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk
fi
swiftc -sdk "$service_sdk" -swift-version 5 -parse-as-library \
  Sources/SpotterCore/Place.swift Sources/SpotterCore/Journal.swift Sources/SpotterCore/CloudJournalStorage.swift \
  Sources/SpotterApp/DeviceServices.swift Tools/DeviceServiceChecks.swift \
  -o .build/device-checks/DeviceServiceChecks
.build/device-checks/DeviceServiceChecks
