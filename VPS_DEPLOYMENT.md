# Quick VPS Deployment Guide

## Step-by-Step Deployment to Your Apache VPS

### 1. Prepare Locally (On Your Mac)

```bash
# Navigate to project
cd /Users/zakwinnick/Documents/GitHub/RivianSpotter

# Make sure .env exists with your values
cat .env

# Commit your changes (optional, but recommended)
git add .
git commit -m "Prepared for deployment with all improvements"
```

### 2. Upload to Your VPS

**Option A: Using rsync (Recommended)**
```bash
# Replace 'user' and 'your-vps-ip' with your actual values
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='tests' \
  --exclude='*.min.js' \
  --exclude='*.min.css' \
  . user@your-vps-ip:/var/www/rivianspotter/
```

**Option B: Using Git**
```bash
# On your Mac - push to GitHub
git push origin main

# On your VPS - pull from GitHub
ssh user@your-vps-ip
cd /var/www/rivianspotter
git pull origin main
```

**Option C: Using SCP**
```bash
# Create tarball
tar -czf rivianspotter.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  .

# Upload to VPS
scp rivianspotter.tar.gz user@your-vps-ip:/tmp/

# On VPS - extract
ssh user@your-vps-ip
cd /var/www/
sudo tar -xzf /tmp/rivianspotter.tar.gz
sudo mv rivianspotter-temp rivianspotter  # adjust as needed
```

### 3. Run Deployment Script on VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to the project
cd /var/www/rivianspotter

# Make deploy script executable
chmod +x deploy.sh

# Run deployment script
sudo ./deploy.sh
```

**The script will:**
- ✅ Detect Apache and PHP
- ✅ Set up correct permissions
- ✅ Create data directory
- ✅ Check Apache modules
- ✅ Build minified production files
- ✅ Verify configuration

### 4. Configure Apache Virtual Host

**Create/Edit Virtual Host:**
```bash
sudo nano /etc/apache2/sites-available/rivianspotter.conf
```

**Basic Configuration:**
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    DocumentRoot /var/www/rivianspotter

    <Directory /var/www/rivianspotter>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Files ".env">
        Require all denied
    </Files>

    ErrorLog ${APACHE_LOG_DIR}/rivianspotter-error.log
    CustomLog ${APACHE_LOG_DIR}/rivianspotter-access.log combined
</VirtualHost>
```

**Enable the site:**
```bash
# Enable site
sudo a2ensite rivianspotter.conf

# Enable required modules
sudo a2enmod rewrite headers expires deflate

# Test configuration
sudo apachectl configtest

# Restart Apache
sudo systemctl restart apache2
```

### 5. Set Up SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-apache

# Get SSL certificate (replace with your domain)
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# Certbot will automatically:
# - Get SSL certificate
# - Configure Apache for HTTPS
# - Set up auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

### 6. Update .env for Production

```bash
# Edit .env on VPS
sudo nano /var/www/rivianspotter/.env
```

**Change these settings for production:**
```env
# Security Settings
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Development Settings - IMPORTANT!
DEBUG_MODE=false
DISPLAY_ERRORS=false
```

**Secure the .env file:**
```bash
sudo chmod 640 .env
sudo chown www-data:www-data .env
```

### 7. Test Everything

**A. Test Website:**
```bash
# Visit in browser
https://yourdomain.com

# Should show the map with locations
```

**B. Test API:**
```bash
# On VPS
curl https://yourdomain.com/api/locations.php

# Should return JSON data
```

**C. Test Admin Panel:**
```bash
# Visit in browser
https://yourdomain.com/admin.html

# Login with password: rivian2024
# Should show green "● API Connected" status
```

**D. Check Logs:**
```bash
# Apache error log
sudo tail -f /var/log/apache2/rivianspotter-error.log

# Apache access log
sudo tail -f /var/log/apache2/rivianspotter-access.log
```

### 8. Post-Deployment Checklist

- [ ] Website loads at https://yourdomain.com
- [ ] SSL certificate is active (padlock in browser)
- [ ] Map displays with locations
- [ ] Admin panel shows "API Connected" (green)
- [ ] Can add/edit/delete locations in admin
- [ ] No errors in browser console
- [ ] No errors in Apache logs
- [ ] .env file is not publicly accessible (test: https://yourdomain.com/.env should be 403)

### 9. Troubleshooting

**API returns 500 error:**
```bash
# Check Apache error log
sudo tail -50 /var/log/apache2/rivianspotter-error.log

# Common fix: Check .env file exists
ls -la /var/www/rivianspotter/.env

# Check PHP errors
sudo tail -50 /var/log/apache2/error.log
```

**Admin panel still shows "File Mode":**
```bash
# Check if PHP module is loaded
sudo apachectl -M | grep php

# If not loaded, install PHP module
sudo apt install libapache2-mod-php

# Restart Apache
sudo systemctl restart apache2
```

**Permission errors:**
```bash
# Fix data directory permissions
sudo chown -R www-data:www-data /var/www/rivianspotter/data/
sudo chmod 755 /var/www/rivianspotter/data/
sudo chmod 644 /var/www/rivianspotter/data/locations.json
```

**CORS errors in browser:**
```bash
# Check ALLOWED_ORIGINS in .env
grep ALLOWED_ORIGINS /var/www/rivianspotter/.env

# Should match your domain exactly
# Make sure to restart Apache after changes
sudo systemctl restart apache2
```

### 10. Backup Before Deployment (Recommended)

```bash
# On VPS - backup existing data
sudo cp /var/www/rivianspotter/data/locations.json \
       /var/www/rivianspotter/data/locations.backup.$(date +%Y%m%d).json

# Create full backup
sudo tar -czf /backups/rivianspotter-$(date +%Y%m%d).tar.gz \
  /var/www/rivianspotter/
```

## Quick Commands Reference

```bash
# View Apache logs
sudo tail -f /var/log/apache2/rivianspotter-error.log

# Restart Apache
sudo systemctl restart apache2

# Test Apache config
sudo apachectl configtest

# Check Apache status
sudo systemctl status apache2

# View enabled modules
sudo apachectl -M

# Edit .env
sudo nano /var/www/rivianspotter/.env

# Fix permissions
sudo chown -R www-data:www-data /var/www/rivianspotter/
sudo chmod 755 /var/www/rivianspotter/data/

# View SSL certificate info
sudo certbot certificates
```

## Support

For detailed information, see:
- `APACHE_SETUP.md` - Complete Apache configuration guide
- `README.md` - Application documentation
- `DEPLOYMENT.md` - General deployment guide

---

**Your RivianSpotter is production-ready! 🚀**
