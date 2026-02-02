// app.js - Main application logic with optimizations

// Global state management
const AppState = {
    map: null,
    markers: [],
    currentFilter: 'all',
    currentStateFilter: 'all',
    searchTerm: '',
    userMarker: null,
    isLoading: false,
    searchTimeout: null,
    // Advanced filters
    selectedStates: [],
    selectedServices: [],
    dateFrom: null,
    dateTo: null,
    distanceEnabled: false,
    distanceRadius: 50,
    userLocation: null,
    // Quick filters
    openNowFilter: false,
    comingSoonFilter: false
};

// Utility functions
const Utils = {
    // Debounce function for search input
    debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(AppState.searchTimeout);
                func(...args);
            };
            clearTimeout(AppState.searchTimeout);
            AppState.searchTimeout = setTimeout(later, wait);
        };
    },

    // Sanitize HTML content
    sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Validate coordinates
    isValidCoordinate(lat, lng) {
        return (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
        );
    },

    // Show loading state
    showLoading(element, message = 'Loading...') {
        if (!element) return;
        AppState.isLoading = true;
        element.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div style="margin-top: 1rem; color: #666;">${message}</div>
            </div>
        `;
    },

    // Hide loading state
    hideLoading() {
        AppState.isLoading = false;
    },

    // Show error message
    showError(message, element) {
        if (element) {
            element.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #dc3545;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Error</div>
                    <div>${Utils.sanitizeHTML(message)}</div>
                </div>
            `;
        }
        console.error('App Error:', message);
    },

    // Detect platform for maps deep linking
    getPlatform() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
            return 'ios';
        }
        if (/android/i.test(ua)) {
            return 'android';
        }
        return 'desktop';
    },

    // Generate platform-aware directions URL
    getDirectionsUrl(address, city, lat, lng) {
        const platform = this.getPlatform();
        const query = encodeURIComponent(`${address}, ${city}`);

        switch (platform) {
            case 'ios':
                // Apple Maps URL scheme
                return `maps://maps.apple.com/?daddr=${query}&dirflg=d`;
            case 'android':
                // Google Maps intent for Android
                return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
            default:
                // Desktop: Google Maps
                return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
        }
    }
};

