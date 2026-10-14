<?php
// Retired in release 2026.42. The supported deployment is static GitHub Pages.
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo json_encode(['error' => 'Endpoint retired. Use /data/locations.json for the public inventory or /contact.html to prepare a correction email.']);
exit;
