# Apache Setup Guide for RivianSpotter

This guide will help you deploy RivianSpotter on your Apache VPS.

## Prerequisites

- Apache web server with PHP support
- PHP 7.4 or higher
- Write permissions for the `data/` directory

## Quick Setup

### 1. Verify Apache and PHP

```bash
# Check Apache version
apache2 -v
# or
httpd -v

# Check PHP version (should be 7.4+)
php -v

# Check if PHP module is loaded
apache2 -M | grep php
# or
httpd -M | grep php
```

### 2. Configure Directory Permissions

```bash
# Navigate to your RivianSpotter directory
cd /path/to/RivianSpotter

# Set correct ownership (replace 'www-data' with your Apache user)
sudo chown -R www-data:www-data .

# Set permissions for data directory (needs to be writable)
sudo chmod 755 data/
sudo chmod 644 data/locations.json

# Ensure .env is readable by Apache but not publicly accessible
sudo chmod 640 .env
sudo chown www-data:www-data .env
```

### 3. Configure .env File

```bash
# Copy the example if you haven't already
cp .env.example .env

# Edit the .env file with your actual values
nano .env
```

**Important .env settings for production:**
```env
# Use your actual Mapbox token
MAPBOX_ACCESS_TOKEN=pk.your_actual_mapbox_token_here

# Generate a new secure admin token
ADMIN_TOKEN=your_new_secure_random_token_here

# Generate a new secure admin password
ADMIN_PASSWORD=your_secure_password_here

# Production domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security settings for production
DEBUG_MODE=false
DISPLAY_ERRORS=false
ENABLE_RATE_LIMITING=true
```

**Generate secure tokens:**
```bash
# Generate admin token (64 characters)
openssl rand -hex 32

# Generate admin password
openssl rand -base64 24
```

### 4. Apache Virtual Host Configuration

Create or edit your Apache virtual host configuration:

```bash
sudo nano /etc/apache2/sites-available/rivianspotter.conf
```

**Example configuration:**

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    DocumentRoot /var/www/rivianspotter

    <Directory /var/www/rivianspotter>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Enable .htaccess
        <IfModule mod_rewrite.c>
            RewriteEngine On
        </IfModule>
    </Directory>

    # Deny access to .env file
    <Files ".env">
        Require all denied
    </Files>

    # Deny access to git files
    <DirectoryMatch "\.git">
        Require all denied
    </DirectoryMatch>

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/rivianspotter-error.log
    CustomLog ${APACHE_LOG_DIR}/rivianspotter-access.log combined
</VirtualHost>
```

### 5. Enable Required Apache Modules

```bash
# Enable necessary modules
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod deflate

# Restart Apache
sudo systemctl restart apache2
```

### 6. Enable SSL/HTTPS (Highly Recommended)

**Option A: Using Let's Encrypt (Free)**
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-apache

# Get SSL certificate
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure SSL
# Test auto-renewal
sudo certbot renew --dry-run
```

**Option B: Manual SSL Configuration**
```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    DocumentRoot /var/www/rivianspotter

    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    SSLCertificateChainFile /path/to/your/chain.crt

    # Same Directory configuration as HTTP vhost
    <Directory /var/www/rivianspotter>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # ... rest of config
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>
```

### 7. Enable the Site

```bash
# Enable your site
sudo a2ensite rivianspotter.conf

# Disable default site (optional)
sudo a2dissite 000-default.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### 8. Test the Deployment

```bash
# Test API endpoint
curl https://yourdomain.com/api/locations.php

# Should return JSON with locations data
```

**Test in browser:**
1. Visit `https://yourdomain.com` - Should load the map
2. Visit `https://yourdomain.com/admin.html` - Should show admin login
3. Check browser console for errors

## Troubleshooting

### API Returns HTML Instead of JSON

**Problem:** API endpoints return the PHP source code or HTML

**Solution:**
```bash
# Install PHP module for Apache
sudo apt install libapache2-mod-php

# Enable PHP module
sudo a2enmod php7.4  # or your PHP version

# Restart Apache
sudo systemctl restart apache2
```

