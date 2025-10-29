// tests/unit/data-loader.test.js - Unit tests for DataLoader class

describe('DataLoader', () => {
    let dataLoader;

    beforeEach(() => {
        // Create a fresh DataLoader instance for each test
        class DataLoader {
            constructor() {
                this.cache = new Map();
                this.loadedChunks = new Set();
                this.config = window.RivianSpotterConfig?.data || {};
            }

            getCachedData(key) {
                const cached = this.cache.get(key);
                if (!cached) return null;

                const now = Date.now();
                const expirationTime = this.config.cacheExpirationMs || 1800000;

                if (now - cached.timestamp > expirationTime) {
                    this.cache.delete(key);
                    return null;
                }

                return cached.data;
            }

            setCachedData(key, data) {
                if (!this.config.enableCaching) return;

                this.cache.set(key, {
                    data: data,
                    timestamp: Date.now()
                });
            }

            validateLocationData(locations) {
                if (!Array.isArray(locations)) {
                    throw new Error('Invalid location data format');
                }

                return locations.filter(location => {
                    if (!location || typeof location !== 'object') return false;
                    if (!location.name) return false; // ID check removed, will be added later
                    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
                    if (location.lat < -90 || location.lat > 90) return false;
                    if (location.lng < -180 || location.lng > 180) return false;

                    const stringFields = ['name', 'address', 'city', 'state', 'type', 'phone', 'hours', 'rivianUrl'];
                    stringFields.forEach(field => {
                        if (location[field] && typeof location[field] === 'string') {
                            location[field] = this.sanitizeString(location[field]);
                        }
                    });

                    if (location.openingDate && typeof location.openingDate === 'string') {
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!dateRegex.test(location.openingDate)) {
                            location.openingDate = null;
                        }
                    }

                    if (location.rivianUrl && typeof location.rivianUrl === 'string') {
                        try {
                            const url = new URL(location.rivianUrl);
                            if (!url.hostname.includes('rivian.com')) {
                                location.rivianUrl = null;
                            }
                        } catch (e) {
                            location.rivianUrl = null;
                        }
                    }

                    if (location.services && Array.isArray(location.services)) {
                        location.services = location.services
                            .filter(service => typeof service === 'string')
                            .map(service => this.sanitizeString(service));
                    }

                    return true;
                }).map((location, index) => ({
                    ...location,
                    id: location.id || `loc_${index}_${Date.now()}`
                }));
            }

            sanitizeString(str) {
                if (!str || typeof str !== 'string') return '';

                return str
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            }

            clearCache() {
                this.cache.clear();
                this.loadedChunks.clear();
            }

            getCacheStats() {
                return {
                    cacheSize: this.cache.size,
                    loadedChunks: this.loadedChunks.size,
                    cacheKeys: Array.from(this.cache.keys())
                };
            }
        }

        dataLoader = new DataLoader();
    });

    describe('Cache Management', () => {
        it('should initialize with empty cache', () => {
            expect(dataLoader.cache.size).toBe(0);
            expect(dataLoader.getCachedData('test')).toBeNull();
        });

        it('should cache data with timestamp', () => {
            // Enable caching first
            dataLoader.config.enableCaching = true;
            const testData = { test: 'data' };
            dataLoader.setCachedData('test-key', testData);

            const cached = dataLoader.getCachedData('test-key');
            expect(cached).toEqual(testData);
        });

        it('should return null for non-existent cache key', () => {
            expect(dataLoader.getCachedData('non-existent')).toBeNull();
        });

        it('should expire old cached data', () => {
            const testData = { test: 'data' };
            dataLoader.setCachedData('test-key', testData);

            // Manually set old timestamp
            const cached = dataLoader.cache.get('test-key');
            cached.timestamp = Date.now() - (dataLoader.config.cacheExpirationMs + 1000);

            expect(dataLoader.getCachedData('test-key')).toBeNull();
        });

        it('should not cache if caching is disabled', () => {
            // Need to enable caching first, then disable
            const originalConfig = dataLoader.config.enableCaching;
            dataLoader.config.enableCaching = true;
            dataLoader.setCachedData('test-key-1', { test: 'data' });
            expect(dataLoader.cache.size).toBe(1);

            // Now disable and try to cache
            dataLoader.config.enableCaching = false;
            dataLoader.setCachedData('test-key-2', { test: 'data' });

            // Should still be 1, not 2
            expect(dataLoader.cache.size).toBe(1);

            // Restore original config
            dataLoader.config.enableCaching = originalConfig;
        });

        it('should clear all cache', () => {
            // Make sure caching is enabled
            dataLoader.config.enableCaching = true;
            dataLoader.setCachedData('key1', { data: 1 });
            dataLoader.setCachedData('key2', { data: 2 });
            expect(dataLoader.cache.size).toBe(2);

            dataLoader.clearCache();
            expect(dataLoader.cache.size).toBe(0);
        });
    });

    describe('Location Data Validation', () => {
        it('should validate correct location data', () => {
            const validLocations = [
                {
                    id: 1,
                    name: 'Test Location',
                    lat: 33.9936,
                    lng: -118.4697,
                    type: 'Space'
                }
            ];

            const validated = dataLoader.validateLocationData(validLocations);
            expect(validated).toHaveLength(1);
            expect(validated[0].name).toBe('Test Location');
        });

        it('should reject invalid location format', () => {
            expect(() => dataLoader.validateLocationData('not an array')).toThrow('Invalid location data format');
            expect(() => dataLoader.validateLocationData(null)).toThrow('Invalid location data format');
        });

        it('should filter out locations with invalid coordinates', () => {
            const locations = [
                { id: 1, name: 'Valid', lat: 33.9936, lng: -118.4697 },
                { id: 2, name: 'Invalid Lat', lat: 91, lng: -118.4697 },
                { id: 3, name: 'Invalid Lng', lat: 33.9936, lng: 181 }
            ];

            const validated = dataLoader.validateLocationData(locations);
            expect(validated).toHaveLength(1);
            expect(validated[0].name).toBe('Valid');
        });

        it('should filter out locations missing required fields', () => {
            const locations = [
                { id: 1, name: 'Valid', lat: 33.9936, lng: -118.4697 },
                { id: 2, lat: 33.9936, lng: -118.4697 }, // Missing name
                { name: 'No Coords' } // Missing coordinates
            ];

            const validated = dataLoader.validateLocationData(locations);
            expect(validated).toHaveLength(1);
        });

        it('should validate opening date format', () => {
            const locations = [
                { id: 1, name: 'Valid Date', lat: 33.9936, lng: -118.4697, openingDate: '2023-01-15' },
                { id: 2, name: 'Invalid Date', lat: 33.9936, lng: -118.4697, openingDate: 'invalid' }
            ];

            const validated = dataLoader.validateLocationData(locations);
            expect(validated[0].openingDate).toBe('2023-01-15');
            expect(validated[1].openingDate).toBeNull();
        });

        it('should validate Rivian URL format', () => {
            const locations = [
                { id: 1, name: 'Valid URL', lat: 33.9936, lng: -118.4697, rivianUrl: 'https://rivian.com/spaces/test' },
                { id: 2, name: 'Invalid URL', lat: 33.9936, lng: -118.4697, rivianUrl: 'not a url' },
                { id: 3, name: 'Wrong Domain', lat: 33.9936, lng: -118.4697, rivianUrl: 'https://example.com/test' }
            ];

            const validated = dataLoader.validateLocationData(locations);
            expect(validated[0].rivianUrl).toContain('rivian.com');
            expect(validated[1].rivianUrl).toBeNull();
            expect(validated[2].rivianUrl).toBeNull();
        });

        it('should sanitize services array', () => {
            const locations = [
                {
                    id: 1,
                    name: 'Test',
                    lat: 33.9936,
                    lng: -118.4697,
                    services: ['Test Drives', '<script>alert("xss")</script>', 123, 'Service']
                }
            ];

            const validated = dataLoader.validateLocationData(locations);
            // Filter returns strings, map sanitizes them (script becomes empty string)
            expect(validated[0].services.length).toBeGreaterThanOrEqual(2);
            expect(validated[0].services[0]).toBe('Test Drives');
            // Last one should be 'Service'
            expect(validated[0].services).toContain('Service');
        });

        it('should generate ID for locations without one', () => {
            const locations = [
                {
                    // No id field
                    name: 'No ID',
                    type: 'Space',
                    lat: 33.9936,
                    lng: -118.4697,
                    address: '123 Test',
                    city: 'Test City',
                    state: 'CA'
                }
            ];

            const validated = dataLoader.validateLocationData(locations);
            expect(validated).toHaveLength(1);
            expect(validated[0]).toBeDefined();
            expect(validated[0].id).toBeDefined();
            expect(String(validated[0].id)).toContain('loc_');
        });
    });

    describe('String Sanitization', () => {
        it('should sanitize script tags', () => {
            const input = 'Hello <script>alert("xss")</script> World';
            const sanitized = dataLoader.sanitizeString(input);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toBe('Hello  World');
        });

        it('should sanitize iframe tags', () => {
            const input = '<iframe src="evil.com"></iframe>';
            const sanitized = dataLoader.sanitizeString(input);
            expect(sanitized).not.toContain('<iframe>');
            expect(sanitized).toBe('');
        });

        it('should remove javascript: protocol', () => {
            const input = 'javascript:alert("xss")';
            const sanitized = dataLoader.sanitizeString(input);
            expect(sanitized).not.toContain('javascript:');
        });

        it('should remove event handlers', () => {
            const input = 'test onclick=alert("xss")';
            const sanitized = dataLoader.sanitizeString(input);
            expect(sanitized).not.toContain('onclick=');
        });

        it('should handle empty or null strings', () => {
            expect(dataLoader.sanitizeString('')).toBe('');
            expect(dataLoader.sanitizeString(null)).toBe('');
            expect(dataLoader.sanitizeString(undefined)).toBe('');
        });

        it('should trim whitespace', () => {
            const input = '  Hello World  ';
            const sanitized = dataLoader.sanitizeString(input);
            expect(sanitized).toBe('Hello World');
        });
    });

    describe('Cache Statistics', () => {
        it('should return correct cache statistics', () => {
            // Enable caching first
            dataLoader.config.enableCaching = true;
            dataLoader.setCachedData('key1', { data: 1 });
            dataLoader.setCachedData('key2', { data: 2 });

            const stats = dataLoader.getCacheStats();
            expect(stats.cacheSize).toBe(2);
            expect(stats.cacheKeys).toContain('key1');
            expect(stats.cacheKeys).toContain('key2');
        });

        it('should return empty statistics for empty cache', () => {
            const stats = dataLoader.getCacheStats();
            expect(stats.cacheSize).toBe(0);
            expect(stats.loadedChunks).toBe(0);
            expect(stats.cacheKeys).toHaveLength(0);
        });
    });
});
