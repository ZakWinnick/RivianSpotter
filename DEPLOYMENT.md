# Deployment Guide

This guide explains how to use the RivianSpotter build system to create production-ready files and deploy them to your web server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build System Overview](#build-system-overview)
3. [Building for Production](#building-for-production)
4. [Understanding Build Output](#understanding-build-output)
5. [Deployment Steps](#deployment-steps)
6. [Testing Production Build](#testing-production-build)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before building and deploying, ensure you have:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Web server access** (FTP, SSH, or deployment platform)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

   This installs:
   - `terser` - JavaScript minification
   - `clean-css` - CSS minification
   - `chalk` - Colored terminal output

---

## Build System Overview

The build system performs three main tasks:

1. **JavaScript Minification** - Compresses JS files and generates source maps
2. **CSS Minification** - Compresses CSS files and generates source maps
3. **HTML Generation** - Creates production HTML files that reference minified assets

### Build Configuration

The build script (`build.js`) processes these files:

**JavaScript:**
- `js/app.js` → `js/app.min.js`
- `js/config.js` → `js/config.min.js`
- `js/components.js` → `js/components.min.js`
- `js/data-loader.js` → `js/data-loader.min.js`
- `js/admin/*.js` → `js/admin/*.min.js` (7 files)

**CSS:**
- `css/style.css` → `css/style.min.css`
- `css/admin.css` → `css/admin.min.css`

**HTML:**
- `index.html` → `index.prod.html`
- `admin.html` → `admin.prod.html`
- `about.html` → `about.prod.html`
- `contact.html` → `contact.prod.html`

### Excluded Files

The `.buildignore` file excludes:
- Data files (`js/locations.js` - this is location data, not code)
- Test files
- Documentation
- Configuration files
- Already minified files
- Service worker (requires special handling)

---

## Building for Production

### Full Production Build

Run all build steps (JS, CSS, and HTML):

```bash
npm run build
```

**Output:**
```
🚀 RivianSpotter Production Build

📦 Minifying JavaScript files...
  ✓ js/app.js → js/app.min.js
    45.2 KB → 28.1 KB (37.8% reduction)
  ✓ js/config.js → js/config.min.js
    2.4 KB → 1.1 KB (54.2% reduction)
  ...

🎨 Minifying CSS files...
  ✓ css/style.css → css/style.min.css
    38.5 KB → 31.2 KB (19.0% reduction)
  ...

📄 Generating production HTML files...
  ✓ index.html → index.prod.html
  ...

✓ Build completed successfully in 2.34s
```

### Partial Builds

Build only specific asset types:

```bash
# JavaScript only
npm run build:js

# CSS only
npm run build:css

# HTML only
npm run build:html
```

### Cleaning Generated Files

Remove all build artifacts:

```bash
npm run clean
```

This deletes:
- All `*.min.js` files
- All `*.min.css` files
- All `*.prod.html` files
- All `*.map` source map files

---

## Understanding Build Output

### File Structure After Build

```
RivianSpotter/
├── index.html                  # Development version
├── index.prod.html             # Production version
├── admin.html                  # Development version
├── admin.prod.html             # Production version
├── about.html                  # Development version
├── about.prod.html             # Production version
├── contact.html                # Development version
├── contact.prod.html           # Production version
├── js/
│   ├── app.js                  # Development version
│   ├── app.min.js              # Production version (minified)
│   ├── app.min.js.map          # Source map for debugging
│   ├── config.js               # Development version
│   ├── config.min.js           # Production version
│   ├── config.min.js.map       # Source map
│   ├── locations.js            # NOT minified (data file)
│   └── admin/
│       ├── config.js           # Development version
│       ├── config.min.js       # Production version
│       └── ...
├── css/
│   ├── style.css               # Development version
│   ├── style.min.css           # Production version
│   ├── style.min.css.map       # Source map
│   └── admin.css               # Development version
│   └── admin.min.css           # Production version
└── ...
```

### Source Maps

Source maps (`*.map` files) allow you to debug minified code in browser DevTools. They map minified code back to the original source.

**Benefits:**
- Debug production code using original file names and line numbers
- Stack traces show original code locations
- No performance impact on end users

**Note:** Source maps are only downloaded when DevTools is open, so they don't affect page load times for regular users.

---

## Deployment Steps

### Step 1: Build Production Files

```bash
npm run build
```

Verify the build completed successfully with no errors.

### Step 2: Test Locally (Recommended)

Before deploying, test the production files locally:

```bash
# Using Python 3
python3 -m http.server 8000

# Using PHP
php -S localhost:8000

# Using Node.js http-server
npx http-server -p 8000
```

Open your browser to:
- `http://localhost:8000/index.prod.html`
- `http://localhost:8000/admin.prod.html`
- `http://localhost:8000/about.prod.html`
- `http://localhost:8000/contact.prod.html`

Test all functionality thoroughly:
- Map loads and displays correctly
- Search and filters work
- Admin panel functions (if applicable)
- Contact form submits
- Mobile responsive design
- All links and navigation work

### Step 3: Prepare Deployment Package

Create a list of files to upload:

**Required Files:**
- `*.prod.html` files (all production HTML)
- `js/*.min.js` files (all minified JavaScript)
- `js/*.min.js.map` files (source maps - optional but recommended)
- `js/admin/*.min.js` files (admin JavaScript)
- `js/admin/*.min.js.map` files (admin source maps)
- `css/*.min.css` files (all minified CSS)
- `css/*.min.css.map` files (source maps - optional)
- `js/locations.js` (location data - NOT minified)
- `js/config-loader.js` (configuration loader)
- `images/` directory (all images)
- `api/` directory (PHP backend)
- `data/` directory (JSON data storage)
- `service-worker.js` (if using offline support)
- `.htaccess` (if using Apache)

**Optional Files:**
- `*.map` files (source maps for debugging)
- Development versions (keep for backup)

### Step 4: Upload Files to Server

Using your preferred method:

#### Via FTP/SFTP

```bash
# Using FileZilla, Cyberduck, or similar FTP client
# Upload all files from Step 3 to your web server
```

#### Via SSH/SCP

```bash
# Using scp
scp *.prod.html user@yourserver.com:/path/to/webroot/
scp js/*.min.js user@yourserver.com:/path/to/webroot/js/
scp js/*.min.js.map user@yourserver.com:/path/to/webroot/js/
scp js/admin/*.min.js user@yourserver.com:/path/to/webroot/js/admin/
scp css/*.min.css user@yourserver.com:/path/to/webroot/css/

# Or using rsync (recommended)
rsync -avz --include='*.prod.html' \
           --include='*.min.js' \
           --include='*.min.css' \
           --include='*.map' \
           --exclude='node_modules' \
           --exclude='.git' \
           . user@yourserver.com:/path/to/webroot/
```

#### Via Git Deployment (GitHub Pages, Netlify, Vercel)

```bash
# Commit production files
git add *.prod.html js/*.min.js js/*.min.js.map css/*.min.css
git commit -m "Build production assets"
git push origin main

# Configure your platform to serve *.prod.html as *.html
# Or rename files on the server after deployment
```

### Step 5: Rename Production Files (On Server)

After uploading, rename production files to replace development versions:

```bash
# SSH into your server
ssh user@yourserver.com

# Navigate to web root
cd /path/to/webroot

# Backup existing files (recommended)
mkdir backups
cp index.html backups/index.html.backup
cp admin.html backups/admin.html.backup
cp about.html backups/about.html.backup
cp contact.html backups/contact.html.backup

# Replace with production versions
mv index.prod.html index.html
mv admin.prod.html admin.html
mv about.prod.html about.html
mv contact.prod.html contact.html
```

**Alternative: Use Web Server Configuration**

Instead of renaming, configure your web server to serve `.prod.html` files:

**Apache (.htaccess):**
```apache
# Serve production HTML files
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)\.html$ $1.prod.html [L]
```

**Nginx:**
```nginx
location / {
    try_files $uri $uri.prod.html $uri/ =404;
}
```

### Step 6: Clear Browser Cache

After deployment, you may need to clear your browser cache or use cache-busting techniques to ensure users get the new files.

**Cache Busting Options:**

1. **Version Query Strings** (recommended):

   Update the version numbers in production HTML files:
   ```html
   <script src="js/app.min.js?v=20241029"></script>
   <link rel="stylesheet" href="css/style.min.css?v=20241029">
   ```

2. **Server Headers**:

   Configure your web server to send proper cache headers:
   ```apache
   # Apache (.htaccess)
   <FilesMatch "\.(html|js|css)$">
       Header set Cache-Control "max-age=3600, must-revalidate"
   </FilesMatch>
   ```

3. **Service Worker Update**:

   If using a service worker, update its version number to force updates:
   ```javascript
   const CACHE_VERSION = 'v2.0.0'; // Increment this
   ```

### Step 7: Verify Deployment

1. **Clear your browser cache** (Ctrl+Shift+Delete / Cmd+Shift+Delete)
2. **Open your site** in a browser
3. **Open DevTools** (F12) and check:
   - Network tab: Verify `.min.js` and `.min.css` files are loading
   - Console: Check for any errors
   - Sources tab: Verify source maps are working (original files appear)
4. **Test all functionality**:
   - Map interactions
   - Search and filters
   - Admin panel (if applicable)
   - Contact form
   - Mobile responsiveness
   - All pages and navigation

---

## Testing Production Build

### Local Testing Checklist

Before deploying to production, test these areas:

#### Main Map Page (index.html)
- [ ] Map renders correctly
- [ ] Location markers appear
- [ ] Clicking markers shows location details
- [ ] Search functionality works
- [ ] State filter dropdown works
- [ ] Filter buttons (All, Spaces, Demo Centers, Outposts) work
- [ ] "Get Directions" links work
- [ ] Mobile bottom bar appears and functions on mobile
- [ ] "Near Me" location detection works
- [ ] Responsive design looks good on mobile/tablet/desktop

#### Admin Panel (admin.html)
- [ ] Login screen appears
- [ ] Authentication works
- [ ] Location list loads
- [ ] Add new location works
- [ ] Edit location works
- [ ] Delete location works
- [ ] Search locations works
- [ ] Filter by type works
- [ ] Export backup works
- [ ] Import data works
- [ ] Changes save correctly

#### About Page (about.html)
- [ ] Stats display correctly
- [ ] Content renders properly
- [ ] Navigation works
- [ ] Responsive design works

#### Contact Page (contact.html)
- [ ] Form renders correctly
- [ ] Form validation works
- [ ] Form submission works
- [ ] Success/error messages display
- [ ] Responsive design works

### Performance Testing

Use browser DevTools to verify improvements:

1. **Network Tab**:
   - Check file sizes (should be smaller)
   - Verify compression (gzip/brotli)
   - Check load times

2. **Performance Tab**:
   - Run Lighthouse audit
   - Target scores: Performance 90+, Accessibility 95+
   - Check for blocking resources

3. **Console Tab**:
   - No JavaScript errors
   - No warning messages
   - Source maps load correctly

### Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Desktop and iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## Rollback Procedures

If something goes wrong after deployment, follow these steps to rollback:

### Quick Rollback (Restore Backup)

```bash
# SSH into server
ssh user@yourserver.com
cd /path/to/webroot

# Restore from backup
cp backups/index.html.backup index.html
cp backups/admin.html.backup admin.html
cp backups/about.html.backup about.html
cp backups/contact.html.backup contact.html
```

### Git Rollback

```bash
# Find the commit hash to rollback to
git log --oneline

# Rollback to previous commit
git reset --hard <commit-hash>

# Force push (use with caution)
git push origin main --force
```

### Version Control Best Practices

1. **Always tag releases**:
   ```bash
   git tag -a v1.0.1 -m "Production build 2024-10-29"
   git push origin v1.0.1
   ```

2. **Keep development files**:
   Don't delete original `.js` and `.css` files - keep them in version control

3. **Document changes**:
   Maintain a CHANGELOG.md with deployment notes

---

## Troubleshooting

### Issue: JavaScript Errors After Deployment

**Symptoms:** Console shows errors like "Unexpected token" or "Syntax error"

**Solutions:**
1. Check source maps are uploaded (`.map` files)
2. Verify all `.min.js` files were uploaded correctly
3. Check browser cache - clear and reload
4. Verify build completed without errors
5. Check for mixed content (HTTP vs HTTPS)

### Issue: CSS Not Loading or Styles Broken

**Symptoms:** Page looks unstyled or partially styled

**Solutions:**
1. Check `.min.css` files were uploaded
2. Verify correct paths in production HTML
3. Check file permissions on server (should be readable)
4. Clear browser cache
5. Check browser DevTools Network tab for 404 errors

### Issue: Admin Panel Not Working

**Symptoms:** Authentication fails or API calls fail

**Solutions:**
1. Verify `api/locations.php` is uploaded and has correct permissions
2. Check `data/` directory has write permissions (755 or 775)
3. Verify admin token matches between `api/locations.php` and `js/admin/config.js`
4. Check PHP error logs on server
5. Verify `.htaccess` or Nginx config allows PHP execution

### Issue: Source Maps Not Working

**Symptoms:** Can't see original source code in DevTools

**Solutions:**
1. Verify `.map` files were uploaded
2. Check `.map` files are in same directory as `.min.js`/`.min.css`
3. Ensure web server allows access to `.map` files
4. Check browser DevTools settings: "Enable source maps" is checked

### Issue: Build Fails with "Module not found"

**Symptoms:** Build script crashes with module errors

**Solutions:**
1. Run `npm install` to install dependencies
2. Delete `node_modules` and `package-lock.json`, then run `npm install` again
3. Check Node.js version: `node --version` (should be v14+)
4. Verify `package.json` is correct

### Issue: Files Too Large / Slow Performance

**Symptoms:** Page loads slowly, large file sizes

**Solutions:**
1. Enable gzip/brotli compression on web server
2. Use CDN for external libraries (Mapbox, fonts)
3. Optimize images (use WebP format, compress)
4. Enable browser caching headers
5. Consider code splitting for large JavaScript files

### Issue: Service Worker Conflicts

**Symptoms:** Old cached content appears even after deployment

**Solutions:**
1. Update service worker version number
2. Clear browser application cache (DevTools > Application > Clear Storage)
3. Test in incognito/private mode
4. Update service worker to handle updates properly
5. Consider forcing service worker update on page load

---

## Advanced Deployment Options

### Automated Deployment with CI/CD

For automated deployments, integrate the build script into your CI/CD pipeline:

**GitHub Actions Example:**

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install dependencies
      run: npm install

    - name: Build production files
      run: npm run build

    - name: Deploy to server
      uses: easingthemes/ssh-deploy@v2
      env:
        SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
        REMOTE_USER: ${{ secrets.REMOTE_USER }}
        TARGET: /path/to/webroot/
```

### Docker Deployment

Build a Docker image with production files:

```dockerfile
FROM nginx:alpine

# Copy production files
COPY *.prod.html /usr/share/nginx/html/
COPY js/*.min.js /usr/share/nginx/html/js/
COPY css/*.min.css /usr/share/nginx/html/css/
COPY images/ /usr/share/nginx/html/images/

# Configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Security Considerations

### Production Checklist

Before deploying to production:

- [ ] Remove console.log statements (or disable in production)
- [ ] Verify admin token is secure and not exposed
- [ ] Check API endpoints have proper authentication
- [ ] Enable HTTPS (SSL/TLS certificate)
- [ ] Configure security headers (CSP, X-Frame-Options, etc.)
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Review `.env` file is not publicly accessible
- [ ] Verify sensitive data is not in client-side code
- [ ] Test CORS configuration
- [ ] Enable rate limiting on API endpoints

### Environment Variables

Use environment variables for sensitive data:

1. Create `.env` file (never commit to git):
   ```
   MAPBOX_TOKEN=your_token_here
   ADMIN_TOKEN=your_admin_token_here
   API_URL=https://api.yourdomain.com
   ```

2. Load in JavaScript:
   ```javascript
   // js/config-loader.js
   const config = {
     mapboxToken: process.env.MAPBOX_TOKEN,
     adminToken: process.env.ADMIN_TOKEN,
     apiUrl: process.env.API_URL
   };
   ```

3. Use a bundler (Webpack, Rollup) to replace at build time

---

## Performance Optimization Tips

### Additional Optimizations

1. **Image Optimization**:
   - Compress images (use TinyPNG, ImageOptim)
   - Convert to WebP format
   - Use responsive images with `srcset`
   - Lazy load off-screen images

2. **Font Optimization**:
   - Use font-display: swap
   - Preload critical fonts
   - Subset fonts to reduce size
   - Consider system fonts

3. **Caching Strategy**:
   - Set long cache times for static assets (1 year)
   - Use short cache times for HTML (1 hour)
   - Implement versioning/cache busting

4. **CDN Usage**:
   - Host static assets on CDN
   - Use CDN for external libraries
   - Enable edge caching

5. **Code Splitting**:
   - Split large JavaScript files by route
   - Load admin code only on admin pages
   - Use dynamic imports for heavy features

---

## Monitoring and Maintenance

### Post-Deployment Monitoring

Set up monitoring for:

1. **Uptime Monitoring**: UptimeRobot, Pingdom
2. **Performance Monitoring**: Google Analytics, New Relic
3. **Error Tracking**: Sentry, LogRocket
4. **Server Logs**: Monitor access and error logs

### Regular Maintenance

- **Weekly**: Check error logs, review performance metrics
- **Monthly**: Update dependencies (`npm update`), rebuild
- **Quarterly**: Security audit, penetration testing
- **Annually**: Review and optimize entire stack

---

## Getting Help

If you encounter issues:

1. Check console for JavaScript errors
2. Review server error logs
3. Search GitHub issues
4. Contact: contact@rivianspotter.com

---

## Summary

This deployment guide covered:

- Setting up the build system
- Building production files
- Testing before deployment
- Deploying to web servers
- Rollback procedures
- Troubleshooting common issues

For questions or issues, please open a GitHub issue or contact the development team.

**Last Updated:** October 29, 2024
