// config.js - Application configuration
// This file should be customized for different environments

window.RivianSpotterConfig = {
    // Mapbox Access Token
    // Note: Client-side tokens are always visible in browser. Restrict by URL in Mapbox dashboard.
    mapboxToken: 'pk.eyJ1IjoiemFrd2lubmljayIsImEiOiJjbWYxYzV5bmQxZGwzMmxxNHBieHp3NDI2In0.YAzo3vcGSqaNxZyz4GA7xg',

    // Map configuration
    map: {
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-98.5795, 39.8283], // Center of USA
        zoom: 4,
        maxZoom: 18,
        minZoom: 2
    },

    // Performance settings
    performance: {
        searchDebounceMs: 300,
        mapAnimationDuration: 1500,
        markerClusterRadius: 50,
        maxMarkersBeforeClustering: 100
    },

    // Security settings
    security: {
        enableContentSecurityPolicy: true,
        sanitizeUserInput: true,
        validateCoordinates: true
    },

    // Data loading settings
    data: {
        enableLazyLoading: true,
        chunkSize: 50,
        enableCaching: true,
        cacheExpirationMs: 1000 * 60 * 30 // 30 minutes
    },

    // UI settings
    ui: {
        mobileBreakpoint: 768,
        defaultFilterState: 'all',
        showLoadingIndicators: true,
        enableAnimations: true
    },

    // Analytics (if needed)
    analytics: {
        enabled: false,
        trackingId: null
    }
};