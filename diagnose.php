<?php
// diagnose.php - Complete API diagnostic tool
header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html>
<head>
    <title>API Diagnostic</title>
    <style>
        body { font-family: system-ui; max-width: 1000px; margin: 20px auto; padding: 20px; }
        .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        pre { background: #333; color: #0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #45a049; }
        .test-result { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .test-success { background: #d4edda; border: 1px solid #c3e6cb; }
        .test-error { background: #f8d7da; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
<h1>🔍 Rivian Spotter API Diagnostic</h1>";

// Configuration
$apiUrl = '/api/locations.php';
$apiFile = $_SERVER['DOCUMENT_ROOT'] . '/api/locations.php';
$dataDir = $_SERVER['DOCUMENT_ROOT'] . '/data';
$jsDir = $_SERVER['DOCUMENT_ROOT'] . '/js';
$dataFile = $dataDir . '/locations.json';
$jsFile = $jsDir . '/locations.js';

echo "<div class='section'>";
echo "<h2>1. File System Check</h2>";

// Check API file
if (file_exists($apiFile)) {
    echo "<span class='success'>✅ API file exists</span><br>";
    echo "Path: $apiFile<br>";
    echo "Size: " . filesize($apiFile) . " bytes<br>";
    echo "Writable: " . (is_writable($apiFile) ? "Yes" : "No") . "<br>";
} else {
    echo "<span class='error'>❌ API file not found at: $apiFile</span><br>";
    echo "<p>This is your main problem! The API file doesn't exist.</p>";
}

// Check directories
echo "<br><strong>Directories:</strong><br>";
echo "Data dir exists: " . (is_dir($dataDir) ? "<span class='success'>✅</span>" : "<span class='error'>❌</span>") . " ($dataDir)<br>";
echo "Data dir writable: " . (is_writable($dataDir) ? "<span class='success'>✅</span>" : "<span class='error'>❌</span>") . "<br>";
echo "JS dir exists: " . (is_dir($jsDir) ? "<span class='success'>✅</span>" : "<span class='error'>❌</span>") . " ($jsDir)<br>";
echo "JS dir writable: " . (is_writable($jsDir) ? "<span class='success'>✅</span>" : "<span class='error'>❌</span>") . "<br>";

// Check data files
echo "<br><strong>Data Files:</strong><br>";
if (file_exists($dataFile)) {
    echo "locations.json: <span class='success'>✅ Exists</span><br>";
    $data = json_decode(file_get_contents($dataFile), true);
    echo "Location count: " . count($data) . "<br>";
} else {
    echo "locations.json: <span class='warning'>⚠️ Not found (will be created)</span><br>";
}

if (file_exists($jsFile)) {
    echo "locations.js: <span class='success'>✅ Exists</span><br>";
} else {
    echo "locations.js: <span class='warning'>⚠️ Not found</span><br>";
}
echo "</div>";

// Check API token
echo "<div class='section'>";
echo "<h2>2. API Token Check</h2>";
if (file_exists($apiFile)) {
    $apiContent = file_get_contents($apiFile);
    preg_match("/define\('ADMIN_TOKEN',\s*'([^']+)'\)/", $apiContent, $matches);
    if (isset($matches[1])) {
        $apiToken = $matches[1];
        echo "Token found in API: <code>" . substr($apiToken, 0, 20) . "...</code><br>";
        
        // Check admin.html token
        $adminFile = $_SERVER['DOCUMENT_ROOT'] . '/admin.html';
        if (file_exists($adminFile)) {
            $adminContent = file_get_contents($adminFile);
            preg_match("/let ADMIN_TOKEN = '([^']+)'/", $adminContent, $adminMatches);
            if (isset($adminMatches[1])) {
                $adminToken = $adminMatches[1];
                if ($apiToken === $adminToken) {
                    echo "<span class='success'>✅ Tokens match!</span><br>";
                } else {
                    echo "<span class='error'>❌ Token mismatch!</span><br>";
                    echo "Admin token: <code>" . substr($adminToken, 0, 20) . "...</code><br>";
                    echo "<button onclick='fixTokens()'>Fix Token Mismatch</button>";
                }
            }
        }
    } else {
        echo "<span class='error'>❌ No token found in API file</span><br>";
    }
} else {
    echo "<span class='error'>❌ Can't check token - API file missing</span><br>";
}
echo "</div>";

// Test API endpoint
echo "<div class='section'>";
echo "<h2>3. API Endpoint Test</h2>";

// Test GET request
echo "<h3>Testing GET (should work without auth):</h3>";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://" . $_SERVER['HTTP_HOST'] . $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

if ($httpCode == 200) {
    echo "<div class='test-result test-success'>";
    echo "<span class='success'>✅ GET request successful (HTTP $httpCode)</span><br>";
    $data = json_decode($body, true);
    if ($data !== null) {
        echo "Response: Valid JSON with " . count($data) . " locations<br>";
    } else {
        echo "Response body: " . htmlspecialchars(substr($body, 0, 200)) . "...<br>";
    }
    echo "</div>";
} else {
    echo "<div class='test-result test-error'>";
    echo "<span class='error'>❌ GET request failed (HTTP $httpCode)</span><br>";
    echo "Response: " . htmlspecialchars($body) . "<br>";
    echo "</div>";
}

// Test POST request with token
if (file_exists($apiFile)) {
    $apiContent = file_get_contents($apiFile);
    preg_match("/define\('ADMIN_TOKEN',\s*'([^']+)'\)/", $apiContent, $matches);
    if (isset($matches[1])) {
        $token = $matches[1];
        
        echo "<h3>Testing POST with auth token:</h3>";
        $testData = [
            'name' => 'Test Location ' . time(),
            'type' => 'Space',
            'lat' => 37.7749,
            'lng' => -122.4194,
            'address' => '123 Test St',
            'city' => 'San Francisco',
            'state' => 'CA',
            'isOpen' => true
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "http://" . $_SERVER['HTTP_HOST'] . $apiUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode == 200) {
            echo "<div class='test-result test-success'>";
            echo "<span class='success'>✅ POST request successful</span><br>";
            echo "Test location can be saved!<br>";
            echo "</div>";
        } else {
            echo "<div class='test-result test-error'>";
            echo "<span class='error'>❌ POST request failed (HTTP $httpCode)</span><br>";
            echo "Response: " . htmlspecialchars($response) . "<br>";
            echo "</div>";
        }
    }
}
echo "</div>";

// Quick fixes
echo "<div class='section'>";
echo "<h2>4. Quick Fixes</h2>";

if (!file_exists($apiFile)) {
    echo "<h3>❌ API File Missing - This is your problem!</h3>";
    echo "<p>The API file doesn't exist. You need to create it.</p>";
    echo "<form method='post'>";
    echo "<button type='submit' name='action' value='create_api'>Create API File Now</button>";
    echo "</form>";
}

if (!is_dir($dataDir)) {
    echo "<form method='post'>";
    echo "<button type='submit' name='action' value='create_dirs'>Create Missing Directories</button>";
    echo "</form>";
}

echo "<form method='post'>";
echo "<button type='submit' name='action' value='fix_permissions'>Fix All Permissions</button>";
echo "</form>";

echo "<form method='post'>";
echo "<button type='submit' name='action' value='simple_token'>Set Simple Token (rivianspotter2024)</button>";
echo "</form>";
echo "</div>";

// Handle actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    echo "<div class='section' style='background: #d4edda;'>";
    
    switch($action) {
        case 'create_api':
            // Create the API file with a simple implementation
            $apiContent = '<?php
// api/locations.php - Locations management API

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Configuration
define("DATA_FILE", __DIR__ . "/../data/locations.json");
define("JS_FILE", __DIR__ . "/../js/locations.js");
define("ADMIN_TOKEN", "rivianspotter2024");

// Ensure data directory exists
$dataDir = dirname(DATA_FILE);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Initialize data file if it doesn\'t exist
if (!file_exists(DATA_FILE)) {
    file_put_contents(DATA_FILE, "[]");
}

// Handle preflight
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

// Check auth for write operations
function checkAuth() {
    $headers = getallheaders();
    $token = $headers["Authorization"] ?? $_GET["token"] ?? "";
    
    if ($token !== "Bearer " . ADMIN_TOKEN && $token !== ADMIN_TOKEN) {
        http_response_code(401);
        die(json_encode(["error" => "Unauthorized"]));
    }
}

// Get locations
function getLocations() {
    $json = file_get_contents(DATA_FILE);
    return json_decode($json, true) ?: [];
}

// Save locations
function saveLocations($locations) {
    file_put_contents(DATA_FILE, json_encode($locations, JSON_PRETTY_PRINT));
    
    // Generate JS file
    $jsContent = "const rivianLocations = " . json_encode($locations, JSON_PRETTY_PRINT) . ";
if (typeof module !== \"undefined\" && module.exports) {
    module.exports = rivianLocations;
}";
    file_put_contents(JS_FILE, $jsContent);
    
    return true;
}

// Handle requests
$method = $_SERVER["REQUEST_METHOD"];

switch ($method) {
    case "GET":
        echo json_encode(getLocations());
        break;
        
    case "POST":
        checkAuth();
        $input = json_decode(file_get_contents("php://input"), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid data"]);
            exit;
        }
        
        $locations = getLocations();
        $input["id"] = $input["id"] ?? time();
        $locations[] = $input;
        
        if (saveLocations($locations)) {
            echo json_encode(["success" => true, "location" => $input]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save"]);
        }
        break;
        
    case "PUT":
        checkAuth();
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($_GET["action"] ?? "" === "bulk") {
            // Bulk update
            if (saveLocations($input)) {
                echo json_encode(["success" => true, "count" => count($input)]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to save"]);
            }
        } else {
            // Update single
            $locations = getLocations();
            $found = false;
            
            foreach ($locations as &$location) {
                if ($location["id"] == $input["id"]) {
                    $location = $input;
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                http_response_code(404);
                echo json_encode(["error" => "Not found"]);
                exit;
            }
            
            if (saveLocations($locations)) {
                echo json_encode(["success" => true, "location" => $input]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to save"]);
            }
        }
        break;
        
    case "DELETE":
        checkAuth();
        $id = $_GET["id"] ?? null;
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "ID required"]);
            exit;
        }
        
        $locations = getLocations();
        $filtered = array_filter($locations, function($loc) use ($id) {
            return $loc["id"] != $id;
        });
        
        $filtered = array_values($filtered);
        
        if (saveLocations($filtered)) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete"]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
?>';
            
            // Create API directory if needed
            $apiDir = dirname($apiFile);
            if (!is_dir($apiDir)) {
                mkdir($apiDir, 0755, true);
            }
            
            if (file_put_contents($apiFile, $apiContent)) {
                echo "<span class='success'>✅ API file created successfully!</span><br>";
                
                // Also update admin.html to use the simple token
                $adminFile = $_SERVER['DOCUMENT_ROOT'] . '/admin.html';
                if (file_exists($adminFile)) {
                    $content = file_get_contents($adminFile);
                    $content = preg_replace("/let ADMIN_TOKEN = '[^']*'/", "let ADMIN_TOKEN = 'rivianspotter2024'", $content);
                    file_put_contents($adminFile, $content);
                    echo "<span class='success'>✅ Admin panel updated with matching token!</span><br>";
                }
            } else {
                echo "<span class='error'>❌ Failed to create API file</span><br>";
            }
            break;
            
        case 'create_dirs':
            if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
            if (!is_dir($jsDir)) mkdir($jsDir, 0755, true);
            echo "<span class='success'>✅ Directories created</span><br>";
            break;
            
        case 'fix_permissions':
            exec("chown -R www-data:www-data " . escapeshellarg($dataDir) . " 2>&1");
            exec("chown -R www-data:www-data " . escapeshellarg($jsDir) . " 2>&1");
            exec("chmod 755 " . escapeshellarg($dataDir) . " 2>&1");
            exec("chmod 755 " . escapeshellarg($jsDir) . " 2>&1");
            echo "<span class='success'>✅ Permissions fixed</span><br>";
            break;
            
        case 'simple_token':
            // Update both files to use simple token
            if (file_exists($apiFile)) {
                $content = file_get_contents($apiFile);
                $content = preg_replace("/define\('ADMIN_TOKEN',\s*'[^']*'\)/", "define('ADMIN_TOKEN', 'rivianspotter2024')", $content);
                file_put_contents($apiFile, $content);
            }
            
            $adminFile = $_SERVER['DOCUMENT_ROOT'] . '/admin.html';
            if (file_exists($adminFile)) {
                $content = file_get_contents($adminFile);
                $content = preg_replace("/let ADMIN_TOKEN = '[^']*'/", "let ADMIN_TOKEN = 'rivianspotter2024'", $content);
                file_put_contents($adminFile, $content);
            }
            echo "<span class='success'>✅ Both files updated to use token: rivianspotter2024</span><br>";
            break;
    }
    
    echo "</div>";
    echo "<script>setTimeout(() => location.reload(), 2000);</script>";
}

echo "</body></html>";
?>