// Geocoding Manager for address/zip code search
const GeocodeManager = {
    cache: new Map(),
    lastQuery: '',
    geocodedLocation: null,

    // Check if query looks like an address or zip code
    isAddressQuery(query) {
        if (!query || query.length < 3) return false;
        // Contains numbers (likely address or zip)
        if (/\d/.test(query)) return true;
        // Contains comma (likely "city, state" format)
        if (query.includes(',')) return true;
        return false;
    },

    // Geocode a query using Mapbox API
    async geocode(query) {
        if (!query || query.length < 3) return null;

        // Check cache
        if (this.cache.has(query)) {
            return this.cache.get(query);
        }

        try {
            const token = mapboxgl.accessToken;
            const encodedQuery = encodeURIComponent(query);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&country=us,ca&types=postcode,place,address,locality&limit=1`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const result = {
                    center: data.features[0].center,
                    placeName: data.features[0].place_name,
                    lng: data.features[0].center[0],
                    lat: data.features[0].center[1]
                };
                this.cache.set(query, result);
                return result;
            }

            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    },

    // Clear geocoded location
    clear() {
        this.geocodedLocation = null;
        this.lastQuery = '';
        this.updateIndicator(null);
    },

    // Update the "searching near" indicator
    updateIndicator(placeName) {
        let indicator = document.getElementById('geocodeIndicator');

        if (!placeName) {
            if (indicator) indicator.remove();
            return;
        }

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'geocodeIndicator';
            indicator.className = 'geocode-indicator';
            const searchBox = document.querySelector('.search-box');
            if (searchBox) {
                searchBox.insertAdjacentElement('afterend', indicator);
            }
        }

        indicator.innerHTML = `
            <span>Showing locations near <strong>${Utils.sanitizeHTML(placeName)}</strong></span>
            <button onclick="GeocodeManager.clear(); LocationManager.filterLocations();" title="Clear">×</button>
        `;
    }
};

// Make GeocodeManager globally accessible
window.GeocodeManager = GeocodeManager;

// Map initialization and management
const MapManager = {
    async initMap() {
        try {
            // Validate required dependencies
            if (typeof mapboxgl === 'undefined') {
                throw new Error('Mapbox GL JS library not loaded');
            }

            if (!rivianLocations || !Array.isArray(rivianLocations)) {
                throw new Error('Location data not available');
            }

            // Detect dark mode preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const mapStyle = prefersDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

            // Initialize map
            AppState.map = new mapboxgl.Map({
                container: 'map',
                style: mapStyle,
                center: [-98.5795, 39.8283], // Center of USA
                zoom: 4
            });

            // Listen for dark mode changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                const newStyle = e.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
                console.log('Dark mode changed, switching to:', newStyle);
                AppState.map.setStyle(newStyle);

                // Wait for style to fully load before re-adding markers
                const readdMarkers = () => {
                    console.log('Style loaded, re-adding markers...');
                    // Re-initialize the map layers with all locations first
                    MapManager.addMarkers(rivianLocations);
                    // Then apply current filters to show correct markers
                    LocationManager.filterLocations();
                };

                // Use idle event which fires when map is completely ready
                AppState.map.once('idle', readdMarkers);
            });

            // Add map error handler
            AppState.map.on('error', (e) => {
                console.error('Map error:', e.error);
                Utils.showError('Failed to load map. Please check your internet connection.',
                    document.getElementById('locationList'));
            });

            // Wait for map to load
            await new Promise((resolve, reject) => {
                AppState.map.on('load', resolve);
                AppState.map.on('error', reject);
                setTimeout(() => reject(new Error('Map load timeout')), 10000);
            });

            // Add controls
            AppState.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Add geolocate control
            const geolocate = new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: true
            });
            AppState.map.addControl(geolocate);

            // Listen for geolocate events to enable distance badges
            geolocate.on('geolocate', (e) => {
                AppState.userLocation = {
                    lat: e.coords.latitude,
                    lng: e.coords.longitude
                };
                // Re-render location list with distance badges
                LocationManager.filterLocations();
            });

            // Initialize app components
            this.populateStateFilter();
            this.addMarkers(rivianLocations);
            this.fitMapToLocations(rivianLocations);

            Utils.hideLoading();

        } catch (error) {
            console.error('Failed to initialize map:', error);
            Utils.showError('Failed to initialize map: ' + error.message,
                document.getElementById('locationList'));
        }
    },

    populateStateFilter() {
        try {
            const states = [...new Set(rivianLocations.map(l => l.state))].sort();
            const stateNames = {
                'AB': 'Alberta', 'AZ': 'Arizona', 'BC': 'British Columbia',
                'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut',
                'DC': 'Washington DC', 'FL': 'Florida', 'GA': 'Georgia',
                'HI': 'Hawaii', 'IA': 'Iowa', 'ID': 'Idaho', 'IL': 'Illinois',
                'IN': 'Indiana', 'KS': 'Kansas', 'KY': 'Kentucky',
                'MA': 'Massachusetts', 'MD': 'Maryland', 'MI': 'Michigan',
                'MN': 'Minnesota', 'MO': 'Missouri', 'MT': 'Montana',
                'NC': 'North Carolina', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
                'NV': 'Nevada', 'NY': 'New York', 'OH': 'Ohio', 'OK': 'Oklahoma',
                'ON': 'Ontario', 'OR': 'Oregon', 'PA': 'Pennsylvania',
                'QC': 'Quebec', 'SC': 'South Carolina', 'TN': 'Tennessee',
                'TX': 'Texas', 'UT': 'Utah', 'VA': 'Virginia',
                'WA': 'Washington', 'WI': 'Wisconsin'
            };

            const select = document.getElementById('stateFilter');
            if (!select) throw new Error('State filter element not found');

            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = `${stateNames[state] || state} (${state})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to populate state filter:', error);
        }
    },

    // Custom SVG marker definitions
    markerSVGs: {
        space: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#78BE21"/>
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="none" stroke="#fff" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="bold" font-size="14">R</text>
        </svg>`,
        demo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#004C6D"/>
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="none" stroke="#fff" stroke-width="2"/>
            <path d="M10 12h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2h-8c-1.1 0-2-.9-2-2v-5c0-1.1.9-2 2-2zm-1 7h10v-4H9v4zm2-6v1h2v-1h-2z" fill="#fff"/>
        </svg>`,
        service: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#7C3AED"/>
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="none" stroke="#fff" stroke-width="2"/>
            <path d="M20.5 10.5l-2.83 2.83 1.41 1.41L22 11.91V15h2v-6h-6v2h3.09zM12 9h-2v6h6v-2h-3.09l2.83-2.83-1.41-1.41L12 11.09V9zm-2 8v6h6v-2h-3.09l2.83-2.83-1.41-1.41L12 19.09V17h-2zm10 0v2h-3.09l2.83 2.83-1.41 1.41L16 20.91V23h-2v-6h6z" fill="#fff" transform="translate(4, 4) scale(0.7)"/>
        </svg>`,
        outpost: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#F59E0B"/>
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="none" stroke="#fff" stroke-width="2"/>
            <path d="M16 8l-6 6h4v6h4v-6h4z" fill="#fff"/>
        </svg>`
    },

    // Load custom marker images into map
    async loadMarkerImages() {
        const markerTypes = ['space', 'demo', 'service', 'outpost'];

        for (const type of markerTypes) {
            const imageName = `marker-${type}`;
            if (!AppState.map.hasImage(imageName)) {
                const svg = this.markerSVGs[type];
                const img = new Image(32, 40);
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                await new Promise((resolve) => {
                    img.onload = () => {
                        if (!AppState.map.hasImage(imageName)) {
                            AppState.map.addImage(imageName, img);
                        }
                        resolve();
                    };
                    img.onerror = resolve; // Don't block on error
                });
            }
        }
    },

    addMarkers(locations) {
        try {
            // Clear marker references (we use GeoJSON layers, not individual markers)
            AppState.markers = [];

            // Remove existing sources and layers if they exist
            if (AppState.map.getSource('locations')) {
                // Remove layers first
                if (AppState.map.getLayer('clusters')) AppState.map.removeLayer('clusters');
                if (AppState.map.getLayer('cluster-count')) AppState.map.removeLayer('cluster-count');
                if (AppState.map.getLayer('unclustered-space')) AppState.map.removeLayer('unclustered-space');
                if (AppState.map.getLayer('unclustered-demo')) AppState.map.removeLayer('unclustered-demo');
                if (AppState.map.getLayer('unclustered-outpost')) AppState.map.removeLayer('unclustered-outpost');
                if (AppState.map.getLayer('unclustered-service')) AppState.map.removeLayer('unclustered-service');
                // Remove source
                AppState.map.removeSource('locations');
            }

            // Load custom marker images
            this.loadMarkerImages();

            // Convert locations to GeoJSON format
            const geojsonData = {
                type: 'FeatureCollection',
                features: locations
                    .filter(location => Utils.isValidCoordinate(location.lat, location.lng))
                    .map(location => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [location.lng, location.lat]
                        },
                        properties: {
                            id: location.id,
                            name: location.name,
                            type: location.type,
                            address: location.address,
                            city: location.city,
                            state: location.state,
                            phone: location.phone || '',
                            hours: location.hours || '',
                            openingDate: location.openingDate || '',
                            rivianUrl: location.rivianUrl || '',
                            services: JSON.stringify(location.services || []),
                            isOpen: location.isOpen !== false
                        }
                    }))
            };

            // Add source with clustering enabled
            AppState.map.addSource('locations', {
                type: 'geojson',
                data: geojsonData,
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: window.RivianSpotterConfig.performance.markerClusterRadius || 50
            });

            // Add cluster circles layer with color based on point count
            AppState.map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'locations',
                filter: ['has', 'point_count'],
                paint: {
                    // Use step expressions to create three sizes based on point count
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#78BE21',  // Small clusters (< 10) - Green
                        10,
                        '#004C6D',  // Medium clusters (10-50) - Blue
                        50,
                        '#FF6B6B'   // Large clusters (50+) - Red
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,  // Small clusters
                        10,
                        30,  // Medium clusters
                        50,
                        40   // Large clusters
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });

            // Add cluster count text layer
            AppState.map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'locations',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 14
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });

            // Add individual marker layers for each location type using custom icons
            // Spaces (green pin with R)
            AppState.map.addLayer({
                id: 'unclustered-space',
                type: 'symbol',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Space']
                ],
                layout: {
                    'icon-image': 'marker-space',
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                }
            });

            // Demo Centers (blue pin with car)
            AppState.map.addLayer({
                id: 'unclustered-demo',
                type: 'symbol',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Demo Center']
                ],
                layout: {
                    'icon-image': 'marker-demo',
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                }
            });

            // Outposts (orange pin with arrow)
            AppState.map.addLayer({
                id: 'unclustered-outpost',
                type: 'symbol',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Outpost']
                ],
                layout: {
                    'icon-image': 'marker-outpost',
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                }
            });

            // Service Centers (purple pin with wrench)
            AppState.map.addLayer({
                id: 'unclustered-service',
                type: 'symbol',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Service Center']
                ],
                layout: {
                    'icon-image': 'marker-service',
                    'icon-size': 1,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true
                }
            });

            // Add click handlers for clusters
            AppState.map.on('click', 'clusters', (e) => {
                const features = AppState.map.queryRenderedFeatures(e.point, {
                    layers: ['clusters']
                });
                const clusterId = features[0].properties.cluster_id;
                AppState.map.getSource('locations').getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => {
                        if (err) return;

                        AppState.map.easeTo({
                            center: features[0].geometry.coordinates,
                            zoom: zoom,
                            duration: 500
                        });
                    }
                );
            });

            // Add click handlers for individual markers
            const markerLayers = ['unclustered-space', 'unclustered-demo', 'unclustered-outpost', 'unclustered-service'];

            markerLayers.forEach(layerId => {
                AppState.map.on('click', layerId, (e) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    const properties = e.features[0].properties;

                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }

                    // Reconstruct location object from properties
                    const location = {
                        id: properties.id,
                        name: properties.name,
                        type: properties.type,
                        address: properties.address,
                        city: properties.city,
                        state: properties.state,
                        phone: properties.phone,
                        hours: properties.hours,
                        openingDate: properties.openingDate,
                        rivianUrl: properties.rivianUrl,
                        services: JSON.parse(properties.services),
                        isOpen: properties.isOpen
                    };

                    const popupContent = this.createPopupContent(location);

                    new mapboxgl.Popup({ offset: 25 })
                        .setLngLat(coordinates)
                        .setHTML(popupContent)
                        .addTo(AppState.map);

                    // Highlight location in sidebar
                    LocationManager.highlightLocation(properties.id);
                });
            });

            // Change cursor to pointer when hovering over clusters or markers
            AppState.map.on('mouseenter', 'clusters', () => {
                AppState.map.getCanvas().style.cursor = 'pointer';
            });
            AppState.map.on('mouseleave', 'clusters', () => {
                AppState.map.getCanvas().style.cursor = '';
            });

            markerLayers.forEach(layerId => {
                AppState.map.on('mouseenter', layerId, () => {
                    AppState.map.getCanvas().style.cursor = 'pointer';
                });
                AppState.map.on('mouseleave', layerId, () => {
                    AppState.map.getCanvas().style.cursor = '';
                });
            });

            // Store reference for filtering
            AppState.markers = locations.map(loc => ({ location: loc }));

        } catch (error) {
            console.error('Failed to add markers:', error);
            Utils.showError('Failed to load map markers', document.getElementById('locationList'));
        }
    },

    createPopupContent(location) {
        // Sanitize location data
        const name = Utils.sanitizeHTML(location.name);
        const address = Utils.sanitizeHTML(location.address);
        const city = Utils.sanitizeHTML(location.city);
        const phone = Utils.sanitizeHTML(location.phone);
        const hours = Utils.sanitizeHTML(location.hours);

        const servicesHtml = location.services && Array.isArray(location.services)
            ? `<div class="popup-services">
                ${location.services.map(service =>
                    `<span class="popup-service-tag">${Utils.sanitizeHTML(service)}</span>`
                ).join('')}
               </div>`
            : '';

        const directionsUrl = Utils.getDirectionsUrl(location.address, location.city, location.lat, location.lng);

        // Determine popup type class
        let typeClass = '';
        if (location.type === 'Demo Center') {
            typeClass = 'demo-center';
        } else if (location.type === 'Outpost') {
            typeClass = 'outpost';
        }

        // Generate popup action buttons (with inline check for managers)
        const favoriteBtn = typeof FavoritesManager !== 'undefined' ?
            `<button class="popup-action-btn favorite-btn"
                    data-location-id="${location.id}"
                    onclick="FavoritesManager.toggleFavorite(${location.id})"
                    title="Add to favorites"
                    aria-label="Add to favorites">
            </button>` : '';

        const shareBtn = typeof SharingManager !== 'undefined' ?
            `<button class="popup-action-btn share-btn"
                    data-location-id="${location.id}"
                    data-location-name="${name}"
                    data-location-address="${address}"
                    onclick="SharingManager.handleShareClick(this)"
                    title="Share this location"
                    aria-label="Share ${name}">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
            </button>` : '';

        return `
            <div class="popup-content">
                <div class="popup-header">
                    <div>
                        <div class="popup-type ${typeClass}">${Utils.sanitizeHTML(location.type)}</div>
                        <div class="popup-name">${name}</div>
                    </div>
                    <div class="popup-actions">
                        ${favoriteBtn}
                        ${shareBtn}
                    </div>
                </div>
                <div class="popup-address">
                    ${address}<br>
                    ${city}
                </div>
                ${phone ? `<div class="popup-detail">${phone}</div>` : ''}
                ${hours ? `<div class="popup-detail">${hours}</div>` : ''}
                ${location.openingDate ? `<div class="popup-detail popup-date"><strong>Opened:</strong> ${new Date(location.openingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : '<div class="popup-detail popup-date popup-placeholder"><strong>Opened:</strong> Date TBD</div>'}
                ${servicesHtml}
                ${location.rivianUrl ? `<a href="${Utils.sanitizeHTML(location.rivianUrl)}" target="_blank" rel="noopener noreferrer" class="popup-rivian-link">View on Rivian.com →</a>` : '<div class="popup-detail popup-placeholder">Rivian.com link TBD</div>'}
                <button class="popup-button" style="margin-top: 0.75rem;" onclick="window.open('${directionsUrl}', '_blank')">
                    Get Directions
                </button>
            </div>
        `;
    },

    fitMapToLocations(locations) {
        try {
            if (!locations.length) return;

            const bounds = new mapboxgl.LngLatBounds();
            locations.forEach(location => {
                if (Utils.isValidCoordinate(location.lat, location.lng)) {
                    bounds.extend([location.lng, location.lat]);
                }
            });

            if (!bounds.isEmpty()) {
                AppState.map.fitBounds(bounds, { padding: 50 });
            }
        } catch (error) {
            console.error('Failed to fit map bounds:', error);
        }
    }
};

// Advanced Filter Management
const AdvancedFilterManager = {
    init() {
        this.populateStateCheckboxes();
        this.populateServiceCheckboxes();
        this.setupEventListeners();
    },

    populateStateCheckboxes() {
        try {
            const stateCheckboxes = document.getElementById('stateCheckboxes');
            if (!stateCheckboxes) return;

            const stateNames = {
                'AB': 'Alberta', 'AZ': 'Arizona', 'BC': 'British Columbia',
                'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut',
                'DC': 'Washington DC', 'FL': 'Florida', 'GA': 'Georgia',
                'HI': 'Hawaii', 'IA': 'Iowa', 'ID': 'Idaho', 'IL': 'Illinois',
                'IN': 'Indiana', 'KS': 'Kansas', 'KY': 'Kentucky',
                'MA': 'Massachusetts', 'MD': 'Maryland', 'MI': 'Michigan',
                'MN': 'Minnesota', 'MO': 'Missouri', 'MT': 'Montana',
                'NC': 'North Carolina', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
                'NV': 'Nevada', 'NY': 'New York', 'OH': 'Ohio', 'OK': 'Oklahoma',
                'ON': 'Ontario', 'OR': 'Oregon', 'PA': 'Pennsylvania',
                'QC': 'Quebec', 'SC': 'South Carolina', 'TN': 'Tennessee',
                'TX': 'Texas', 'UT': 'Utah', 'VA': 'Virginia',
                'WA': 'Washington', 'WI': 'Wisconsin'
            };

            const stateCounts = {};
            rivianLocations.forEach(loc => {
                stateCounts[loc.state] = (stateCounts[loc.state] || 0) + 1;
            });

            const states = Object.keys(stateCounts).sort();

            stateCheckboxes.innerHTML = states.map(state => `
                <div class="state-checkbox-item">
                    <input type="checkbox" id="state-${state}" value="${state}" class="state-checkbox" />
                    <label for="state-${state}" class="state-checkbox-label">
                        <span>${stateNames[state] || state}</span>
                        <span class="state-count">${stateCounts[state]}</span>
                    </label>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to populate state checkboxes:', error);
        }
    },

    populateServiceCheckboxes() {
        try {
            const serviceCheckboxes = document.getElementById('serviceCheckboxes');
            if (!serviceCheckboxes) return;

            const allServices = new Set();
            rivianLocations.forEach(loc => {
                if (loc.services && Array.isArray(loc.services)) {
                    loc.services.forEach(service => allServices.add(service));
                }
            });

            const services = Array.from(allServices).sort();

            serviceCheckboxes.innerHTML = services.map(service => `
                <div class="service-checkbox-item">
                    <input type="checkbox" id="service-${service.replace(/\s+/g, '-')}" value="${service}" class="service-checkbox" />
                    <label for="service-${service.replace(/\s+/g, '-')}" class="service-checkbox-label">
                        ${Utils.sanitizeHTML(service)}
                    </label>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to populate service checkboxes:', error);
        }
    },

    setupEventListeners() {
        // Toggle advanced filters panel
        const toggleBtn = document.getElementById('toggleAdvancedFilters');
        const panel = document.getElementById('advancedFiltersPanel');
        const toggleIcon = document.getElementById('toggleIcon');

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = panel.classList.contains('expanded');
                panel.classList.toggle('expanded');
                toggleBtn.setAttribute('aria-expanded', !isExpanded);
                if (toggleIcon) {
                    toggleIcon.classList.toggle('rotated', !isExpanded);
                }
            });
        }

        // State checkboxes
        document.querySelectorAll('.state-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedStates();
                LocationManager.filterLocations();
            });
        });

        // Select/Clear all states
        const selectAllStates = document.getElementById('selectAllStates');
        const clearAllStates = document.getElementById('clearAllStates');

        if (selectAllStates) {
            selectAllStates.addEventListener('click', () => {
                document.querySelectorAll('.state-checkbox').forEach(cb => cb.checked = true);
                this.updateSelectedStates();
                LocationManager.filterLocations();
            });
        }

        if (clearAllStates) {
            clearAllStates.addEventListener('click', () => {
                document.querySelectorAll('.state-checkbox').forEach(cb => cb.checked = false);
                this.updateSelectedStates();
                LocationManager.filterLocations();
            });
        }

        // Service checkboxes
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedServices();
                LocationManager.filterLocations();
            });
        });

        // Date filters
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');

        if (dateFrom) {
            dateFrom.addEventListener('change', (e) => {
                AppState.dateFrom = e.target.value ? new Date(e.target.value) : null;
                LocationManager.filterLocations();
            });
        }

        if (dateTo) {
            dateTo.addEventListener('change', (e) => {
                AppState.dateTo = e.target.value ? new Date(e.target.value) : null;
                LocationManager.filterLocations();
            });
        }

        // Date presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyDatePreset(preset);

                // Update active state
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Distance filter
        const enableDistanceBtn = document.getElementById('enableDistanceFilter');
        const distanceSliderContainer = document.getElementById('distanceSliderContainer');
        const distanceSlider = document.getElementById('distanceSlider');
        const distanceValue = document.getElementById('distanceValue');

        if (enableDistanceBtn) {
            enableDistanceBtn.addEventListener('click', () => {
                if (!AppState.distanceEnabled) {
                    this.enableDistanceFilter();
                } else {
                    this.disableDistanceFilter();
                }
            });
        }

        if (distanceSlider && distanceValue) {
            distanceSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                distanceValue.textContent = value;
                AppState.distanceRadius = parseInt(value);
                if (AppState.distanceEnabled) {
                    LocationManager.filterLocations();
                }
            });
        }

        // Clear all filters
        const clearAllFilters = document.getElementById('clearAllFilters');
        if (clearAllFilters) {
            clearAllFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    },

    updateSelectedStates() {
        AppState.selectedStates = Array.from(document.querySelectorAll('.state-checkbox:checked'))
            .map(cb => cb.value);
        this.updateFilterBadge();
    },

    updateSelectedServices() {
        AppState.selectedServices = Array.from(document.querySelectorAll('.service-checkbox:checked'))
            .map(cb => cb.value);
        this.updateFilterBadge();
    },

    updateFilterBadge() {
        const badge = document.getElementById('activeFilterBadge');
        if (!badge) return;

        let count = 0;
        if (AppState.selectedStates.length > 0) count++;
        if (AppState.selectedServices.length > 0) count++;
        if (AppState.dateFrom || AppState.dateTo) count++;
        if (AppState.distanceEnabled) count++;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    applyDatePreset(preset) {
        const today = new Date();
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');

        if (preset === 'opening-soon') {
            // Locations opening in the future
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const threeMonthsLater = new Date(today);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

            if (dateFrom) {
                dateFrom.value = tomorrow.toISOString().split('T')[0];
                AppState.dateFrom = tomorrow;
            }
            if (dateTo) {
                dateTo.value = threeMonthsLater.toISOString().split('T')[0];
                AppState.dateTo = threeMonthsLater;
            }
        } else if (preset === 'recently-opened') {
            // Locations opened in the last 6 months
            const sixMonthsAgo = new Date(today);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            if (dateFrom) {
                dateFrom.value = sixMonthsAgo.toISOString().split('T')[0];
                AppState.dateFrom = sixMonthsAgo;
            }
            if (dateTo) {
                dateTo.value = today.toISOString().split('T')[0];
                AppState.dateTo = today;
            }
        }

        LocationManager.filterLocations();
    },

    enableDistanceFilter() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        const enableBtn = document.getElementById('enableDistanceFilter');
        const sliderContainer = document.getElementById('distanceSliderContainer');

        enableBtn.textContent = 'Getting location...';
        enableBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                AppState.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                AppState.distanceEnabled = true;

                enableBtn.textContent = 'Location Enabled';
                enableBtn.classList.add('active');
                enableBtn.disabled = false;

                if (sliderContainer) {
                    sliderContainer.style.display = 'block';
                }

                this.updateFilterBadge();
                LocationManager.filterLocations();
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable location services.');
                enableBtn.textContent = 'Enable Location';
                enableBtn.disabled = false;
            }
        );
    },

    disableDistanceFilter() {
        AppState.distanceEnabled = false;
        AppState.userLocation = null;

        const enableBtn = document.getElementById('enableDistanceFilter');
        const sliderContainer = document.getElementById('distanceSliderContainer');

        if (enableBtn) {
            enableBtn.textContent = 'Enable Location';
            enableBtn.classList.remove('active');
        }

        if (sliderContainer) {
            sliderContainer.style.display = 'none';
        }

        this.updateFilterBadge();
        LocationManager.filterLocations();
    },

    clearAllFilters() {
        // Clear state checkboxes
        document.querySelectorAll('.state-checkbox').forEach(cb => cb.checked = false);
        AppState.selectedStates = [];

        // Clear service checkboxes
        document.querySelectorAll('.service-checkbox').forEach(cb => cb.checked = false);
        AppState.selectedServices = [];

        // Clear date filters
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom) {
            dateFrom.value = '';
            AppState.dateFrom = null;
        }
        if (dateTo) {
            dateTo.value = '';
            AppState.dateTo = null;
        }

        // Clear date preset active state
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

        // Disable distance filter
        if (AppState.distanceEnabled) {
            this.disableDistanceFilter();
        }

        // Reset basic filters
        AppState.currentFilter = 'all';
        AppState.currentStateFilter = 'all';
        AppState.searchTerm = '';

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });

        // Reset quick filters
        AppState.openNowFilter = false;
        AppState.comingSoonFilter = false;
        if (typeof OpenNowFilter !== 'undefined') {
            OpenNowFilter.updateUI();
        }
        if (typeof ComingSoonFilter !== 'undefined') {
            ComingSoonFilter.updateUI();
        }

        this.updateFilterBadge();
        LocationManager.filterLocations();
    }
};

// Location filtering and management
const LocationManager = {
    filterLocations() {
        try {
            if (!rivianLocations || !Array.isArray(rivianLocations)) {
                throw new Error('Location data not available');
            }

            const filtered = rivianLocations.filter(location => {
                // Basic type filter
                const matchesFilter = AppState.currentFilter === 'all' || location.type === AppState.currentFilter;

                // Legacy state filter (for backward compatibility)
                const matchesState = AppState.currentStateFilter === 'all' || location.state === AppState.currentStateFilter;

                // Search term matching
                const searchLower = AppState.searchTerm.toLowerCase().trim();
                const matchesSearch = searchLower === '' || [
                    location.name, location.city, location.state, location.address
                ].some(field => field && field.toLowerCase().includes(searchLower));

                // Advanced state filter (multi-select)
                const matchesAdvancedState = AppState.selectedStates.length === 0 ||
                    AppState.selectedStates.includes(location.state);

                // Services filter
                const matchesServices = AppState.selectedServices.length === 0 ||
                    (location.services && Array.isArray(location.services) &&
                     AppState.selectedServices.some(service => location.services.includes(service)));

                // Date range filter
                let matchesDateRange = true;
                if (AppState.dateFrom || AppState.dateTo) {
                    if (location.openingDate) {
                        const locationDate = new Date(location.openingDate);
                        if (AppState.dateFrom && locationDate < AppState.dateFrom) {
                            matchesDateRange = false;
                        }
                        if (AppState.dateTo && locationDate > AppState.dateTo) {
                            matchesDateRange = false;
                        }
                    } else {
                        // If location has no opening date, exclude it from date filter
                        matchesDateRange = false;
                    }
                }

                // Distance filter (user location)
                let matchesDistance = true;
                if (AppState.distanceEnabled && AppState.userLocation) {
                    const distance = this.calculateDistance(
                        AppState.userLocation.lat,
                        AppState.userLocation.lng,
                        location.lat,
                        location.lng
                    );
                    matchesDistance = distance <= AppState.distanceRadius;
                }

                // Geocoded location proximity filter (100 mile radius)
                let matchesGeocode = true;
                if (GeocodeManager.geocodedLocation) {
                    const distanceFromGeocode = this.calculateDistance(
                        GeocodeManager.geocodedLocation.lat,
                        GeocodeManager.geocodedLocation.lng,
                        location.lat,
                        location.lng
                    );
                    matchesGeocode = distanceFromGeocode <= 100; // 100 mile radius
                }

                // Open Now filter
                let matchesOpenNow = true;
                if (AppState.openNowFilter) {
                    const isOpen = typeof OpenNowFilter !== 'undefined' ?
                        OpenNowFilter.isLocationOpen(location) : null;
                    // Only include if definitely open (true), exclude if closed (false) or unknown (null)
                    matchesOpenNow = isOpen === true;
                }

                // Coming Soon filter
                let matchesComingSoon = true;
                if (AppState.comingSoonFilter) {
                    const isComingSoon = typeof ComingSoonFilter !== 'undefined' ?
                        ComingSoonFilter.isComingSoon(location) : false;
                    matchesComingSoon = isComingSoon;
                }

                // Combine all filters with AND logic
                return matchesFilter && matchesState && matchesSearch &&
                       matchesAdvancedState && matchesServices &&
                       matchesDateRange && matchesDistance && matchesGeocode &&
                       matchesOpenNow && matchesComingSoon;
            });

            this.renderLocationList(filtered);
            this.updateStats(filtered);
            this.updateMapMarkers(filtered);

            // Auto-zoom for state filter
            if ((AppState.currentStateFilter !== 'all' || AppState.selectedStates.length > 0) && filtered.length > 0) {
                MapManager.fitMapToLocations(filtered);
            }
        } catch (error) {
            console.error('Failed to filter locations:', error);
            Utils.showError('Failed to filter locations', document.getElementById('locationList'));
        }
    },

    renderLocationList(locations) {
        const listEl = document.getElementById('locationList');
        if (!listEl) return;

        try {
            if (locations.length === 0) {
                listEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No locations found</div>';
                return;
            }

            listEl.innerHTML = locations.map(location => {
                const servicesHtml = location.services && Array.isArray(location.services)
                    ? `<div class="location-services">
                        ${location.services.map(service =>
                            `<span class="service-tag">${Utils.sanitizeHTML(service)}</span>`
                        ).join('')}
                       </div>`
                    : '';

                // Determine location type class
                let typeClass = '';
                if (location.type === 'Demo Center') {
                    typeClass = 'demo-center';
                } else if (location.type === 'Outpost') {
                    typeClass = 'outpost';
                }

                // Format opening date for display
                const openingDateDisplay = location.openingDate
                    ? new Date(location.openingDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                    : 'Opening date TBD';

                // Calculate distance badge if user location is available
                let distanceBadgeHtml = '';
                if (AppState.userLocation) {
                    const distance = this.calculateDistance(
                        AppState.userLocation.lat,
                        AppState.userLocation.lng,
                        location.lat,
                        location.lng
                    );
                    // Color code: near (<10mi), medium (10-50mi), far (>50mi)
                    const distanceClass = distance < 10 ? 'near' : distance < 50 ? 'medium' : 'far';
                    distanceBadgeHtml = `<div class="distance-badge ${distanceClass}">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        ${distance.toFixed(1)} mi
                    </div>`;
                }

                // Generate card action buttons (using inline check for managers)
                const favoriteBtn = typeof FavoritesManager !== 'undefined' ?
                    `<button class="favorite-btn"
                            data-location-id="${location.id}"
                            onclick="event.stopPropagation(); FavoritesManager.toggleFavorite(${location.id})"
                            title="Add to favorites"
                            aria-label="Add to favorites">
                    </button>` : '';

                const shareBtn = typeof SharingManager !== 'undefined' ?
                    SharingManager.getShareButtonHTML(location) : '';

                return `
                    <div class="location-card" onclick="LocationManager.flyToLocation(${location.lng}, ${location.lat}, ${location.id})">
                        ${distanceBadgeHtml}
                        <div class="location-card-header">
                            <div class="location-type ${typeClass}">${Utils.sanitizeHTML(location.type)}</div>
                            <div class="location-card-actions">
                                ${favoriteBtn}
                                ${shareBtn}
                            </div>
                        </div>
                        <div class="location-name">${Utils.sanitizeHTML(location.name)}</div>
                        <div class="location-address">
                            ${Utils.sanitizeHTML(location.address)}<br>
                            ${Utils.sanitizeHTML(location.city)}
                        </div>
                        ${location.hours ? `<div class="location-hours ${location.isOpen === false ? 'location-closed' : ''}">${Utils.sanitizeHTML(location.hours)}</div>` : ''}
                        <div class="location-opening-date">
                            <strong>Opened:</strong> ${openingDateDisplay}
                        </div>
                        ${location.rivianUrl ? `<div class="location-rivian-link">
                            <a href="${Utils.sanitizeHTML(location.rivianUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                                View on Rivian.com →
                            </a>
                        </div>` : `<div class="location-rivian-link">
                            <span class="rivian-link-placeholder">Rivian.com link TBD</span>
                        </div>`}
                        ${servicesHtml}
                        <button class="card-directions-btn" onclick="event.stopPropagation(); window.open('${Utils.getDirectionsUrl(location.address, location.city, location.lat, location.lng)}', '_blank')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>
                            </svg>
                            Get Directions
                        </button>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to render location list:', error);
            Utils.showError('Failed to display locations', listEl);
        }
    },

    updateStats(locations) {
        try {
            const statsEl = document.getElementById('locationStats');
            if (!statsEl) return;

            const spaces = locations.filter(l => l.type === 'Space').length;
            const demoCenters = locations.filter(l => l.type === 'Demo Center').length;
            const outposts = locations.filter(l => l.type === 'Outpost').length;

            statsEl.innerHTML = `
                Showing ${locations.length} locations • ${spaces} Spaces • ${demoCenters} Demo Centers • ${outposts} Outposts
            `;
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    },

    updateMapMarkers(filteredLocations) {
        try {
            // Update GeoJSON source with filtered locations
            if (AppState.map.getSource('locations')) {
                const geojsonData = {
                    type: 'FeatureCollection',
                    features: filteredLocations
                        .filter(location => Utils.isValidCoordinate(location.lat, location.lng))
                        .map(location => ({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [location.lng, location.lat]
                            },
                            properties: {
                                id: location.id,
                                name: location.name,
                                type: location.type,
                                address: location.address,
                                city: location.city,
                                state: location.state,
                                phone: location.phone || '',
                                hours: location.hours || '',
                                openingDate: location.openingDate || '',
                                rivianUrl: location.rivianUrl || '',
                                services: JSON.stringify(location.services || []),
                                isOpen: location.isOpen !== false
                            }
                        }))
                };

                AppState.map.getSource('locations').setData(geojsonData);
            }
        } catch (error) {
            console.error('Failed to update map markers:', error);
        }
    },

    flyToLocation(lng, lat, id) {
        try {
            if (!Utils.isValidCoordinate(lat, lng)) {
                throw new Error('Invalid coordinates');
            }

            AppState.map.flyTo({
                center: [lng, lat],
                zoom: 15, // Zoom in enough to see individual marker
                duration: 1500
            });

            this.highlightLocation(id);

            // Open popup after animation completes
            setTimeout(() => {
                const location = rivianLocations.find(l => l.id === id);
                if (location) {
                    const popupContent = MapManager.createPopupContent(location);
                    new mapboxgl.Popup({ offset: 25 })
                        .setLngLat([lng, lat])
                        .setHTML(popupContent)
                        .addTo(AppState.map);
                }
            }, 1600);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                UIManager.closeSidebar();
            }
        } catch (error) {
            console.error('Failed to fly to location:', error);
        }
    },

    highlightLocation(id) {
        try {
            // Remove existing highlights
            document.querySelectorAll('.location-card').forEach(card => {
                card.classList.remove('active');
            });

            // Find and highlight new location
            const cards = document.querySelectorAll('.location-card');
            const index = rivianLocations.findIndex(l => l.id === id);
            if (cards[index]) {
                cards[index].classList.add('active');
                cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (error) {
            console.error('Failed to highlight location:', error);
        }
    },

    findNearestLocation(userLat, userLng) {
        try {
            if (!Utils.isValidCoordinate(userLat, userLng)) {
                throw new Error('Invalid user coordinates');
            }

            let nearest = null;
            let minDistance = Infinity;

            rivianLocations.forEach(location => {
                if (Utils.isValidCoordinate(location.lat, location.lng)) {
                    const distance = this.calculateDistance(userLat, userLng, location.lat, location.lng);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = location;
                    }
                }
            });

            if (nearest) {
                this.flyToLocation(nearest.lng, nearest.lat, nearest.id);
                if (window.innerWidth <= 768) {
                    alert(`Nearest location: ${nearest.name}\\nDistance: ${minDistance.toFixed(1)} miles`);
                }
            } else {
                throw new Error('No locations found');
            }
        } catch (error) {
            console.error('Failed to find nearest location:', error);
            alert('Unable to find nearest location. Please try again.');
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Radius of Earth in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
};

// Bottom Sheet Manager for mobile
const BottomSheetManager = {
    startY: 0,
    currentY: 0,
    isDragging: false,
    sheetHeight: 0,

    init() {
        if (window.innerWidth > 768) return; // Only on mobile

        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        this.sheetHeight = sidebar.offsetHeight;

        // Touch events for drag handle area (top of sheet)
        sidebar.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        sidebar.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        sidebar.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    },

    handleTouchStart(e) {
        // Only start drag if touching near the top (drag handle area)
        const touch = e.touches[0];
        const sidebar = document.getElementById('sidebar');
        const rect = sidebar.getBoundingClientRect();

        // Allow drag from top 60px of visible sheet
        if (touch.clientY < rect.top + 60) {
            this.isDragging = true;
            this.startY = touch.clientY;
            sidebar.style.transition = 'none';
        }
    },

    handleTouchMove(e) {
        if (!this.isDragging) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - this.startY;
        const sidebar = document.getElementById('sidebar');

        // Limit upward drag
        const newTransform = Math.max(0, deltaY);
        sidebar.style.transform = `translateY(${newTransform}px)`;

        e.preventDefault();
    },

    handleTouchEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const sidebar = document.getElementById('sidebar');
        sidebar.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';

        const touch = e.changedTouches[0];
        const deltaY = touch.clientY - this.startY;
        const velocity = deltaY / 100; // Rough velocity estimate

        // Snap points: 0 = full, 50% = half, 100% = collapsed
        if (deltaY > 150 || velocity > 1) {
            // Swipe down - close or half
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebar.classList.add('collapsed');
            }
        } else if (deltaY < -50 || velocity < -1) {
            // Swipe up - open
            sidebar.classList.add('active');
            sidebar.classList.remove('collapsed', 'half-open');
        }

        // Reset inline transform
        sidebar.style.transform = '';
    },

    openFull() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            sidebar.classList.remove('collapsed', 'half-open');
        }
    },

    collapse() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active', 'half-open');
            sidebar.classList.add('collapsed');
        }
    }
};

