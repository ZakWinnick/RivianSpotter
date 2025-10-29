<?php
/**
 * Public configuration endpoint
 * Returns safe configuration values to the frontend
 */

// Load environment variables
require_once __DIR__ . '/env-loader.php';
try {
    loadEnv();
} catch (Exception $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Configuration error']));
}

// Enforce HTTPS in production
require_once __DIR__ . '/https-check.php';
enforceHttps();
addSecurityHeaders();

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// CORS headers
$allowed_origins = explode(',', env('ALLOWED_ORIGINS', 'http://localhost'));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

// Return only safe, public configuration values
$config = [
    'mapboxToken' => env('MAPBOX_ACCESS_TOKEN'),
    'cacheEnabled' => env('ENABLE_CACHING', true),
    'cacheExpiration' => (int)env('CACHE_EXPIRATION_MINUTES', 30),
];

echo json_encode($config);
