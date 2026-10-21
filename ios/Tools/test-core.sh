#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p .build/core-checks
cp Sources/SpotterCore/Resources/catalog.json .build/core-checks/catalog.json
swiftc -D STANDALONE_CORE_TESTS -swift-version 5 \
  Sources/SpotterCore/Place.swift Sources/SpotterCore/Journal.swift Sources/SpotterCore/CloudJournalStorage.swift \
  Tests/SpotterCoreTests/JournalTests.swift Tools/StandaloneTests.swift \
  -o .build/core-checks/SpotterCoreChecks
.build/core-checks/SpotterCoreChecks