// UI Management
const UIManager = {
    openSidebar() {
        try {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');
            if (sidebar) sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');

            // On mobile, ensure bottom sheet is fully open
            if (window.innerWidth <= 768) {
                BottomSheetManager.openFull();
            }
        } catch (error) {
            console.error('Failed to open sidebar:', error);
        }
    },

    closeSidebar() {
        try {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');

            // On mobile, collapse to bottom
            if (window.innerWidth <= 768) {
                BottomSheetManager.collapse();
            }
        } catch (error) {
            console.error('Failed to close sidebar:', error);
        }
    },

    getUserLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                try {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    // Add or update user marker
                    if (AppState.userMarker) {
                        AppState.userMarker.setLngLat([userLng, userLat]);
                    } else {
                        AppState.userMarker = new mapboxgl.Marker({ color: '#78BE21' })
                            .setLngLat([userLng, userLat])
                            .setPopup(new mapboxgl.Popup().setHTML('<div style="padding: 0.5rem;">Your Location</div>'))
                            .addTo(AppState.map);
                    }

                    AppState.map.flyTo({
                        center: [userLng, userLat],
                        zoom: 10
                    });
                } catch (error) {
                    console.error('Failed to process user location:', error);
                    alert('Failed to process your location. Please try again.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable location services.');
            }
        );
    }
};

