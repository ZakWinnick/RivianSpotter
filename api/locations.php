<?php
// api/locations.php - Locations management API

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// CORS headers (restrict in production)
$allowed_origins = ['http://localhost', 'https://rivianspotter.com', 'https://www.rivianspotter.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: null');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 3600');

// Configuration
define('DATA_FILE', __DIR__ . '/../data/locations.json');
define('JS_FILE', __DIR__ . '/../js/locations.js');
define('ADMIN_TOKEN', 'aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c'); // Change this!

// Ensure data directory exists
$dataDir = dirname(DATA_FILE);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Initialize data file if it doesn't exist
if (!file_exists(DATA_FILE)) {
    // Default locations (you can import your existing data here)
    $defaultLocations = [];
    file_put_contents(DATA_FILE, json_encode($defaultLocations, JSON_PRETTY_PRINT));
}

// Input validation and sanitization
function validateAndSanitizeInput($data) {
    if (!is_array($data)) {
        return false;
    }

    // Required fields validation
    $required_fields = ['name', 'lat', 'lng', 'type'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            return false;
        }
    }

    // Sanitize string fields
    $string_fields = ['name', 'address', 'city', 'state', 'type', 'phone', 'hours', 'rivianUrl'];
    foreach ($string_fields as $field) {
        if (isset($data[$field])) {
            $data[$field] = htmlspecialchars(trim($data[$field]), ENT_QUOTES, 'UTF-8');
        }
    }

    // Validate opening date if provided
    if (isset($data['openingDate']) && !empty($data['openingDate'])) {
        $date = DateTime::createFromFormat('Y-m-d', $data['openingDate']);
        if (!$date || $date->format('Y-m-d') !== $data['openingDate']) {
            return false;
        }
    }

    // Validate Rivian URL if provided
    if (isset($data['rivianUrl']) && !empty($data['rivianUrl'])) {
        if (!filter_var($data['rivianUrl'], FILTER_VALIDATE_URL)) {
            return false;
        }
        // Allow any valid URL (not just rivian.com) for flexibility
    }

    // Validate coordinates
    $lat = floatval($data['lat']);
    $lng = floatval($data['lng']);
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        return false;
    }
    $data['lat'] = $lat;
    $data['lng'] = $lng;

    // Validate and sanitize services array
    if (isset($data['services']) && is_array($data['services'])) {
        $data['services'] = array_map(function($service) {
            return htmlspecialchars(trim($service), ENT_QUOTES, 'UTF-8');
        }, $data['services']);
    }

    return $data;
}

// Simple rate limiting
function checkRateLimit() {
    session_start();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $current_time = time();
    $limit_window = 300; // 5 minutes
    $max_requests = 100; // Max requests per window

    if (!isset($_SESSION['rate_limit'])) {
        $_SESSION['rate_limit'] = [];
    }

    // Clean old entries
    $_SESSION['rate_limit'] = array_filter($_SESSION['rate_limit'], function($timestamp) use ($current_time, $limit_window) {
        return ($current_time - $timestamp) < $limit_window;
    });

    // Check if rate limit exceeded
    if (count($_SESSION['rate_limit']) >= $max_requests) {
        http_response_code(429);
        die(json_encode(['error' => 'Rate limit exceeded. Please try again later.']));
    }

    // Add current request
    $_SESSION['rate_limit'][] = $current_time;
}

// Check authentication for write operations
function checkAuth() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_GET['token'] ?? '';

    if ($token !== 'Bearer ' . ADMIN_TOKEN && $token !== ADMIN_TOKEN) {
        http_response_code(401);
        die(json_encode(['error' => 'Unauthorized']));
    }
}

// Apply rate limiting for all requests
checkRateLimit();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Handle preflight requests
if ($method === 'OPTIONS') {
    exit(0);
}

// Read locations from JSON file
function getLocations() {
    $json = file_get_contents(DATA_FILE);
    return json_decode($json, true) ?: [];
}

// Save locations to JSON file
function saveLocations($locations) {
    // Save to JSON file
    $result = file_put_contents(DATA_FILE, json_encode($locations, JSON_PRETTY_PRINT));
    
    // Also generate JS file for the public site
    generateJSFile($locations);
    
    return $result !== false;
}

