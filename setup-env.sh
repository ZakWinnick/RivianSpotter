#!/bin/bash
# Quick .env setup script for VPS deployment

echo "🔧 RivianSpotter .env Setup"
echo "==========================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. Existing .env file unchanged."
        exit 0
    fi
fi

# Copy from production template
if [ -f .env.production ]; then
    cp .env.production .env
    echo "✓ Created .env from production template"
else
    echo "✗ .env.production not found, using .env.example"
    cp .env.example .env
fi

# Get domain from user
echo ""
echo "Enter your domain name (e.g., rivianspotter.com):"
read DOMAIN

if [ -n "$DOMAIN" ]; then
    # Update ALLOWED_ORIGINS with actual domain
    sed -i.bak "s|https://yourdomain.com|https://$DOMAIN|g" .env
    sed -i.bak "s|https://www.yourdomain.com|https://www.$DOMAIN|g" .env
    rm -f .env.bak
    echo "✓ Updated domain to: $DOMAIN"
fi

# Set production mode
sed -i.bak 's/DEBUG_MODE=true/DEBUG_MODE=false/g' .env
sed -i.bak 's/DISPLAY_ERRORS=true/DISPLAY_ERRORS=false/g' .env
rm -f .env.bak

# Set permissions
chmod 640 .env
echo "✓ Set permissions to 640"

# Try to set ownership (may require sudo)
if [ "$EUID" -eq 0 ]; then
    chown www-data:www-data .env 2>/dev/null || chown apache:apache .env 2>/dev/null || true
    echo "✓ Set ownership to web server user"
else
    echo "! Run with sudo to set ownership: sudo ./setup-env.sh"
fi

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "========================"
grep -v "^#" .env | grep -v "^$" | sed 's/^/  /'
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Review the values above"
echo "  2. Never commit .env to git"
echo "  3. Keep ADMIN_PASSWORD secure"
echo "  4. Use DEBUG_MODE=false in production"
echo ""
echo "🚀 Ready to use! Reload your admin panel."