// Global functions for external access
window.showStats = function() {
    try {
        const states = [...new Set(rivianLocations.map(l => l.state))].length;
        const spaces = rivianLocations.filter(l => l.type === 'Space').length;
        const demoCenters = rivianLocations.filter(l => l.type === 'Demo Center').length;
        const outposts = rivianLocations.filter(l => l.type === 'Outpost').length;
        const open = rivianLocations.filter(l => l.isOpen !== false).length;

        alert(`Rivian Spotter Statistics\\n\\nTotal Locations: ${rivianLocations.length}\\nStates/Provinces: ${states}\\nSpaces: ${spaces}\\nDemo Centers: ${demoCenters}\\nOutposts: ${outposts}\\nCurrently Open: ${open}`);
    } catch (error) {
        console.error('Failed to show stats:', error);
        alert('Unable to load statistics.');
    }
};

// Make LocationManager methods globally accessible
window.LocationManager = LocationManager;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Show initial loading state
    Utils.showLoading(document.getElementById('locationList'), 'Loading locations...');

    // Wait for components to initialize
    setTimeout(async () => {
        try {
            // Check for required dependencies
            if (typeof mapboxgl === 'undefined') {
                throw new Error('Mapbox GL JS not loaded');
            }
            if (!rivianLocations) {
                throw new Error('Location data not loaded');
            }

            // Initialize map
            await MapManager.initMap();

            // Initialize advanced filters
            AdvancedFilterManager.init();

            LocationManager.filterLocations();

            // Set up event handlers with debounced search (with geocoding support)
            const debouncedSearch = Utils.debounce(async (searchTerm) => {
                AppState.searchTerm = searchTerm;

                // Check if this looks like an address/zip query
                if (GeocodeManager.isAddressQuery(searchTerm) && searchTerm.length >= 5) {
                    const result = await GeocodeManager.geocode(searchTerm);
                    if (result) {
                        GeocodeManager.geocodedLocation = result;
                        GeocodeManager.lastQuery = searchTerm;
                        GeocodeManager.updateIndicator(result.placeName);

                        // Fly to the geocoded location
                        AppState.map.flyTo({
                            center: [result.lng, result.lat],
                            zoom: 10
                        });
                    }
                } else if (searchTerm.length < 3) {
                    GeocodeManager.clear();
                }

                LocationManager.filterLocations();
            }, 500);

            // Search input handler
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    debouncedSearch(e.target.value);
                });
            }

            // State filter handler
            const stateFilter = document.getElementById('stateFilter');
            if (stateFilter) {
                stateFilter.addEventListener('change', (e) => {
                    AppState.currentStateFilter = e.target.value;
                    LocationManager.filterLocations();
                });
            }

            // Filter button handlers
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    AppState.currentFilter = this.dataset.filter;
                    LocationManager.filterLocations();
                });
            });

            // Mobile bottom bar handlers
            const mobileFilterBtn = document.getElementById('mobileFilterBtn');
            if (mobileFilterBtn) {
                mobileFilterBtn.addEventListener('click', UIManager.openSidebar);
            }

            const mobileListBtn = document.getElementById('mobileListBtn');
            if (mobileListBtn) {
                mobileListBtn.addEventListener('click', () => {
                    UIManager.openSidebar();
                    setTimeout(() => {
                        const locationList = document.querySelector('.location-list');
                        if (locationList) {
                            locationList.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 300);
                });
            }

            const mobileNearMeBtn = document.getElementById('mobileNearMeBtn');
            if (mobileNearMeBtn) {
                mobileNearMeBtn.addEventListener('click', () => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            LocationManager.findNearestLocation(
                                position.coords.latitude,
                                position.coords.longitude
                            );
                        },
                        (error) => {
                            console.error('Geolocation error:', error);
                            alert('Unable to get your location. Please enable location services.');
                        }
                    );
                });
            }

            // Sidebar controls
            const closeSidebar = document.getElementById('closeSidebar');
            if (closeSidebar) {
                closeSidebar.addEventListener('click', UIManager.closeSidebar);
            }

            const mobileOverlay = document.getElementById('mobileOverlay');
            if (mobileOverlay) {
                mobileOverlay.addEventListener('click', UIManager.closeSidebar);
            }

            // Initialize bottom sheet for mobile
            BottomSheetManager.init();

            // Location button
            const locationBtn = document.getElementById('locationBtn');
            if (locationBtn) {
                locationBtn.addEventListener('click', UIManager.getUserLocation);
            }

            // Collapsible sections toggle
            const actionsToggle = document.getElementById('actionsToggle');
            const actionsContent = document.getElementById('actionsContent');
            if (actionsToggle && actionsContent) {
                actionsToggle.addEventListener('click', () => {
                    const isExpanded = actionsToggle.getAttribute('aria-expanded') === 'true';
                    actionsToggle.setAttribute('aria-expanded', !isExpanded);
                    if (isExpanded) {
                        actionsContent.setAttribute('hidden', '');
                    } else {
                        actionsContent.removeAttribute('hidden');
                    }
                });
            }

        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showError('Failed to initialize application: ' + error.message,
                document.getElementById('locationList'));
        }
    }, 100);
});