# RivianSpotter

An interactive web application that provides a comprehensive map of Rivian Spaces, Demo Centers, and Service Centers across the United States. RivianSpotter helps users discover Rivian locations with detailed information including addresses, contact details, services, and real-time map visualization.

## Features

- **Interactive Map Interface**: Powered by Mapbox GL JS v2.15.0 for smooth, responsive mapping
- **Location Search & Filtering**: Real-time search with debounced input for optimal performance
- **Location Types**:
  - Rivian Spaces (retail showrooms)
  - Demo Centers (test drive locations)
  - Service Centers (vehicle maintenance)
- **Detailed Location Information**:
  - Full address and contact details
  - Operating hours
  - Available services
  - Opening dates
  - Direct links to official Rivian pages
- **Admin Panel**: Comprehensive location management with CRUD operations
- **Mobile-Responsive Design**: Optimized for all device sizes with touch-friendly interactions
- **Performance Optimized**: Client-side caching, debounced search, and lazy loading
- **Security Focused**: Input validation, XSS protection, rate limiting, and CORS restrictions

## Tech Stack

### Frontend
- **HTML5/CSS3**: Modern semantic markup and styling
- **Vanilla JavaScript (ES6+)**: No frameworks required - lightweight and fast
- **Mapbox GL JS v2.15.0**: Interactive map visualization
- **Custom Component System**: Reusable header/footer components

### Backend
- **PHP**: RESTful API for location management
- **File-based Storage**: JSON data persistence (no database required)
- **Token-based Authentication**: Secure admin operations

### Security & Performance
- **Rate Limiting**: 100 requests per 5 minutes
- **Input Validation & Sanitization**: XSS and injection prevention
- **CORS Policy**: Restricted to allowed domains
- **Security Headers**: CSP, X-Frame-Options, and more
- **Client-side Caching**: 30-minute cache expiration
- **Debounced Search**: 300ms delay to prevent excessive filtering

## Project Structure

```
RivianSpotter/
├── index.html              # Main map application
├── admin.html              # Admin panel for managing locations
├── about.html              # About page
├── contact.html            # Contact page
├── .env.example            # Environment configuration template
├── CLAUDE.md               # Project documentation for AI assistants
├── README.md               # This file
│
├── js/
│   ├── app.js             # Main application logic (modular)
│   ├── config.js          # Application configuration
│   ├── data-loader.js     # Data loading and caching
│   ├── locations.js       # Location data array
│   ├── components.js      # Reusable header/footer components
│   └── admin.js           # Admin panel functionality
│
├── api/
│   ├── locations.php      # RESTful API for location management
│   └── env-loader.php     # Environment variable loader
│
├── data/
│   └── locations.json     # JSON data storage
│
├── css/
│   └── style.css          # Main stylesheet
│
├── images/
│   └── *.png              # Logo and image assets
│
└── setup-locations-api.sh # Server setup script
```

## Setup Instructions

### Prerequisites

- PHP 7.4+ with CLI support
- A web server (Apache, Nginx, or PHP built-in server)
- Mapbox account with API token (free tier available)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/RivianSpotter.git
   cd RivianSpotter
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:
   ```env
   # Mapbox Configuration
   MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

   # API Configuration
   ADMIN_TOKEN=your_secure_admin_token_here
   ADMIN_PASSWORD=your_secure_password_here

   # Security Settings
   ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

   # Development Settings
   DEBUG_MODE=true
   DISPLAY_ERRORS=true
   ```

3. **Set up data directory permissions**
   ```bash
   mkdir -p data
   chmod 755 data
   touch data/locations.json
   chmod 644 data/locations.json
   ```

4. **Start the PHP development server**
   ```bash
   php -S localhost:8000
   ```

5. **Access the application**
   - Main Application: `http://localhost:8000/index.html`
   - Admin Panel: `http://localhost:8000/admin.html`
   - About Page: `http://localhost:8000/about.html`
   - Contact Page: `http://localhost:8000/contact.html`

### Getting a Mapbox Token

