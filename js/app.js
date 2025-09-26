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
    searchTimeout: null
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
    }
};

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

            // Initialize map
            AppState.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: [-98.5795, 39.8283], // Center of USA
                zoom: 4
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
                'CA': 'California', 'CO': 'Colorado', 'FL': 'Florida',
                'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
                'IL': 'Illinois', 'KS': 'Kansas', 'MD': 'Maryland',
                'MA': 'Massachusetts', 'MI': 'Michigan', 'MO': 'Missouri',
                'MT': 'Montana', 'NV': 'Nevada', 'NJ': 'New Jersey',
                'NY': 'New York', 'ON': 'Ontario', 'OR': 'Oregon',
                'QC': 'Quebec', 'TN': 'Tennessee', 'TX': 'Texas',
                'UT': 'Utah', 'VA': 'Virginia', 'WA': 'Washington',
                'WI': 'Wisconsin'
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

    addMarkers(locations) {
        try {
            // Clear existing markers
            AppState.markers.forEach(({marker}) => marker.remove());
            AppState.markers = [];

            locations.forEach(location => {
                // Validate location data
                if (!Utils.isValidCoordinate(location.lat, location.lng)) {
                    console.warn('Invalid coordinates for location:', location.name);
                    return;
                }

                // Create marker element with specific styling for each type
                const el = document.createElement('div');
                let markerClass = 'marker';
                if (location.type === 'Demo Center') {
                    markerClass += ' demo-center';
                } else if (location.type === 'Outpost') {
                    markerClass += ' outpost';
                } else {
                    markerClass += ' space';
                }
                el.className = markerClass;

                // Set icon based on location type
                let iconPath = '';
                if (location.type === 'Space') {
                    // Building/store icon for Spaces
                    iconPath = '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>';
                } else if (location.type === 'Demo Center') {
                    // Directions/navigation icon for Demo Centers
                    iconPath = '<path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>';
                } else if (location.type === 'Outpost') {
                    // Charging station/electric icon for Outposts
                    iconPath = '<path d="M14.5 11l-3 6v-4h-2l3-6v4h2zm3.5 6h-2v-6h2v6zm2-6v8c0 1.1-.9 2-2 2h-2c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v6h2c1.1 0 2 .9 2 2z"/>';
                }

                el.innerHTML = `
                    <svg class="marker-icon" viewBox="0 0 24 24">
                        ${iconPath}
                    </svg>
                `;

                // Create popup content
                const popupContent = this.createPopupContent(location);
                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

                // Add marker to map
                const marker = new mapboxgl.Marker(el)
                    .setLngLat([location.lng, location.lat])
                    .setPopup(popup)
                    .addTo(AppState.map);

                // Add click handler
                el.addEventListener('click', () => {
                    LocationManager.highlightLocation(location.id);
                });

                AppState.markers.push({ marker, location });
            });
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

        const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(location.address + ' ' + location.city)}`;

        // Determine popup type class
        let typeClass = '';
        if (location.type === 'Demo Center') {
            typeClass = 'demo-center';
        } else if (location.type === 'Outpost') {
            typeClass = 'outpost';
        }

        return `
            <div class="popup-content">
                <div class="popup-type ${typeClass}">${Utils.sanitizeHTML(location.type)}</div>
                <div class="popup-name">${name}</div>
                <div class="popup-address">
                    ${address}<br>
                    ${city}
                </div>
                ${phone ? `<div style="font-size: 0.85rem; color: #666;">${phone}</div>` : ''}
                ${hours ? `<div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">${hours}</div>` : ''}
                ${location.openingDate ? `<div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;"><strong>Opened:</strong> ${new Date(location.openingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : '<div style="font-size: 0.8rem; color: #999; margin-top: 0.5rem; font-style: italic;"><strong>Opened:</strong> Date TBD</div>'}
                ${servicesHtml}
                ${location.rivianUrl ? `<a href="${Utils.sanitizeHTML(location.rivianUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 0.5rem; color: #1976D2; text-decoration: none; font-size: 0.85rem; font-weight: 500;">View on Rivian.com →</a>` : '<div style="font-size: 0.85rem; color: #999; margin-top: 0.5rem; font-style: italic;">Rivian.com link TBD</div>'}
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

// Location filtering and management
const LocationManager = {
    filterLocations() {
        try {
            if (!rivianLocations || !Array.isArray(rivianLocations)) {
                throw new Error('Location data not available');
            }

            const filtered = rivianLocations.filter(location => {
                const matchesFilter = AppState.currentFilter === 'all' || location.type === AppState.currentFilter;
                const matchesState = AppState.currentStateFilter === 'all' || location.state === AppState.currentStateFilter;

                // Safe search term matching
                const searchLower = AppState.searchTerm.toLowerCase().trim();
                const matchesSearch = searchLower === '' || [
                    location.name, location.city, location.state, location.address
                ].some(field => field && field.toLowerCase().includes(searchLower));

                return matchesFilter && matchesState && matchesSearch;
            });

            this.renderLocationList(filtered);
            this.updateStats(filtered);
            this.updateMapMarkers(filtered);

            // Auto-zoom for state filter
            if (AppState.currentStateFilter !== 'all' && filtered.length > 0) {
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

                return `
                    <div class="location-card" onclick="LocationManager.flyToLocation(${location.lng}, ${location.lat}, ${location.id})">
                        <div class="location-type ${typeClass}">${Utils.sanitizeHTML(location.type)}</div>
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
            AppState.markers.forEach(({ marker, location }) => {
                const isVisible = filteredLocations.some(loc => loc.id === location.id);
                const element = marker.getElement();
                if (element) {
                    element.style.display = isVisible ? 'flex' : 'none';
                }
            });
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
                zoom: 13,
                duration: 1500
            });

            this.highlightLocation(id);

            // Open popup
            const markerData = AppState.markers.find(m => m.location.id === id);
            if (markerData) {
                markerData.marker.togglePopup();
            }

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

