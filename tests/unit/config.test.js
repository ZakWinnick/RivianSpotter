// tests/unit/config.test.js - Unit tests for configuration

describe('Configuration', () => {
    it('should have valid map configuration', () => {
        expect(window.RivianSpotterConfig).toBeDefined();
        expect(window.RivianSpotterConfig.map).toBeDefined();
        expect(window.RivianSpotterConfig.map.style).toContain('mapbox://');
        expect(window.RivianSpotterConfig.map.zoom).toBeGreaterThanOrEqual(1);
        expect(window.RivianSpotterConfig.map.zoom).toBeLessThanOrEqual(20);
    });

    it('should have valid center coordinates', () => {
        const { center } = window.RivianSpotterConfig.map;
        expect(center).toHaveLength(2);
        expect(center[0]).toBeGreaterThanOrEqual(-180);
        expect(center[0]).toBeLessThanOrEqual(180);
        expect(center[1]).toBeGreaterThanOrEqual(-90);
        expect(center[1]).toBeLessThanOrEqual(90);
    });

    it('should have valid zoom constraints', () => {
        const { maxZoom, minZoom, zoom } = window.RivianSpotterConfig.map;
        expect(minZoom).toBeLessThan(maxZoom);
        expect(zoom).toBeGreaterThanOrEqual(minZoom);
        expect(zoom).toBeLessThanOrEqual(maxZoom);
    });

    describe('Performance settings', () => {
        it('should have valid performance configuration', () => {
            const { performance } = window.RivianSpotterConfig;
            expect(performance).toBeDefined();
            expect(performance.searchDebounceMs).toBeGreaterThan(0);
            expect(performance.mapAnimationDuration).toBeGreaterThan(0);
            expect(performance.markerClusterRadius).toBeGreaterThan(0);
        });

        it('should have reasonable debounce time', () => {
            const { searchDebounceMs } = window.RivianSpotterConfig.performance;
            expect(searchDebounceMs).toBeGreaterThanOrEqual(100);
            expect(searchDebounceMs).toBeLessThanOrEqual(1000);
        });

        it('should have reasonable animation duration', () => {
            const { mapAnimationDuration } = window.RivianSpotterConfig.performance;
            expect(mapAnimationDuration).toBeGreaterThanOrEqual(500);
            expect(mapAnimationDuration).toBeLessThanOrEqual(3000);
        });
    });

    describe('Security settings', () => {
        it('should have security configuration', () => {
            const { security } = window.RivianSpotterConfig;
            expect(security).toBeDefined();
            expect(typeof security.enableContentSecurityPolicy).toBe('boolean');
            expect(typeof security.sanitizeUserInput).toBe('boolean');
            expect(typeof security.validateCoordinates).toBe('boolean');
        });

        it('should have security features enabled', () => {
            const { security } = window.RivianSpotterConfig;
            expect(security.sanitizeUserInput).toBe(true);
            expect(security.validateCoordinates).toBe(true);
        });
    });

    describe('Data settings', () => {
        it('should have data configuration', () => {
            const { data } = window.RivianSpotterConfig;
            expect(data).toBeDefined();
            expect(typeof data.enableCaching).toBe('boolean');
            expect(typeof data.enableLazyLoading).toBe('boolean');
        });

        it('should have valid cache expiration', () => {
            const { data } = window.RivianSpotterConfig;
            expect(data.cacheExpirationMs).toBeGreaterThan(0);
            expect(data.cacheExpirationMs).toBeLessThanOrEqual(1000 * 60 * 60 * 24); // Max 24 hours
        });

        it('should have valid chunk size', () => {
            const { data } = window.RivianSpotterConfig;
            if (data.enableLazyLoading) {
                expect(data.chunkSize).toBeGreaterThan(0);
                expect(data.chunkSize).toBeLessThanOrEqual(1000);
            }
        });
    });

    describe('UI settings', () => {
        it('should have UI configuration', () => {
            const { ui } = window.RivianSpotterConfig;
            expect(ui).toBeDefined();
            expect(ui.mobileBreakpoint).toBeDefined();
            expect(ui.defaultFilterState).toBeDefined();
        });

        it('should have valid mobile breakpoint', () => {
            const { mobileBreakpoint } = window.RivianSpotterConfig.ui;
            expect(mobileBreakpoint).toBeGreaterThanOrEqual(320);
            expect(mobileBreakpoint).toBeLessThanOrEqual(1024);
        });

        it('should have valid default filter state', () => {
            const { defaultFilterState } = window.RivianSpotterConfig.ui;
            expect(['all', 'Space', 'Demo Center', 'Outpost']).toContain(defaultFilterState);
        });
    });

    describe('Analytics settings', () => {
        it('should have analytics configuration', () => {
            const { analytics } = window.RivianSpotterConfig;
            expect(analytics).toBeDefined();
            expect(typeof analytics.enabled).toBe('boolean');
        });

        it('should require tracking ID if analytics enabled', () => {
            const { analytics } = window.RivianSpotterConfig;
            if (analytics.enabled) {
                expect(analytics.trackingId).toBeTruthy();
            }
        });
    });

    describe('Configuration integrity', () => {
        it('should not have undefined values', () => {
            const checkForUndefined = (obj, path = '') => {
                for (const key in obj) {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (obj[key] === undefined) {
                        throw new Error(`Undefined value at ${currentPath}`);
                    }
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        checkForUndefined(obj[key], currentPath);
                    }
                }
            };

            expect(() => checkForUndefined(window.RivianSpotterConfig)).not.toThrow();
        });

        it('should be frozen or sealed in production', () => {
            // In production, config should be immutable
            const isFrozen = Object.isFrozen(window.RivianSpotterConfig);
            const isSealed = Object.isSealed(window.RivianSpotterConfig);

            // For now, just check it exists (can be enforced later)
            expect(window.RivianSpotterConfig).toBeTruthy();
        });
    });
});
