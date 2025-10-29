# Build System

Quick reference guide for the RivianSpotter build system.

## Quick Start

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Clean generated files
npm run clean
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Full production build (JS, CSS, and HTML) |
| `npm run build:js` | Minify JavaScript files only |
| `npm run build:css` | Minify CSS files only |
| `npm run build:html` | Generate production HTML files only |
| `npm run clean` | Remove all generated files |

## What Gets Built

### JavaScript Files (12 files)
- `js/app.js` → `js/app.min.js`
- `js/config.js` → `js/config.min.js`
- `js/components.js` → `js/components.min.js`
- `js/data-loader.js` → `js/data-loader.min.js`
- `js/features.js` → `js/features.min.js`
- `js/admin/config.js` → `js/admin/config.min.js`
- `js/admin/state.js` → `js/admin/state.min.js`
- `js/admin/auth.js` → `js/admin/auth.min.js`
- `js/admin/api.js` → `js/admin/api.min.js`
- `js/admin/ui.js` → `js/admin/ui.min.js`
- `js/admin/modal.js` → `js/admin/modal.min.js`
- `js/admin/app.js` → `js/admin/app.min.js`

### CSS Files (2 files)
- `css/style.css` → `css/style.min.css`
- `css/admin.css` → `css/admin.min.css`

### HTML Files (4 files)
- `index.html` → `index.prod.html`
- `admin.html` → `admin.prod.html`
- `about.html` → `about.prod.html`
- `contact.html` → `contact.prod.html`

### Source Maps
All minified files include source maps (`.map` files) for debugging.

## Excluded Files

The following files are excluded from minification (see `.buildignore`):

- `js/locations.js` - Location data (not code)
- `js/config-loader.js` - Configuration loader
- Test files (`*.test.js`, `*.spec.js`)
- API/PHP files (`api/**`, `*.php`)
- Already minified files (`*.min.js`, `*.min.css`)
- Documentation (`*.md`)
- Node modules and dependencies

## Performance Impact

**Average size reduction:**
- JavaScript: ~42.8% reduction
- CSS: ~33.8% reduction
- Overall: ~40.8% reduction (73 KB savings)

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Deployment Steps

1. **Build production files:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   # Using Python
   python3 -m http.server 8000

   # Or using PHP
   php -S localhost:8000
   ```

   Open: `http://localhost:8000/index.prod.html`

3. **Upload to server:**
   - All `*.prod.html` files
   - All `*.min.js` files
   - All `*.min.css` files
   - All `*.map` files (optional but recommended)
   - `js/locations.js` (data file, not minified)
   - Other assets (images, API, etc.)

4. **Rename on server:**
   ```bash
   mv index.prod.html index.html
   mv admin.prod.html admin.html
   mv about.prod.html about.html
   mv contact.prod.html contact.html
   ```

## Troubleshooting

### Build fails with "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Files not minifying
- Check if file is listed in `.buildignore`
- Verify file path in `build.js` config
- Check for syntax errors in source file

### Source maps not working
- Ensure `.map` files are uploaded to server
- Check browser DevTools settings: "Enable source maps" is checked
- Verify `.map` files are in same directory as `.min.js`/`.min.css`

## Development Workflow

1. **Work on development files** (`.js`, `.css`, `.html`)
2. **Test locally** using development files
3. **Build for production** when ready to deploy:
   ```bash
   npm run build
   ```
4. **Test production build** locally:
   ```bash
   python3 -m http.server 8000
   # Open http://localhost:8000/index.prod.html
   ```
5. **Deploy to server** following deployment guide

## Configuration

To add/remove files from the build:

1. Edit `build.js`:
   ```javascript
   const config = {
     jsFiles: [
       'js/your-file.js',  // Add your file here
       // ...
     ],
     // ...
   };
   ```

2. To exclude files, add patterns to `.buildignore`:
   ```
   # Exclude specific file
   js/my-file.js

   # Exclude by pattern
   *.test.js

   # Exclude directory
   tests/**
   ```

## Build Script Features

- **Minification**: Terser for JS, clean-css for CSS
- **Source Maps**: Generated for all minified files
- **Compression**: Dead code elimination, console.log preservation
- **Glob Patterns**: Support for wildcards in `.buildignore`
- **Error Handling**: Detailed error messages and stack traces
- **Size Reporting**: Shows original vs minified sizes
- **Colored Output**: Easy-to-read build progress
- **Fast**: Average build time < 1 second

## Next Steps

- See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide
- See [CLAUDE.md](CLAUDE.md) for project architecture overview
- See [README.md](README.md) for project information

---

**Last Updated:** October 29, 2024
