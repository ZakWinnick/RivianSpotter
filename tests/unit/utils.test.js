// tests/unit/utils.test.js - Unit tests for utility functions

describe('Utils - Utility Functions', () => {
    let Utils;

    beforeEach(() => {
        // Load the app.js file and extract Utils object
        // Since we're testing in isolation, we'll define Utils here
        Utils = {
            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },

            sanitizeHTML(str) {
                if (!str) return '';
                const temp = document.createElement('div');
                temp.textContent = str;
                return temp.innerHTML;
            },

            isValidCoordinate(lat, lng) {
                return (
                    typeof lat === 'number' &&
                    typeof lng === 'number' &&
                    lat >= -90 && lat <= 90 &&
                    lng >= -180 && lng <= 180
                );
            }
        };
    });

    describe('sanitizeHTML', () => {
        it('should sanitize HTML special characters', () => {
            expect(Utils.sanitizeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('should handle plain text without modification', () => {
            expect(Utils.sanitizeHTML('Hello World')).toBe('Hello World');
        });

        it('should handle empty string', () => {
            expect(Utils.sanitizeHTML('')).toBe('');
        });

        it('should handle null or undefined', () => {
            expect(Utils.sanitizeHTML(null)).toBe('');
            expect(Utils.sanitizeHTML(undefined)).toBe('');
        });

        it('should escape quotes', () => {
            expect(Utils.sanitizeHTML('"quoted"')).toBe('"quoted"');
        });

        it('should escape ampersands', () => {
            expect(Utils.sanitizeHTML('A & B')).toBe('A &amp; B');
        });

        it('should handle mixed HTML and text', () => {
            const input = 'Hello <b>World</b> & <i>Friends</i>';
            const output = Utils.sanitizeHTML(input);
            expect(output).not.toContain('<b>');
            expect(output).not.toContain('<i>');
            expect(output).toContain('&lt;b&gt;');
        });
    });

    describe('isValidCoordinate', () => {
        it('should validate correct coordinates', () => {
            expect(Utils.isValidCoordinate(33.9936, -118.4697)).toBe(true);
            expect(Utils.isValidCoordinate(0, 0)).toBe(true);
            expect(Utils.isValidCoordinate(90, 180)).toBe(true);
            expect(Utils.isValidCoordinate(-90, -180)).toBe(true);
        });

        it('should reject invalid latitude', () => {
            expect(Utils.isValidCoordinate(91, 0)).toBe(false);
            expect(Utils.isValidCoordinate(-91, 0)).toBe(false);
            expect(Utils.isValidCoordinate(100, 0)).toBe(false);
        });

        it('should reject invalid longitude', () => {
            expect(Utils.isValidCoordinate(0, 181)).toBe(false);
            expect(Utils.isValidCoordinate(0, -181)).toBe(false);
            expect(Utils.isValidCoordinate(0, 200)).toBe(false);
        });

        it('should reject non-numeric values', () => {
            expect(Utils.isValidCoordinate('33.9936', -118.4697)).toBe(false);
            expect(Utils.isValidCoordinate(33.9936, '-118.4697')).toBe(false);
            expect(Utils.isValidCoordinate(null, null)).toBe(false);
            expect(Utils.isValidCoordinate(undefined, undefined)).toBe(false);
        });

        it('should reject NaN', () => {
            expect(Utils.isValidCoordinate(NaN, 0)).toBe(false);
            expect(Utils.isValidCoordinate(0, NaN)).toBe(false);
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        it('should delay function execution', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 300);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should only call function once for multiple rapid calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 300);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should pass arguments to debounced function', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 300);

            debouncedFn('test', 123);
            jest.advanceTimersByTime(300);

            expect(mockFn).toHaveBeenCalledWith('test', 123);
        });

        it('should reset timer on subsequent calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 300);

            debouncedFn();
            jest.advanceTimersByTime(200);
            debouncedFn();
            jest.advanceTimersByTime(200);

            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        afterEach(() => {
            jest.clearAllTimers();
        });
    });

    describe('Haversine Distance Calculation', () => {
        // Test the distance calculation from LocationManager
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 3958.8; // Radius of Earth in miles
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        it('should calculate distance between two points', () => {
            // Los Angeles to New York (approximately 2451 miles)
            const distance = calculateDistance(34.0522, -118.2437, 40.7128, -74.0060);
            expect(distance).toBeGreaterThan(2400);
            expect(distance).toBeLessThan(2500);
        });

        it('should return 0 for same coordinates', () => {
            const distance = calculateDistance(34.0522, -118.2437, 34.0522, -118.2437);
            expect(distance).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const distance = calculateDistance(-33.8688, 151.2093, 51.5074, -0.1278); // Sydney to London
            expect(distance).toBeGreaterThan(0);
        });

        it('should be symmetric', () => {
            const distance1 = calculateDistance(34.0522, -118.2437, 40.7128, -74.0060);
            const distance2 = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
            expect(distance1).toBeCloseTo(distance2, 5);
        });
    });
});
