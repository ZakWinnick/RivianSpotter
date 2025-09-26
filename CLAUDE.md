# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RivianSpotter is a web application that provides an interactive map of Rivian Spaces, Demo Centers, and Service Centers across the United States. The project is a client-side web application with a PHP backend API for data management and a contact form handler.

## Architecture

### Frontend Architecture
- **Pure JavaScript/HTML/CSS**: No build tools or frameworks required
- **Mapbox Integration**: Uses Mapbox GL JS v2.15.0 for interactive mapping
- **Component System**: Custom component system in `js/components.js` for reusable header/footer
- **Location Data**: Stored in `js/locations.js` as a JavaScript array and synchronized with `data/locations.json`

### Backend Architecture
- **PHP API**: RESTful API at `api/locations.php` for CRUD operations on location data
- **File-based Storage**: Uses JSON files in `data/` directory for persistence
- **Authentication**: Simple token-based auth for admin operations (token: `aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c`)
- **Contact Handler**: PHP script at `contact-handler.php` for form submissions

### Key Files
- `index.html` - Main map interface
- `admin.html` - Administrative panel for managing locations
- `js/locations.js` - Master location data array
- `api/locations.php` - Backend API for location management
- `js/components.js` - Reusable header/footer components
- `js/admin.js` - Admin panel functionality
- `data/locations.json` - JSON data storage
- `setup-locations-api.sh` - Server setup script

## Data Flow

1. **Location Data**: Stored primarily in `js/locations.js` as `rivianLocations` array
2. **API Sync**: Admin panel uses `api/locations.php` to read/write `data/locations.json`
3. **Data Sync**: Changes in admin panel should update both JSON file and JavaScript array
4. **Map Display**: Main map reads from `js/locations.js` array for real-time display

## Development Workflow

### Local Development
- Serve files using a local web server (PHP required for API functionality)
- Open `index.html` for the main application
- Open `admin.html` for location management (requires admin token)

### Testing Locations
- Use `test-api.html` to test API endpoints
- Admin panel provides live testing interface at `/admin.html`

### Deployment
- Run `setup-locations-api.sh` on server to configure directory structure and permissions
- Ensure PHP server can write to `data/` directory
- Update admin token in both `api/locations.php` and `js/admin.js`

## Important Notes

### Security ⚠️
- **API Keys**: Mapbox token should be moved to environment variables (see `.env.example`)
- **CORS Policy**: Restricted to specific domains in production (see `api/locations.php`)
- **Input Validation**: All user inputs are sanitized and validated
- **Rate Limiting**: API includes basic rate limiting (100 requests per 5 minutes)
- **Security Headers**: CSP and security headers implemented

### Performance Optimizations ⚡
- **Debounced Search**: 300ms delay prevents excessive filtering
- **Data Caching**: Client-side caching with 30-minute expiration
- **Lazy Loading**: Location data can be loaded in chunks
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Code Splitting**: Modular JavaScript architecture

### Data Management
- **Dual Storage**: Data in both `js/locations.js` and `data/locations.json`
- **Auto-sync**: Admin changes automatically update both files
- **Validation**: Server-side validation for coordinates and required fields
- **Sanitization**: All string inputs are sanitized against XSS

### Development Best Practices
- **Configuration**: Centralized config in `js/config.js`
- **Error Logging**: Console logging for debugging
- **Loading States**: User feedback during data operations
- **Mobile-First**: Responsive design with touch-friendly interactions

## File Structure
```
├── index.html              # Main map application
├── admin.html              # Admin panel
├── about.html              # About page
├── contact.html            # Contact page
├── .env.example            # Environment configuration template
├── js/
│   ├── app.js             # Main application logic (modular)
│   ├── config.js          # Application configuration
│   ├── data-loader.js     # Data loading and caching
│   ├── locations.js       # Location data array
│   ├── components.js      # Reusable components
│   └── admin.js          # Admin functionality
├── api/
│   └── locations.php     # Backend API (with security improvements)
├── data/
│   └── locations.json    # JSON data store
├── css/
│   └── style.css         # Main stylesheet (optimized)
├── images/
│   └── *.png            # Logo assets (should be optimized)
└── setup-locations-api.sh # Server setup script
```

## Recent Optimizations 🚀

### Performance Improvements
- **Moved inline CSS to external file** - Better caching and organization
- **Implemented debounced search** - Reduced excessive API calls
- **Added loading indicators** - Better user experience
- **Modular JavaScript** - Better maintainability and loading

### Security Enhancements
- **Input validation and sanitization** - Prevents XSS attacks
- **Rate limiting** - Prevents abuse
- **CORS restrictions** - Only allowed domains
- **Security headers** - XSS protection, content type validation

### Code Quality
- **Error handling** - Comprehensive try/catch blocks
- **Data validation** - Server and client-side validation
- **Configuration management** - Centralized settings
- **Responsive design optimizations** - Better mobile experience