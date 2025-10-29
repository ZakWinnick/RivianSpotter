#!/bin/bash
# RivianSpotter Troubleshooting Script
# Run this on your VPS to diagnose issues

echo "🔍 RivianSpotter Troubleshooting"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✓${NC} $1"
}

print_error() {
    echo -e "${RED}  ✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}  !${NC} $1"
}

print_info() {
    echo -e "  ℹ $1"
}

# 1. Environment Check
print_header "1. Environment Check"

# Check if .env exists
if [ -f .env ]; then
    print_success ".env file exists"

    # Check if it's readable
    if [ -r .env ]; then
        print_success ".env is readable"
    else
        print_error ".env is not readable"
        print_info "Run: sudo chmod 640 .env"
    fi

    # Check for placeholder values
    if grep -q "your_mapbox_token_here\|your_secure_admin_token_here" .env; then
        print_error ".env contains placeholder values"
        print_info "Edit .env and set actual values"
    else
        print_success ".env appears configured"
    fi
else
    print_error ".env file not found"
    print_info "Run: cp .env.example .env"
    print_info "Then edit .env with your values"
fi

echo ""

# 2. PHP Check
print_header "2. PHP Configuration"

if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -v | head -n 1)
    print_success "PHP installed: $PHP_VERSION"

    # Check PHP modules
    if php -m | grep -q "json"; then
        print_success "JSON module loaded"
    else
        print_warning "JSON module not loaded"
    fi
else
    print_error "PHP not found in PATH"
fi

echo ""

# 3. File Permissions
print_header "3. File Permissions"

# Check data directory
if [ -d data ]; then
    print_success "data/ directory exists"

    PERMS=$(stat -c "%a" data 2>/dev/null || stat -f "%Lp" data 2>/dev/null)
    print_info "data/ permissions: $PERMS"

    if [ -w data ]; then
        print_success "data/ is writable"
    else
        print_error "data/ is not writable"
        print_info "Run: sudo chmod 755 data/"
    fi
else
    print_error "data/ directory not found"
    print_info "Run: mkdir -p data && chmod 755 data"
fi

# Check locations.json
if [ -f data/locations.json ]; then
    print_success "data/locations.json exists"

    if [ -w data/locations.json ]; then
        print_success "locations.json is writable"
    else
        print_error "locations.json is not writable"
        print_info "Run: sudo chmod 644 data/locations.json"
    fi

    # Check JSON validity
    if command -v php >/dev/null 2>&1; then
        php -r "json_decode(file_get_contents('data/locations.json')); echo (json_last_error() === JSON_ERROR_NONE) ? 'valid' : 'invalid';" > /tmp/json_check.txt
        if grep -q "valid" /tmp/json_check.txt; then
            print_success "locations.json is valid JSON"
        else
            print_error "locations.json has invalid JSON"
        fi
        rm -f /tmp/json_check.txt
    fi
else
    print_warning "data/locations.json not found"
    print_info "Run: echo '[]' > data/locations.json && chmod 644 data/locations.json"
fi

echo ""

# 4. API Test
print_header "4. API Endpoint Test"