### Permission Denied Errors

**Problem:** Cannot write to data/locations.json

**Solution:**
```bash
# Make data directory writable by Apache
sudo chown www-data:www-data data/
sudo chmod 755 data/
sudo chmod 644 data/locations.json
```

### .env Not Loading

**Problem:** Environment variables not loading

**Solution:**
```bash
# Verify .env file exists
ls -la .env

# Check .env permissions
sudo chmod 640 .env
sudo chown www-data:www-data .env

# Verify path in PHP files
grep "loadEnv()" api/*.php
```

### CORS Errors

**Problem:** Cross-origin request errors in browser console

**Solution:**
1. Check ALLOWED_ORIGINS in .env matches your domain
2. Verify mod_headers is enabled: `sudo a2enmod headers`
3. Restart Apache: `sudo systemctl restart apache2`

### 404 Errors for API

**Problem:** /api/locations.php returns 404

**Solution:**
```bash
# Verify .htaccess is enabled
sudo nano /etc/apache2/sites-available/rivianspotter.conf

# Ensure AllowOverride is set to All
# AllowOverride All

# Restart Apache
sudo systemctl restart apache2
```

## Security Checklist

- [ ] .env file is not publicly accessible
- [ ] HTTPS/SSL is enabled
- [ ] Changed default admin password
- [ ] Generated new admin token
- [ ] Set DEBUG_MODE=false in .env
- [ ] Set DISPLAY_ERRORS=false in .env
- [ ] ALLOWED_ORIGINS restricted to your domain
- [ ] File permissions are correct (755 for directories, 644 for files)
- [ ] Installed security updates on server
- [ ] Configured firewall (UFW/iptables)
- [ ] Set up regular backups

## Performance Optimization

### Enable OPcache

Edit PHP configuration:
```bash
sudo nano /etc/php/7.4/apache2/php.ini
```

Add/uncomment:
```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
```

### Enable Gzip Compression

Already configured in .htaccess, verify mod_deflate is enabled:
```bash
sudo a2enmod deflate
sudo systemctl restart apache2
```

### Set Up Caching

Browser caching is configured in .htaccess via mod_expires.

### Use Production Minified Files

```bash
# Build minified versions
npm run build

# Rename production HTML files
mv index.prod.html index.html
mv admin.prod.html admin.html
mv about.prod.html about.html
mv contact.prod.html contact.html
```

## Backup Strategy

### Manual Backup

```bash
# Backup locations data
cp data/locations.json data/locations.backup.$(date +%Y%m%d).json

# Backup entire site
tar -czf rivianspotter-backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    /var/www/rivianspotter/
```

### Automated Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/bin/tar -czf /backups/rivianspotter-$(date +\%Y\%m\%d).tar.gz /var/www/rivianspotter/
```

## Monitoring

### Check Apache Logs

```bash
# Error log
sudo tail -f /var/log/apache2/rivianspotter-error.log

# Access log
sudo tail -f /var/log/apache2/rivianspotter-access.log
```

### Check PHP Errors

```bash
# PHP error log location varies
sudo tail -f /var/log/php7.4-fpm.log
# or
sudo tail -f /var/log/apache2/error.log
```

## Updating the Application

```bash
# Navigate to directory
cd /var/www/rivianspotter

# Backup first!
cp data/locations.json data/locations.backup.json

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild if needed
npm run build

# Clear Apache cache (if using mod_cache)
sudo systemctl restart apache2
```

## Support

If you encounter issues:
1. Check Apache error logs
2. Check PHP error logs
3. Verify .env configuration
4. Test API endpoints manually
5. Check browser console for JavaScript errors

## Additional Resources

- [Apache Documentation](https://httpd.apache.org/docs/)
- [Let's Encrypt Setup](https://letsencrypt.org/getting-started/)
- [PHP Configuration](https://www.php.net/manual/en/configuration.php)
- RivianSpotter README.md for application details
