<?php
// api/locations.php - Locations management API

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

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

// Check authentication for write operations
function checkAuth() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_GET['token'] ?? '';
    
    if ($token !== 'Bearer ' . ADMIN_TOKEN && $token !== ADMIN_TOKEN) {
        http_response_code(401);
        die(json_encode(['error' => 'Unauthorized']));
    }
}

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
        
        if (!$input || !isset($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid location data']);
            exit;
        }
        
        $locations = getLocations();
        
        // Generate ID if not provided
        if (!isset($input['id'])) {
            $input['id'] = time() . rand(1000, 9999);
        }
        
        // Add timestamps
        $input['created_at'] = date('Y-m-d H:i:s');
        $input['updated_at'] = date('Y-m-d H:i:s');
        
        $locations[] = $input;
        
        if (saveLocations($locations)) {
            echo json_encode(['success' => true, 'location' => $input]);
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
            
            $locations = getLocations();
            $found = false;
            
            foreach ($locations as &$location) {
                if ($location['id'] == $input['id']) {
                    // Preserve created_at, update everything else
                    $input['created_at'] = $location['created_at'] ?? date('Y-m-d H:i:s');
                    $input['updated_at'] = date('Y-m-d H:i:s');
                    $location = $input;
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
                echo json_encode(['success' => true, 'location' => $input]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update location']);
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