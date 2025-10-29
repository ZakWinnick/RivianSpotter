#!/bin/bash
# RivianSpotter Deployment Script for Apache VPS

echo "🚀 RivianSpotter Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${NC}ℹ${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. This is okay for deployment."
fi

# 1. Check Prerequisites
echo "1️⃣  Checking prerequisites..."

# Check Apache
if command -v apache2 >/dev/null 2>&1 || command -v httpd >/dev/null 2>&1; then
    print_success "Apache web server found"
else
    print_error "Apache web server not found. Please install Apache first."
    exit 1
fi

# Check PHP
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
    print_success "PHP $PHP_VERSION found"

    if [[ $(echo "$PHP_VERSION < 7.4" | bc -l) -eq 1 ]]; then
        print_warning "PHP version is below 7.4. Consider upgrading for better performance."
    fi
else
    print_error "PHP not found. Please install PHP 7.4 or higher."
    exit 1
fi

# 2. Check .env file
echo ""
echo "2️⃣  Checking configuration..."

if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_info "Please edit .env file with your configuration:"
    print_info "  - Set MAPBOX_ACCESS_TOKEN"
    print_info "  - Set ADMIN_TOKEN (generate with: openssl rand -hex 32)"
    print_info "  - Set ADMIN_PASSWORD"
    print_info "  - Set ALLOWED_ORIGINS to your domain"
    echo ""
    read -p "Press enter after you've configured .env..."
else
    print_success ".env file exists"
fi

# Check if .env has been configured
if grep -q "your_mapbox_token_here" .env; then
    print_error ".env still contains default values. Please configure it first."
    exit 1
fi

# 3. Set up directory permissions
echo ""
echo "3️⃣  Setting up permissions..."

# Find Apache user
if id "www-data" >/dev/null 2>&1; then
    APACHE_USER="www-data"
elif id "apache" >/dev/null 2>&1; then
    APACHE_USER="apache"
elif id "_www" >/dev/null 2>&1; then
    APACHE_USER="_www"  # macOS
else
    print_warning "Could not detect Apache user. Using current user."
    APACHE_USER=$(whoami)
fi

print_info "Apache user: $APACHE_USER"

# Set ownership
if [ "$EUID" -eq 0 ]; then
    chown -R $APACHE_USER:$APACHE_USER .
    print_success "Set ownership to $APACHE_USER"
else
    print_warning "Not running as root. Skipping ownership changes."
    print_info "Run with sudo to set proper ownership: sudo ./deploy.sh"
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    mkdir -p data
    print_success "Created data directory"
fi

# Set permissions
chmod 755 data/
chmod 644 .env 2>/dev/null || true

# Create locations.json if it doesn't exist
if [ ! -f "data/locations.json" ]; then
    echo "[]" > data/locations.json
    chmod 644 data/locations.json
    print_success "Created data/locations.json"
fi

print_success "Permissions configured"

# 4. Check Apache modules
echo ""
echo "4️⃣  Checking Apache modules..."

check_module() {
    if apache2ctl -M 2>/dev/null | grep -q "$1" || httpd -M 2>/dev/null | grep -q "$1"; then
        print_success "$1 is enabled"
        return 0
    else
        print_warning "$1 is not enabled"
        return 1
    fi
}

MODULES_OK=true
check_module "rewrite" || MODULES_OK=false
check_module "headers" || MODULES_OK=false
check_module "expires" || MODULES_OK=false
check_module "deflate" || MODULES_OK=false

if [ "$MODULES_OK" = false ]; then
    echo ""
    print_info "To enable required modules, run:"
    echo "  sudo a2enmod rewrite headers expires deflate"
    echo "  sudo systemctl restart apache2"
    echo ""
    read -p "Press enter to continue anyway, or Ctrl+C to exit..."
fi

# 5. Build production files
echo ""
echo "5️⃣  Building production files..."

if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi

    print_info "Building minified files..."
    npm run build

    if [ $? -eq 0 ]; then
        print_success "Production build complete"
    else
        print_error "Build failed. Check errors above."
        exit 1
    fi
else
    print_warning "npm not found or package.json missing. Skipping build step."
fi

# 6. Test configuration
echo ""
echo "6️⃣  Testing configuration..."

# Test PHP syntax
php -l api/locations.php >/dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "PHP syntax is valid"
else
    print_error "PHP syntax error in api/locations.php"
    exit 1
fi

# 7. Display next steps
echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Configure Apache Virtual Host"
echo "   See APACHE_SETUP.md for detailed instructions"
echo ""
echo "2. Enable SSL/HTTPS (Highly Recommended)"
echo "   Run: sudo certbot --apache -d yourdomain.com"
echo ""
echo "3. Test the deployment"
echo "   Visit: https://yourdomain.com"
echo "   Admin: https://yourdomain.com/admin.html"
echo ""
echo "4. Security Checklist:"
echo "   - [ ] HTTPS is enabled"
echo "   - [ ] .env is not publicly accessible"
echo "   - [ ] Changed default admin credentials"
echo "   - [ ] Set DEBUG_MODE=false in .env"
echo "   - [ ] Configured firewall"
echo "   - [ ] Set up backups"
echo ""
echo "📚 For detailed instructions, see APACHE_SETUP.md"
echo ""

# Optional: Test if we can write to data directory
if [ -w "data/locations.json" ]; then
    print_success "data/locations.json is writable"
else
    print_warning "data/locations.json may not be writable by Apache"
fi

echo ""
echo "🎉 Ready for deployment!"
