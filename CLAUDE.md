# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RivianSpotter is a web application providing an interactive map of Rivian Spaces, Demo Centers, Service Centers, and Outposts across North America. It's a static site hosted on GitHub Pages with no server-side code in production.

**Live Site:** https://rivianspotter.com

## Development Commands

```bash
# Install dependencies
npm install

# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:watch         # Watch mode for development

# Build for production (minify JS/CSS)
npm run build

# Local development - serve with any HTTP server
python -m http.server 8000
# or
npx serve
```

## Architecture

### Static Site (GitHub Pages Deployment)
- **No build required for development** - open `index.html` directly or serve with any HTTP server
- **Admin panel** uses GitHub API for data management (requires GitHub Personal Access Token)
- **PWA support** with service worker for offline functionality

### Frontend Structure
- **Vanilla JavaScript (ES6+)** - no frameworks, no transpilation needed
- **Mapbox GL JS v2.15.0** for interactive mapping with GeoJSON clustering
- **Global state** managed through `AppState` object in `js/app.js`

### Key JavaScript Modules
| File | Purpose |
|------|---------|
| `js/app.js` | Main application: map initialization, filtering, location management |
| `js/locations.js` | Location data array (`rivianLocations` global variable) |
| `js/features.js` | User features: favorites, sharing, export, recent locations |
| `js/config.js` | App configuration (`window.RivianSpotterConfig`) |
| `js/components.js` | Reusable header/footer components |
| `js/admin.js` | Admin panel functionality |

### Data Flow
1. Location data lives in `js/locations.js` as the `rivianLocations` array
2. Admin panel reads/writes via GitHub API to update `js/locations.js`
3. Map displays locations using Mapbox GeoJSON source with clustering
4. Filters update the GeoJSON source data dynamically

### Core Objects in `app.js`
- `AppState` - Global state (map instance, filters, search term, user location)
- `MapManager` - Map initialization, marker management, popups
- `LocationManager` - Filtering, list rendering, fly-to functionality
- `AdvancedFilterManager` - State/service/date/distance filters
- `UIManager` - Sidebar controls, mobile UI
- `Utils` - Debounce, sanitization, coordinate validation

## Testing

Tests use Jest with jsdom environment. Test files are in `tests/`:
- `tests/unit/` - Unit tests for config and utilities
- `tests/integration/` - API integration tests
- `tests/e2e/` - End-to-end tests
- `tests/setup.js` - Test setup and mocks

Coverage threshold: 70% for branches, functions, lines, and statements.

## Location Data Schema

```javascript
{
  id: 1,
  name: "Rivian Space - Venice",
  lat: 33.9935,
  lng: -118.4714,
  type: "Space",           // "Space" | "Demo Center" | "Service Center" | "Outpost"
  address: "245 Abbot Kinney Blvd",
  city: "Venice",
  state: "CA",             // Two-letter state/province code
  phone: "(555) 123-4567",
  hours: "Mon-Sat: 10am-7pm, Sun: 11am-6pm",
  services: ["Sales", "Test Drives", "Merchandise"],
  openingDate: "2022-03-15",
  rivianUrl: "https://rivian.com/spaces/venice",
  isOpen: true
}
```

## Important Patterns

### Adding/Modifying Locations
Edit `js/locations.js` directly or use the admin panel at `/admin.html` with a GitHub PAT.

### Map Marker Types
- **Green circles** - Spaces
- **Blue circles** - Demo Centers
- **Orange circles** - Outposts
- **Purple circles** - Service Centers

### Filtering Architecture
All filters use AND logic and update the map's GeoJSON source via `LocationManager.filterLocations()`. The filter state lives in `AppState`.

## Deployment

Automatically deployed to GitHub Pages on push to `main`. No build step required for basic deployment - minified files are pre-built.