// UI Management
const UIManager = {
    openSidebar() {
        try {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');
            if (sidebar) sidebar.classList.add('active');
            if (overlay) overlay.classList.add('active');
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
                        AppState.userMarker = new mapboxgl.Marker({ color: '#4CAF50' })
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

    // Function to wait for all dependencies
    function waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 150; // 15 seconds maximum wait for production

            function check() {
                attempts++;
                if (attempts % 10 === 0) { // Log every second instead of every 100ms
                    console.log(`Dependency check attempt ${attempts}/${maxAttempts}`);
                }

                // Check for required dependencies
                if (typeof mapboxgl === 'undefined') {
                    if (attempts % 10 === 0) console.log('Mapbox GL JS not loaded yet');
                } else if (typeof rivianLocations === 'undefined') {
                    if (attempts % 10 === 0) console.log('Location data not loaded yet');
                } else if (!Array.isArray(rivianLocations) || rivianLocations.length === 0) {
                    console.log('Location data is invalid or empty:', rivianLocations);
                } else {
                    console.log(`All dependencies loaded successfully - found ${rivianLocations.length} locations`);
                    resolve();
                    return;
                }

                if (attempts >= maxAttempts) {
                    console.error('Dependency loading failed:', {
                        mapboxgl: typeof mapboxgl,
                        rivianLocations: typeof rivianLocations,
                        rivianLocationsLength: Array.isArray(rivianLocations) ? rivianLocations.length : 'N/A'
                    });
                    reject(new Error('Dependencies failed to load within timeout'));
                    return;
                }

                setTimeout(check, 100);
            }

            check();
        });
    }

    // Wait for all dependencies then initialize
    waitForDependencies().then(async () => {
        try {

            // Initialize map
            await MapManager.initMap();
            LocationManager.filterLocations();

            // Set up event handlers with debounced search
            const debouncedSearch = Utils.debounce((searchTerm) => {
                AppState.searchTerm = searchTerm;
                LocationManager.filterLocations();
            }, 300);

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

            // Location button
            const locationBtn = document.getElementById('locationBtn');
            if (locationBtn) {
                locationBtn.addEventListener('click', UIManager.getUserLocation);
            }

        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showError('Failed to initialize application: ' + error.message,
                document.getElementById('locationList'));
        }
    }).catch(error => {
        console.error('Failed to load dependencies:', error);
        Utils.showError('Failed to initialize application: ' + error.message,
            document.getElementById('locationList'));
    });
});