// Generate locations.js file for the public site
function generateJSFile($locations) {
    $jsContent = "// Auto-generated from admin panel - Do not edit directly\n";
    $jsContent .= "// Last updated: " . date('Y-m-d H:i:s') . "\n\n";
    $jsContent .= "const rivianLocations = " . json_encode($locations, JSON_PRETTY_PRINT) . ";\n\n";
    $jsContent .= "// Export for Node.js environments\n";
    $jsContent .= "if (typeof module !== 'undefined' && module.exports) {\n";
    $jsContent .= "    module.exports = rivianLocations;\n";
    $jsContent .= "}\n";
    
    file_put_contents(JS_FILE, $jsContent);
}

// Handle API requests
switch ($method) {
    case 'GET':
        // Get all locations (public)
        if ($action === 'export') {
            // Export as downloadable JSON
            header('Content-Disposition: attachment; filename="locations-' . date('Y-m-d') . '.json"');
        }
        echo json_encode(getLocations());
        break;
        
    case 'POST':
        // Add new location (requires auth)
        checkAuth();

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }

        $validatedInput = validateAndSanitizeInput($input);
        if (!$validatedInput) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid location data. Please check required fields and coordinate values.']);
            exit;
        }
        
        $locations = getLocations();
        
        // Generate ID if not provided
        if (!isset($validatedInput['id'])) {
            $validatedInput['id'] = time() . rand(1000, 9999);
        }

        // Add timestamps
        $validatedInput['created_at'] = date('Y-m-d H:i:s');
        $validatedInput['updated_at'] = date('Y-m-d H:i:s');

        $locations[] = $validatedInput;
        
        if (saveLocations($locations)) {
            echo json_encode(['success' => true, 'location' => $validatedInput]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save location']);
        }
        break;
        
    case 'PUT':
        // Update existing location or bulk update (requires auth)
        checkAuth();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'bulk') {
            // Bulk update - replace all locations
            if (!is_array($input)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid data']);
                exit;
            }
            
            // Add timestamps to any new locations
            foreach ($input as &$location) {
                if (!isset($location['created_at'])) {
                    $location['created_at'] = date('Y-m-d H:i:s');
                }
                $location['updated_at'] = date('Y-m-d H:i:s');
            }
            
            if (saveLocations($input)) {
                echo json_encode(['success' => true, 'count' => count($input)]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save locations']);
            }
        } else {
            // Update single location
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid location data']);
                exit;
            }

            // Validate and sanitize the input data
            $validatedInput = validateAndSanitizeInput($input);
            if (!$validatedInput) {
                error_log('Validation failed for input: ' . json_encode($input));
                http_response_code(400);
                echo json_encode(['error' => 'Invalid location data. Please check required fields and coordinate values.']);
                exit;
            }

            $locations = getLocations();
            $found = false;

            foreach ($locations as &$location) {
                if ($location['id'] == $validatedInput['id']) {
                    // Preserve created_at, update everything else
                    $validatedInput['created_at'] = $location['created_at'] ?? date('Y-m-d H:i:s');
                    $validatedInput['updated_at'] = date('Y-m-d H:i:s');
                    $location = $validatedInput;
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                http_response_code(404);
                echo json_encode(['error' => 'Location not found']);
                exit;
            }
            
            if (saveLocations($locations)) {
                echo json_encode(['success' => true, 'location' => $validatedInput]);
            } else {
                error_log('Failed to save locations to file');
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update location - file write error']);
            }
        }
        break;
        
    case 'DELETE':
        // Delete location (requires auth)
        checkAuth();
        
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Location ID required']);
            exit;
        }
        
        $locations = getLocations();
        $filtered = array_filter($locations, function($loc) use ($id) {
            return $loc['id'] != $id;
        });
        
        if (count($filtered) === count($locations)) {
            http_response_code(404);
            echo json_encode(['error' => 'Location not found']);
            exit;
        }
        
        // Re-index array
        $filtered = array_values($filtered);
        
        if (saveLocations($filtered)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete location']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>