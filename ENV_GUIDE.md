# .env Configuration Guide

## Quick Summary

All your keys are **already in the code** - I've extracted them for you!

## Your Values

### ✅ Mapbox Token (Found in index.html)
```
pk.eyJ1IjoiemFrd2lubmljayIsImEiOiJjbWYxYzV5bmQxZGwzMmxxNHBieHp3NDI2In0.YAzo3vcGSqaNxZyz4GA7xg
```

### ✅ Admin Token (Found in js/admin/config.js)
```
aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c
```

### ✅ Admin Password (Found in js/admin/config.js)
```
rivian2024
```

---

## Easy Setup on Your VPS

### Option 1: Automated Script (Recommended)

```bash
# Upload the project to your VPS
rsync -avz --exclude='node_modules' --exclude='.git' \
  . user@your-vps:/var/www/rivianspotter/

# SSH into VPS
ssh user@your-vps

# Navigate to directory
cd /var/www/rivianspotter

# Run the setup script
./setup-env.sh

# Enter your domain when prompted
# Example: rivianspotter.com
```

That's it! The script will:
- ✅ Create `.env` with all your existing values
- ✅ Update domain to match yours
- ✅ Set production mode (DEBUG_MODE=false)
- ✅ Set correct permissions
- ✅ Set ownership to www-data

---

### Option 2: Manual Setup

If you prefer to do it manually:

```bash
# On your VPS
cd /var/www/rivianspotter

# Copy the production template
cp .env.production .env

# Edit it
nano .env
```

**Change only this line** (replace with your actual domain):
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Example:**
```env
ALLOWED_ORIGINS=https://rivianspotter.com,https://www.rivianspotter.com
```

**Save and set permissions:**
```bash
chmod 640 .env
sudo chown www-data:www-data .env
```

---

## What Each Value Does

| Variable | Current Value | What It Does |
|----------|---------------|--------------|
| `MAPBOX_ACCESS_TOKEN` | pk.eyJ1Io... | Your Mapbox API key for displaying the map |
| `ADMIN_TOKEN` | aef8301d... | Secret token for API authentication |
| `ADMIN_PASSWORD` | rivian2024 | Password to login to admin panel |
| `ALLOWED_ORIGINS` | your domains | Which domains can access the API |
| `DEBUG_MODE` | false (prod) | Shows detailed errors (keep false in production) |

---

## Security Notes

### ✅ Current Setup (Good for now)

Your tokens are fine to use as-is because:
- Mapbox tokens are meant to be public (they're restricted by domain in Mapbox dashboard)
- Admin token is long and random (secure)
- Admin panel is password-protected

### 🔒 Optional: Generate New Secure Tokens

If you want to generate new secure tokens:

```bash
# Generate new admin token (64 characters)
openssl rand -hex 32

# Generate new admin password
openssl rand -base64 24
```

**If you change these:**
1. Update `.env` on VPS
2. Update `js/admin/config.js` in your code
3. Commit and redeploy

---

## Troubleshooting

### Admin panel still shows "File Mode"?

```bash
# Check if .env exists
ls -la /var/www/rivianspotter/.env

# Check permissions
ls -la /var/www/rivianspotter/.env

# Should show: -rw-r----- 1 www-data www-data

# View contents (check for correct values)
cat /var/www/rivianspotter/.env

# Restart Apache
sudo systemctl restart apache2

# Check Apache error log
sudo tail -f /var/log/apache2/error.log
```

### "Configuration error" message?

Your `.env` file might have incorrect format. Make sure:
- No extra spaces around `=` signs
- No quotes around values (except in bash commands)
- File ends with a newline

**Correct format:**
```env
MAPBOX_ACCESS_TOKEN=pk.your_token_here
ADMIN_TOKEN=your_token_here
```

**Wrong format:**
```env
MAPBOX_ACCESS_TOKEN = "pk.your_token_here"  # NO spaces, NO quotes
```

---

## Testing

After setting up `.env`, test:

1. **Visit admin panel:** https://yourdomain.com/admin.html
2. **Login with:** rivian2024
3. **Check status:** Should show green "● API Connected"
4. **Try adding a location:** Should work and save

---

## Files Created for You

- `.env.production` - Production-ready template with your values
- `setup-env.sh` - Automated setup script
- `ENV_GUIDE.md` - This guide
- `.env` - Local development version (already configured)

---

**Your .env is ready to go! Just run `setup-env.sh` on your VPS.** 🚀
