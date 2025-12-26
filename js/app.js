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
            // Clear existing markers if any
            if (AppState.markers.length > 0) {
                AppState.markers.forEach(({marker}) => marker.remove());
                AppState.markers = [];
            }

            // Remove existing sources and layers if they exist
            if (AppState.map.getSource('locations')) {
                // Remove layers first
                if (AppState.map.getLayer('clusters')) AppState.map.removeLayer('clusters');
                if (AppState.map.getLayer('cluster-count')) AppState.map.removeLayer('cluster-count');
                if (AppState.map.getLayer('unclustered-space')) AppState.map.removeLayer('unclustered-space');
                if (AppState.map.getLayer('unclustered-demo')) AppState.map.removeLayer('unclustered-demo');
                if (AppState.map.getLayer('unclustered-outpost')) AppState.map.removeLayer('unclustered-outpost');
                // Remove source
                AppState.map.removeSource('locations');
            }

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
                        '#4CAF50',  // Small clusters (< 10) - Green
                        10,
                        '#1976D2',  // Medium clusters (10-50) - Blue
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

            // Add individual marker layers for each location type
            // Spaces (green)
            AppState.map.addLayer({
                id: 'unclustered-space',
                type: 'circle',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Space']
                ],
                paint: {
                    'circle-color': '#4CAF50',
                    'circle-radius': 10,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });

            // Demo Centers (blue)
            AppState.map.addLayer({
                id: 'unclustered-demo',
                type: 'circle',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Demo Center']
                ],
                paint: {
                    'circle-color': '#1976D2',
                    'circle-radius': 10,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });

            // Outposts (orange)
            AppState.map.addLayer({
                id: 'unclustered-outpost',
                type: 'circle',
                source: 'locations',
                filter: ['all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'type'], 'Outpost']
                ],
                paint: {
                    'circle-color': '#FF9800',
                    'circle-radius': 10,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
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
            const markerLayers = ['unclustered-space', 'unclustered-demo', 'unclustered-outpost'];

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

        const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(location.address + ' ' + location.city)}`;

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
                'CA': 'California', 'CO': 'Colorado', 'FL': 'Florida',
                'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
                'IL': 'Illinois', 'KS': 'Kansas', 'MD': 'Maryland',
                'MA': 'Massachusetts', 'MI': 'Michigan', 'MO': 'Missouri',
                'MT': 'Montana', 'NV': 'Nevada', 'NJ': 'New Jersey',
                'NY': 'New York', 'ON': 'Ontario', 'OR': 'Oregon',
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
                const isExpanded = panel.style.display === 'block';
                panel.style.display = isExpanded ? 'none' : 'block';
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

                // Distance filter
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
                       matchesDateRange && matchesDistance &&
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

                // Calculate distance if location filter is enabled
                let distanceHtml = '';
                if (AppState.distanceEnabled && AppState.userLocation) {
                    const distance = this.calculateDistance(
                        AppState.userLocation.lat,
                        AppState.userLocation.lng,
                        location.lat,
                        location.lng
                    );
                    distanceHtml = `<div class="location-distance">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#4CAF50" style="vertical-align: middle; margin-right: 4px;">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        ${distance.toFixed(1)} miles away
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
                        <div class="location-card-header">
                            <div class="location-type ${typeClass}">${Utils.sanitizeHTML(location.type)}</div>
                            <div class="location-card-actions">
                                ${favoriteBtn}
                                ${shareBtn}
                            </div>
                        </div>
                        <div class="location-name">${Utils.sanitizeHTML(location.name)}</div>
                        ${distanceHtml}
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