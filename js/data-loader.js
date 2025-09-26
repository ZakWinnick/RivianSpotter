// data-loader.js - Efficient data loading and caching

class DataLoader {
    constructor() {
        this.cache = new Map();
        this.loadedChunks = new Set();
        this.config = window.RivianSpotterConfig?.data || {};
    }

    // Get cached data if available and not expired
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        const expirationTime = this.config.cacheExpirationMs || 1800000; // 30 minutes default

        if (now - cached.timestamp > expirationTime) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    // Cache data with timestamp
    setCachedData(key, data) {
        if (!this.config.enableCaching) return;

        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Load location data with error handling and validation
    async loadLocationData() {
        try {
            // Check cache first
            const cachedData = this.getCachedData('locations');
            if (cachedData) {
                console.log('Using cached location data');
                return cachedData;
            }

            // Check if global locations data is available
            if (typeof rivianLocations !== 'undefined' && Array.isArray(rivianLocations)) {
                const validatedData = this.validateLocationData(rivianLocations);
                this.setCachedData('locations', validatedData);
                return validatedData;
            }

            // Fallback: try to load from API
            return await this.loadFromAPI();

        } catch (error) {
            console.error('Failed to load location data:', error);
            throw new Error('Unable to load location data. Please try again later.');
        }
    }

    // Validate and sanitize location data
    validateLocationData(locations) {
        if (!Array.isArray(locations)) {
            throw new Error('Invalid location data format');
        }

        return locations.filter(location => {
            // Basic validation
            if (!location || typeof location !== 'object') return false;
            if (!location.id || !location.name) return false;
            if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
            if (location.lat < -90 || location.lat > 90) return false;
            if (location.lng < -180 || location.lng > 180) return false;

            // Sanitize string fields
            const stringFields = ['name', 'address', 'city', 'state', 'type', 'phone', 'hours', 'rivianUrl'];
            stringFields.forEach(field => {
                if (location[field] && typeof location[field] === 'string') {
                    location[field] = this.sanitizeString(location[field]);
                }
            });

            // Validate opening date format if present
            if (location.openingDate && typeof location.openingDate === 'string') {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(location.openingDate)) {
                    console.warn('Invalid opening date format for location:', location.name);
                    location.openingDate = null;
                }
            }

            // Validate Rivian URL if present
            if (location.rivianUrl && typeof location.rivianUrl === 'string') {
                try {
                    const url = new URL(location.rivianUrl);
                    if (!url.hostname.includes('rivian.com')) {
                        console.warn('Invalid Rivian URL for location:', location.name);
                        location.rivianUrl = null;
                    }
                } catch (e) {
                    console.warn('Invalid URL format for location:', location.name);
                    location.rivianUrl = null;
                }
            }

            // Validate services array
            if (location.services && Array.isArray(location.services)) {
                location.services = location.services
                    .filter(service => typeof service === 'string')
                    .map(service => this.sanitizeString(service));
            }

            return true;
        }).map((location, index) => ({
            ...location,
            // Ensure ID is present and unique
            id: location.id || `loc_${index}_${Date.now()}`
        }));
    }

    // Sanitize string input
    sanitizeString(str) {
        if (!str || typeof str !== 'string') return '';

        // Remove potential XSS vectors
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    // Fallback API loading
    async loadFromAPI() {
        try {
            const response = await fetch('/api/locations.php', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=300' // 5 minutes cache
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const validatedData = this.validateLocationData(data);
            this.setCachedData('locations', validatedData);
            return validatedData;

        } catch (error) {
            console.error('API loading failed:', error);
            throw error;
        }
    }

    // Lazy load location chunks for better performance
    async loadLocationChunk(startIndex, endIndex) {
        try {
            const allLocations = await this.loadLocationData();
            const chunk = allLocations.slice(startIndex, endIndex);

            const chunkKey = `chunk_${startIndex}_${endIndex}`;
            this.loadedChunks.add(chunkKey);

            return chunk;
        } catch (error) {
            console.error('Failed to load location chunk:', error);
            throw error;
        }
    }

    // Preload nearby chunks based on current viewport
    async preloadNearbyChunks(currentIndex, chunkSize = 50) {
        if (!this.config.enableLazyLoading) return;

        const startChunk = Math.max(0, currentIndex - chunkSize);
        const endChunk = currentIndex + chunkSize * 2;

        try {
            await this.loadLocationChunk(startChunk, endChunk);
        } catch (error) {
            console.warn('Preloading nearby chunks failed:', error);
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.loadedChunks.clear();
        console.log('Data cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            loadedChunks: this.loadedChunks.size,
            cacheKeys: Array.from(this.cache.keys())
        };
    }
}

// Create global instance
window.dataLoader = new DataLoader();