1. Sign up for a free account at [mapbox.com](https://www.mapbox.com/)
2. Navigate to your Account Dashboard
3. Create a new access token or use your default public token
4. Add the token to your `.env` file

## Environment Configuration

Create a `.env` file in the root directory with the following configuration:

```env
# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_public_token

# API Configuration
# Generate a secure token: openssl rand -hex 32
ADMIN_TOKEN=your_secure_admin_token_here
ADMIN_PASSWORD=your_secure_password_here

# Security Settings
ALLOWED_ORIGINS=https://rivianspotter.com,https://www.rivianspotter.com

# Performance Settings
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_WINDOW=100
RATE_LIMIT_WINDOW_SECONDS=300

# Cache Settings
ENABLE_CACHING=true
CACHE_EXPIRATION_MINUTES=30

# Contact Form Settings
CONTACT_EMAIL=contact@rivianspotter.com
FROM_EMAIL=noreply@rivianspotter.com
SAVE_CONTACTS=false

# Development Settings (set to false in production)
DEBUG_MODE=false
DISPLAY_ERRORS=false
```

### Generating Secure Tokens

Use OpenSSL to generate secure admin tokens:

```bash
openssl rand -hex 32
```

## Deployment Instructions

### Server Requirements

- PHP 7.4+ with JSON support
- Web server (Apache/Nginx) with PHP-FPM
- HTTPS enabled (recommended)
- Write permissions for `data/` directory

### Deployment Steps

1. **Upload files to your server**
   ```bash
   # Using rsync
   rsync -avz --exclude='.env' --exclude='.git' ./ user@server:/path/to/rivianspotter/
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup-locations-api.sh
   ./setup-locations-api.sh
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update with production values
   - Set `DEBUG_MODE=false` and `DISPLAY_ERRORS=false`

4. **Set proper permissions**
   ```bash
   chmod 755 api/
   chmod 644 api/*.php
   chmod 755 data/
   chmod 644 data/*.json
   chmod 644 js/*.js
   ```

5. **Configure web server**

   **Apache (.htaccess):**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^api/(.*)$ api/locations.php [L,QSA]

   # Security headers
   Header set X-Content-Type-Options "nosniff"
   Header set X-Frame-Options "DENY"
   Header set X-XSS-Protection "1; mode=block"
   ```

   **Nginx:**
   ```nginx
   location /api/ {
       try_files $uri $uri/ /api/locations.php?$args;
   }

   # Security headers
   add_header X-Content-Type-Options "nosniff";
   add_header X-Frame-Options "DENY";
   add_header X-XSS-Protection "1; mode=block";
   ```

6. **Test the deployment**
   - Visit your site's homepage
   - Verify map loads correctly
   - Test search functionality
   - Login to admin panel and test CRUD operations

## API Documentation

### Base URL
```
/api/locations.php
```

### Authentication
Protected endpoints require an `Authorization` header:
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### Endpoints

#### Get All Locations
```http
GET /api/locations.php
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Rivian Space - Venice",
    "lat": 33.9935,
    "lng": -118.4714,
    "type": "Space",
    "address": "245 Abbot Kinney Blvd",
    "city": "Venice",
    "state": "CA",
    "phone": "(555) 123-4567",
    "hours": "Mon-Sat: 10am-7pm, Sun: 11am-6pm",
    "services": ["Sales", "Test Drives", "Merchandise"],
    "openingDate": "2022-03-15",
    "rivianUrl": "https://rivian.com/locations/venice",
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-15 10:30:00"
  }
]
```

#### Export Locations (Download)
```http
GET /api/locations.php?action=export
```

Returns a downloadable JSON file with all locations.

#### Add New Location
```http
POST /api/locations.php
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Rivian Service Center - Austin",
  "lat": 30.2672,
  "lng": -97.7431,
  "type": "Service Center",
  "address": "123 Electric Ave",
  "city": "Austin",
  "state": "TX",
  "phone": "(555) 987-6543",
  "hours": "Mon-Fri: 8am-6pm",
  "services": ["Service", "Parts", "Charging"],
  "openingDate": "2024-06-01",
  "rivianUrl": "https://rivian.com/locations/austin-service"
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "id": 1234567890,
    "name": "Rivian Service Center - Austin",
    ...
  }
}
```

#### Update Location
```http
PUT /api/locations.php
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": 1234567890,
  "name": "Rivian Service Center - Austin (Updated)",
  "lat": 30.2672,
  "lng": -97.7431,
  ...
}
```

#### Bulk Update Locations
```http
PUT /api/locations.php?action=bulk
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
[
  { "id": 1, "name": "Location 1", ... },
  { "id": 2, "name": "Location 2", ... }
]
```

#### Delete Location
```http
DELETE /api/locations.php?id=1234567890
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid location data. Please check required fields and coordinate values."
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Location not found"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to save location"
}
```

## Admin Panel Usage

### Accessing the Admin Panel

1. Navigate to `/admin.html`
2. Enter your admin password (set in `.env`)
3. Click "Login"

### Managing Locations

**Add New Location:**
1. Click the "Add New Location" button
2. Fill in all required fields:
   - Name (required)
   - Latitude (required, -90 to 90)
   - Longitude (required, -180 to 180)
   - Type (required: Space, Demo Center, or Service Center)
   - Address, City, State
   - Phone, Hours
   - Services (comma-separated)
   - Opening Date (YYYY-MM-DD)
   - Rivian URL
3. Click "Save"

**Edit Location:**
1. Find the location in the list
2. Click the "Edit" button
3. Modify fields as needed
4. Click "Save"

**Delete Location:**
1. Find the location in the list
2. Click the "Delete" button
3. Confirm the deletion

**Search & Filter:**
- Use the search box to filter locations by name, city, or type
- Search is debounced (300ms) for optimal performance

**Export Data:**
- Click "Export Locations" to download all locations as JSON
- Useful for backups or data migration

### Data Synchronization

The admin panel automatically synchronizes data between:
- `data/locations.json` (backend storage)
- `js/locations.js` (frontend consumption)

Changes made in the admin panel are immediately reflected on the main map.

## Development Workflow

### Making Changes

1. **Frontend Changes** (HTML/CSS/JS):
   - Edit files directly
   - Refresh browser to see changes
   - No build process required

2. **Backend Changes** (PHP API):
   - Edit `api/locations.php`
   - Changes take effect immediately (no restart needed)
   - Check PHP error logs for debugging

3. **Data Changes**:
   - Use admin panel for location updates (recommended)
   - Or manually edit `data/locations.json` and regenerate `js/locations.js`

### Testing

**Test API Endpoints:**
```bash
# Get locations
curl http://localhost:8000/api/locations.php

# Add location (with auth)
curl -X POST http://localhost:8000/api/locations.php \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Location","lat":34.05,"lng":-118.25,"type":"Space"}'
```

**Test in Browser:**
- Open browser developer console
- Check for JavaScript errors
- Monitor network requests
- Verify map markers render correctly

### Code Quality

**JavaScript Standards:**
- ES6+ features (arrow functions, const/let, template literals)
- Modular architecture with separate concerns
- Comprehensive error handling with try/catch
- Clear comments and documentation

**PHP Standards:**
- PSR-12 coding style
- Input validation and sanitization
- Error logging and handling
- Security best practices

**Performance:**
- Debounced user input (300ms)
- Client-side caching (30 minutes)
- Optimized API calls
- Efficient DOM manipulation

## Contributing

We welcome contributions to RivianSpotter! Here's how you can help:

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use the issue template (if available)
3. Include:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS information
   - Screenshots (if applicable)

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/RivianSpotter.git
   cd RivianSpotter
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: Brief description of changes"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Provide clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

### Development Guidelines

- **Code Style**: Follow existing patterns and conventions
- **Testing**: Test all changes in multiple browsers
- **Documentation**: Update README.md and CLAUDE.md if needed
- **Security**: Never commit API keys or sensitive data
- **Performance**: Optimize for speed and efficiency

### Areas for Contribution

- New location types or categories
- Improved search algorithms
- Enhanced mobile responsiveness
- Accessibility improvements (WCAG compliance)
- Performance optimizations
- Bug fixes and error handling
- Documentation improvements
- Unit and integration tests

## Security Considerations

### Best Practices Implemented

- **Input Validation**: All user inputs sanitized and validated
- **XSS Protection**: HTML special characters escaped
- **CSRF Protection**: Token-based authentication
- **Rate Limiting**: 100 requests per 5-minute window
- **CORS Policy**: Restricted to allowed domains only
- **Security Headers**: CSP, X-Frame-Options, X-XSS-Protection
- **HTTPS Recommended**: Always use HTTPS in production

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns directly to: [your-security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 RivianSpotter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Contact & Support

### Get Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/RivianSpotter/issues)
- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for technical details
- **Email**: contact@rivianspotter.com (update with actual email)

### Community

- **Discussions**: Share ideas and get help from the community
- **Feature Requests**: Suggest new features via GitHub Issues
- **Bug Reports**: Help us improve by reporting bugs

### Acknowledgments

- **Mapbox**: For providing excellent mapping technology
- **Rivian**: For building amazing electric vehicles
- **Contributors**: Thanks to all who have contributed to this project

### Disclaimer

RivianSpotter is an independent project and is not officially affiliated with, endorsed by, or connected to Rivian Automotive, LLC. All Rivian trademarks, logos, and brand names are the property of their respective owners.

---

**Built with passion for the Rivian community**

Last Updated: 2024
