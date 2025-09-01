#!/bin/bash

# Setup script for Rivian Spotter Locations API
# Run this on your server to set up the API backend

echo "🚀 Setting up Rivian Spotter Locations API..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}Running as root${NC}"
else
   echo -e "${YELLOW}You may need to use sudo for some commands${NC}"
fi

# Base directory (adjust if needed)
BASE_DIR="/var/www/rivianspotter"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p "$BASE_DIR/api"
mkdir -p "$BASE_DIR/data"
mkdir -p "$BASE_DIR/backup"

# Set proper permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data "$BASE_DIR/data"
chmod 755 "$BASE_DIR/data"

# Create the API file
echo "📝 Creating API endpoint..."
cat > "$BASE_DIR/api/locations.php" << 'EOF'
<?php
// api/locations.php - Locations management API

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Configuration
define('DATA_FILE', __DIR__ . '/../data/locations.json');
define('JS_FILE', __DIR__ . '/../js/locations.js');
define('BACKUP_DIR', __DIR__ . '/../backup/');

// IMPORTANT: Change this token!
define('ADMIN_TOKEN', 'your-secret-admin-token-here');

// Auto-backup before write operations
function createBackup() {
    if (file_exists(DATA_FILE)) {
        $backupFile = BACKUP_DIR . 'locations_' . date('Y-m-d_H-i-s') . '.json';
        copy(DATA_FILE, $backupFile);
        
        // Keep only last 10 backups
        $backups = glob(BACKUP_DIR . 'locations_*.json');
        if (count($backups) > 10) {
            usort($backups, function($a, $b) {
                return filemtime($a) - filemtime($b);
            });
            $toDelete = array_slice($backups, 0, count($backups) - 10);
            foreach ($toDelete as $file) {
                unlink($file);
            }
        }
    }
}

// Rest of the API code from the previous artifact...
// [Include the full API code here]
EOF

# Create data migration script
echo "🔄 Creating migration script..."
cat > "$BASE_DIR/migrate-locations.php" << 'EOF'
<?php
// One-time migration script to import existing locations.js data

echo "Starting migration...\n";

// Read existing locations.js file
$jsFile = __DIR__ . '/js/locations.js';
if (!file_exists($jsFile)) {
    die("Error: locations.js not found!\n");
}

$jsContent = file_get_contents($jsFile);

// Extract JSON from JavaScript
preg_match('/const rivianLocations = (\[.*?\]);/s', $jsContent, $matches);
if (!isset($matches[1])) {
    die("Error: Could not parse locations.js\n");
}

$locations = json_decode($matches[1], true);
if (!$locations) {
    die("Error: Invalid JSON in locations.js\n");
}

// Add timestamps to existing data
foreach ($locations as &$location) {
    if (!isset($location['created_at'])) {
        $location['created_at'] = date('Y-m-d H:i:s');
    }
    if (!isset($location['updated_at'])) {
        $location['updated_at'] = date('Y-m-d H:i:s');
    }
}

// Save to JSON file
$dataFile = __DIR__ . '/data/locations.json';
file_put_contents($dataFile, json_encode($locations, JSON_PRETTY_PRINT));

echo "✅ Successfully migrated " . count($locations) . " locations!\n";
echo "Data saved to: $dataFile\n";
EOF

# Create .htaccess for API directory
echo "🔐 Securing API directory..."
cat > "$BASE_DIR/api/.htaccess" << 'EOF'
# Enable PHP for API
<FilesMatch "\.php$">
    SetHandler application/x-httpd-php
</FilesMatch>

# Deny access to other files
<FilesMatch "\.(?!php).*$">
    Order deny,allow
    Deny from all
</FilesMatch>
EOF

# Create .htaccess for data directory
cat > "$BASE_DIR/data/.htaccess" << 'EOF'
# Deny all access to data files
Order deny,allow
Deny from all
EOF

# Generate a random admin token
RANDOM_TOKEN=$(openssl rand -hex 32)
echo ""
echo "🔑 Generated Admin Token: ${GREEN}$RANDOM_TOKEN${NC}"
echo ""
echo "IMPORTANT: Save this token! You'll need it for the admin panel."
echo ""

# Update the API file with the generated token
sed -i "s/your-secret-admin-token-here/$RANDOM_TOKEN/g" "$BASE_DIR/api/locations.php"

# Create a config file for the admin panel
cat > "$BASE_DIR/admin/config.js" << EOF
// Admin panel configuration
const API_CONFIG = {
    API_URL: '/api/locations.php',
    ADMIN_TOKEN: '$RANDOM_TOKEN'
};
EOF

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run the migration to import existing data:"
echo "   ${YELLOW}php $BASE_DIR/migrate-locations.php${NC}"
echo ""
echo "2. Test the API:"
echo "   ${YELLOW}curl https://rivianspotter.com/api/locations.php${NC}"
echo ""
echo "3. Update your admin.html to include the new admin.js"
echo ""
echo "4. Your admin token is: ${GREEN}$RANDOM_TOKEN${NC}"
echo "   Keep this safe - you'll need it to log into the admin panel!"
echo ""
echo "5. Optional: Set up a cron job for automatic backups:"
echo "   ${YELLOW}0 2 * * * cp $BASE_DIR/data/locations.json $BASE_DIR/backup/locations_\$(date +\%Y\%m\%d).json${NC}"