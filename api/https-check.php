<?php
/**
 * HTTPS Enforcement Check
 * Ensures all requests use HTTPS in production
 */

// Load environment variables
require_once __DIR__ . '/env-loader.php';
try {
    loadEnv();
} catch (Exception $e) {
    // Continue without strict enforcement if .env is missing
}

/**
 * Check if the connection is HTTPS
 */
function isHttps() {
    // Check if HTTPS is set
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    // Check if forwarded from HTTPS (for proxies/load balancers)
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        return true;
    }

    // Check if forwarded SSL is on
    if (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') {
        return true;
    }

    // Check standard port
    if (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) {
        return true;
    }

    return false;
}

/**
 * Enforce HTTPS in production
 */
function enforceHttps() {
    // Skip enforcement in development
    if (env('DEBUG_MODE', false) ||
        strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false ||
        strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false) {
        return;
    }

    // Check if already HTTPS
    if (isHttps()) {
        return;
    }

    // Redirect to HTTPS
    $redirect_url = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    header('HTTP/1.1 301 Moved Permanently');
    header('Location: ' . $redirect_url);
    exit();
}

/**
 * Add security headers for HTTPS
 */
function addSecurityHeaders() {
    // Only add HSTS in production with HTTPS
    if (isHttps() && !env('DEBUG_MODE', false)) {
        // HTTP Strict Transport Security (1 year)
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }

    // Upgrade insecure requests (tells browser to upgrade HTTP to HTTPS)
    if (!env('DEBUG_MODE', false)) {
        header('Content-Security-Policy: upgrade-insecure-requests');
    }
}