if command -v curl >/dev/null 2>&1; then
    # Try to access API
    RESPONSE=$(curl -s -o /tmp/api_response.txt -w "%{http_code}" http://localhost/api/locations.php 2>/dev/null)

    if [ "$RESPONSE" = "200" ]; then
        print_success "API returns 200 OK"

        # Check if response is JSON
        if grep -q '^\[' /tmp/api_response.txt || grep -q '^{' /tmp/api_response.txt; then
            print_success "API returns JSON"
            COUNT=$(grep -o '"id"' /tmp/api_response.txt | wc -l)
            print_info "Found $COUNT locations in response"
        else
            print_error "API doesn't return JSON"
            print_info "First 200 chars of response:"
            head -c 200 /tmp/api_response.txt
        fi
    else
        print_error "API returns HTTP $RESPONSE"
        print_info "Response saved to /tmp/api_response.txt"
    fi

    rm -f /tmp/api_response.txt
else
    print_warning "curl not found, skipping API test"
fi

echo ""

# 5. Apache Configuration
print_header "5. Apache Configuration"

# Find Apache command
if command -v apachectl >/dev/null 2>&1; then
    APACHE_CTL="apachectl"
elif command -v apache2ctl >/dev/null 2>&1; then
    APACHE_CTL="apache2ctl"
else
    print_warning "Apache control command not found"
    APACHE_CTL=""
fi

if [ -n "$APACHE_CTL" ]; then
    # Check if Apache is running
    if pgrep -x "httpd\|apache2" > /dev/null; then
        print_success "Apache is running"
    else
        print_error "Apache is not running"
        print_info "Start with: sudo systemctl start apache2"
    fi

    # Check modules
    if $APACHE_CTL -M 2>/dev/null | grep -q "rewrite"; then
        print_success "mod_rewrite is enabled"
    else
        print_warning "mod_rewrite is not enabled"
        print_info "Enable with: sudo a2enmod rewrite"
    fi

    if $APACHE_CTL -M 2>/dev/null | grep -q "php"; then
        print_success "PHP module is loaded"
    else
        print_warning "PHP module not loaded in Apache"
        print_info "Install: sudo apt install libapache2-mod-php"
    fi
fi

echo ""

# 6. Recent Apache Errors
print_header "6. Recent Apache Errors"

ERROR_LOG="/var/log/apache2/error.log"
if [ -f "$ERROR_LOG" ]; then
    print_info "Last 5 errors from Apache log:"
    sudo tail -5 "$ERROR_LOG" 2>/dev/null | sed 's/^/    /'
else
    print_warning "Apache error log not found at $ERROR_LOG"

    # Try alternative locations
    for LOG in /var/log/httpd/error_log /var/log/apache2/error_log; do
        if [ -f "$LOG" ]; then
            print_info "Found log at: $LOG"
            sudo tail -5 "$LOG" 2>/dev/null | sed 's/^/    /'
            break
        fi
    done
fi

echo ""

# 7. Test API directly with PHP
print_header "7. Direct PHP Test"

if command -v php >/dev/null 2>&1; then
    if [ -f api/locations.php ]; then
        print_info "Testing api/locations.php directly..."

        # Test PHP syntax
        php -l api/locations.php > /tmp/php_syntax.txt 2>&1
        if [ $? -eq 0 ]; then
            print_success "PHP syntax is valid"
        else
            print_error "PHP syntax error:"
            cat /tmp/php_syntax.txt | sed 's/^/    /'
        fi
        rm -f /tmp/php_syntax.txt

        # Try to execute it
        print_info "Attempting to execute API (GET request)..."
        REQUEST_METHOD=GET php api/locations.php 2>&1 | head -10 | sed 's/^/    /'
    else
        print_error "api/locations.php not found"
    fi
fi

echo ""

# 8. Network Test
print_header "8. Network Configuration"

if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q ":80\|:443"; then
        print_success "Apache is listening on port 80/443"
    else
        print_warning "No service listening on port 80/443"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tuln | grep -q ":80\|:443"; then
        print_success "Apache is listening on port 80/443"
    else
        print_warning "No service listening on port 80/443"
    fi
fi

echo ""

# Summary
echo "================================="
echo ""
echo "📋 Quick Fixes:"
echo ""
echo "If API shows File Mode:"
echo "  1. Ensure PHP module is loaded in Apache"
echo "  2. Check .env file exists and is readable"
echo "  3. Verify data/ directory permissions (755)"
echo "  4. Check Apache error logs for details"
echo ""
echo "Common commands:"
echo "  sudo systemctl restart apache2"
echo "  sudo chmod 755 data/"
echo "  sudo chmod 644 data/locations.json .env"
echo "  sudo tail -f /var/log/apache2/error.log"
echo ""
echo "For detailed help, see APACHE_SETUP.md"
