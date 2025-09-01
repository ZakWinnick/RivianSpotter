<?php
// Read existing locations.js
$jsContent = file_get_contents(__DIR__ . '/js/locations.js');
preg_match('/const rivianLocations = (\[.*?\]);/s', $jsContent, $matches);
$locations = json_decode($matches[1], true);

// Add timestamps
foreach ($locations as &$location) {
    $location['created_at'] = date('Y-m-d H:i:s');
    $location['updated_at'] = date('Y-m-d H:i:s');
}

// Save to JSON
file_put_contents(__DIR__ . '/data/locations.json', json_encode($locations, JSON_PRETTY_PRINT));
echo "Migrated " . count($locations) . " locations!\n";