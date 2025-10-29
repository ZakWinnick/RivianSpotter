<?php
/**
 * Simple .env file loader
 * Loads environment variables from .env file
 */

function loadEnv($path = __DIR__ . '/../.env') {
    if (!file_exists($path)) {
        throw new Exception('.env file not found. Copy .env.example to .env and configure.');
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Remove quotes if present
            if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                $value = $matches[2];
            }

            // Set environment variable and make it available via getenv()
            putenv("$key=$value");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

/**
 * Get environment variable with optional default
 */
function env($key, $default = null) {
    $value = getenv($key);

    if ($value === false) {
        return $default;
    }

    // Convert string booleans to actual booleans
    if (strtolower($value) === 'true') {
        return true;
    }
    if (strtolower($value) === 'false') {
        return false;
    }

    return $value;
}
