# RivianSpotter

An interactive web application that provides a comprehensive map of Rivian Spaces, Demo Centers, Service Centers, and Outposts across North America. RivianSpotter helps users discover Rivian locations with detailed information including addresses, contact details, services, and real-time map visualization.

**Live Site:** [rivianspotter.com](https://rivianspotter.com)

## Features

- **Interactive Map Interface**: Powered by Mapbox GL JS with clustered markers and smooth navigation
- **Location Search & Filtering**: Real-time search with debounced input for optimal performance
- **Location Types**:
  - Rivian Spaces (retail showrooms)
  - Demo Centers (test drive & delivery locations)
  - Service Centers (vehicle maintenance & repairs)
  - Outposts (adventure/outdoor partner locations)
- **Advanced Filters**:
  - Filter by state/province
  - Filter by services offered
  - Filter by opening date
  - Distance-based filtering (Near Me)
  - Open Now / Coming Soon quick filters
- **Detailed Location Information**:
  - Full address and contact details
  - Operating hours
  - Available services
  - Opening dates
  - Direct links to official Rivian.com pages
- **User Features**:
  - Save favorite locations (stored locally)
  - Recent locations history
  - Export locations to CSV/JSON
  - Share locations via link or social media
- **Dark Mode**: Automatic light/dark theme based on system preference
- **PWA Support**: Install as an app on mobile devices
- **Mobile-Responsive Design**: Optimized for all device sizes with touch-friendly interactions

## Tech Stack

- **HTML5/CSS3**: Modern semantic markup with CSS variables for theming
- **Vanilla JavaScript (ES6+)**: No frameworks required - lightweight and fast
- **Mapbox GL JS v2.15.0**: Interactive map visualization with clustering
- **GitHub Pages**: Static site hosting
- **GitHub API**: Admin panel uses GitHub API for data management
- **Service Worker**: Offline support and caching

## Project Structure

```
RivianSpotter/
├── index.html              # Main map application
├── admin.html              # Admin panel for managing locations
├── about.html              # About page
├── contact.html            # Contact page
├── stats.html              # Statistics page
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── CLAUDE.md               # Project documentation for AI assistants
├── README.md               # This file
│
├── js/
│   ├── app.js             # Main application logic
│   ├── config.js          # Application configuration
│   ├── locations.js       # Location data (121+ locations)
│   ├── components.js      # Reusable header/footer components
│   ├── features.js        # User features (favorites, sharing, export)
│   └── admin.js           # Admin panel functionality
│
├── css/
│   └── style.css          # Main stylesheet with dark mode support
│
├── images/
│   └── *.png              # Logo and image assets
│
└── .github/
    └── workflows/
        └── test.yml       # GitHub Actions CI/CD
```

## Local Development

### Prerequisites

- A modern web browser
- A local web server (optional, for testing)
- Mapbox account with API token (free tier available)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/zakwinnick/RivianSpotter.git
   cd RivianSpotter
   ```

2. **Open in browser**
   - Simply open `index.html` in your browser, or
   - Use a local server: `python -m http.server 8000` or `npx serve`

3. **Access the application**
   - Main Application: `http://localhost:8000/`
   - Stats Page: `http://localhost:8000/stats.html`
   - About Page: `http://localhost:8000/about.html`

### Getting a Mapbox Token

1. Sign up for a free account at [mapbox.com](https://www.mapbox.com/)
2. Navigate to your Account Dashboard
3. Create a new access token or use your default public token
4. Update `js/config.js` with your token

## Deployment

RivianSpotter is deployed automatically to GitHub Pages when changes are pushed to the `main` branch.

### Manual Deployment

1. Push changes to the `main` branch
2. GitHub Pages will automatically build and deploy
3. Changes are live within minutes at [rivianspotter.com](https://rivianspotter.com)

## Admin Panel

The admin panel uses the GitHub API to manage location data directly in the repository.

### Accessing the Admin Panel

1. Navigate to `/admin.html`
2. Enter your GitHub Personal Access Token
3. Manage locations through the interface

### Admin Features

- Add, edit, and delete locations
- Bulk import/export
- Real-time preview
- Automatic commit to repository

## Data Structure

Each location includes:

```json
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
  "rivianUrl": "https://rivian.com/spaces/venice",
  "isOpen": true
}
```

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a Pull Request**

### Areas for Contribution

- New location updates
- UI/UX improvements
- Accessibility enhancements
- Performance optimizations
- Bug fixes
- Documentation improvements

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 RivianSpotter

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

- **Website**: [rivianspotter.com](https://rivianspotter.com)
- **Issues**: [GitHub Issues](https://github.com/zakwinnick/RivianSpotter/issues)
- **Contact**: Use the contact form on the website

## Disclaimer

RivianSpotter is an independent, community-driven project and is not officially affiliated with, endorsed by, or connected to Rivian Automotive, LLC. All Rivian trademarks, logos, and brand names are the property of their respective owners. Location information is gathered from public sources and may not always be current.

---

**Built with passion for the Rivian community**
