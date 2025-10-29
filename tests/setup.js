// tests/setup.js - Test environment setup

// Mock Mapbox GL JS
global.mapboxgl = {
    Map: jest.fn(() => ({
        on: jest.fn(),
        addControl: jest.fn(),
        addSource: jest.fn(),
        addLayer: jest.fn(),
        getSource: jest.fn(() => ({
            setData: jest.fn(),
            getClusterExpansionZoom: jest.fn((clusterId, callback) => callback(null, 10))
        })),
        getLayer: jest.fn(),
        removeLayer: jest.fn(),
        removeSource: jest.fn(),
        flyTo: jest.fn(),
        fitBounds: jest.fn(),
        easeTo: jest.fn(),
        queryRenderedFeatures: jest.fn(() => []),
        getCanvas: jest.fn(() => ({
            style: {}
        }))
    })),
    NavigationControl: jest.fn(),
    GeolocateControl: jest.fn(),
    Marker: jest.fn(() => ({
        setLngLat: jest.fn().mockReturnThis(),
        setPopup: jest.fn().mockReturnThis(),
        addTo: jest.fn().mockReturnThis(),
        remove: jest.fn()
    })),
    Popup: jest.fn(() => ({
        setLngLat: jest.fn().mockReturnThis(),
        setHTML: jest.fn().mockReturnThis(),
        addTo: jest.fn().mockReturnThis()
    })),
    LngLatBounds: jest.fn(() => ({
        extend: jest.fn(),
        isEmpty: jest.fn(() => false)
    }))
};

// Mock window.RivianSpotterConfig
global.RivianSpotterConfig = {
    map: {
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-98.5795, 39.8283],
        zoom: 4,
        maxZoom: 18,
        minZoom: 2
    },
    performance: {
        searchDebounceMs: 300,
        mapAnimationDuration: 1500,
        markerClusterRadius: 50,
        maxMarkersBeforeClustering: 100
    },
    security: {
        enableContentSecurityPolicy: true,
        sanitizeUserInput: true,
        validateCoordinates: true
    },
    data: {
        enableLazyLoading: true,
        chunkSize: 50,
        enableCaching: true,
        cacheExpirationMs: 1000 * 60 * 30
    },
    ui: {
        mobileBreakpoint: 768,
        defaultFilterState: 'all',
        showLoadingIndicators: true,
        enableAnimations: true
    },
    analytics: {
        enabled: false,
        trackingId: null
    }
};

// Mock sample location data
global.rivianLocations = [
    {
        id: 1,
        name: 'Venice Space',
        type: 'Space',
        address: '333 Lincoln Blvd',
        city: 'Venice, CA 90291',
        state: 'CA',
        lat: 33.9936,
        lng: -118.4697,
        phone: '(310) 555-0100',
        hours: 'Mon-Sat: 10am-7pm, Sun: 11am-6pm',
        openingDate: '2021-11-01',
        rivianUrl: 'https://rivian.com/spaces/venice',
        services: ['Test Drives', 'Sales'],
        isOpen: true
    },
    {
        id: 2,
        name: 'Chicago Demo Center',
        type: 'Demo Center',
        address: '123 Main St',
        city: 'Chicago, IL 60601',
        state: 'IL',
        lat: 41.8781,
        lng: -87.6298,
        phone: '(312) 555-0200',
        hours: 'Daily: 9am-8pm',
        openingDate: '2022-03-15',
        rivianUrl: 'https://rivian.com/demo-centers/chicago',
        services: ['Test Drives', 'Service'],
        isOpen: true
    },
    {
        id: 3,
        name: 'Austin Outpost',
        type: 'Outpost',
        address: '456 Congress Ave',
        city: 'Austin, TX 78701',
        state: 'TX',
        lat: 30.2672,
        lng: -97.7431,
        phone: '(512) 555-0300',
        hours: 'Mon-Fri: 9am-6pm',
        openingDate: '2023-01-20',
        rivianUrl: 'https://rivian.com/outposts/austin',
        services: ['Service', 'Parts'],
        isOpen: true
    }
];

// Mock DOM elements
document.body.innerHTML = `
    <div id="map"></div>
    <div id="sidebar"></div>
    <div id="locationList"></div>
    <div id="locationStats"></div>
    <input id="searchInput" type="text" />
    <select id="stateFilter"></select>
    <div id="mobileOverlay"></div>
    <button id="closeSidebar"></button>
    <button id="locationBtn"></button>
    <button id="mobileFilterBtn"></button>
    <button id="mobileListBtn"></button>
    <button id="mobileNearMeBtn"></button>
`;

// Mock navigator.geolocation
global.navigator.geolocation = {
    getCurrentPosition: jest.fn((success) =>
        success({
            coords: {
                latitude: 33.9936,
                longitude: -118.4697
            }
        })
    )
};

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Add custom matchers if needed
expect.extend({
    toBeValidCoordinate(received) {
        const { lat, lng } = received;
        const pass =
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180;

        if (pass) {
            return {
                message: () => `expected ${JSON.stringify(received)} not to be valid coordinates`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${JSON.stringify(received)} to be valid coordinates`,
                pass: false
            };
        }
    }
});
