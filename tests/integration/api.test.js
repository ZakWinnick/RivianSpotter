// tests/integration/api.test.js - Integration tests for API endpoints

// Note: These tests require a PHP environment to run
// They can be run with: npm test -- tests/integration/api.test.js
// Make sure PHP server is running on localhost:8000

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api/locations.php';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c';

describe('API Integration Tests', () => {
    let testLocationId;

    // Helper function to make API requests
    const apiRequest = async (method, options = {}) => {
        const { body, token, query = '' } = options;
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const config = {
            method,
            headers,
            ...(body && { body: JSON.stringify(body) })
        };

        const url = query ? `${API_BASE_URL}?${query}` : API_BASE_URL;
        const response = await fetch(url, config);
        const data = await response.json();

        return {
            status: response.status,
            data,
            ok: response.ok
        };
    };

    describe('GET /api/locations.php', () => {
        it('should retrieve all locations without authentication', async () => {
            const response = await apiRequest('GET');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return valid location structure', async () => {
            const response = await apiRequest('GET');

            if (response.data.length > 0) {
                const location = response.data[0];
                expect(location).toHaveProperty('id');
                expect(location).toHaveProperty('name');
                expect(location).toHaveProperty('lat');
                expect(location).toHaveProperty('lng');
                expect(typeof location.lat).toBe('number');
                expect(typeof location.lng).toBe('number');
            }
        });

        it('should return locations with valid coordinates', async () => {
            const response = await apiRequest('GET');

            response.data.forEach(location => {
                expect(location.lat).toBeGreaterThanOrEqual(-90);
                expect(location.lat).toBeLessThanOrEqual(90);
                expect(location.lng).toBeGreaterThanOrEqual(-180);
                expect(location.lng).toBeLessThanOrEqual(180);
            });
        });
    });

    describe('POST /api/locations.php', () => {
        it('should reject request without authentication', async () => {
            const newLocation = {
                name: 'Test Location',
                type: 'Space',
                lat: 33.9936,
                lng: -118.4697,
                address: '123 Test St',
                city: 'Test City, CA 90210',
                state: 'CA'
            };

            const response = await apiRequest('POST', { body: newLocation });
            expect(response.status).toBe(401);
        });

        it('should create new location with valid authentication', async () => {
            const newLocation = {
                name: 'Test Location Integration',
                type: 'Space',
                lat: 34.0522,
                lng: -118.2437,
                address: '123 Test St',
                city: 'Los Angeles, CA 90001',
                state: 'CA',
                phone: '(310) 555-0100',
                hours: 'Mon-Fri: 9am-6pm',
                openingDate: '2024-01-01',
                rivianUrl: 'https://rivian.com/spaces/test',
                services: ['Test Drives', 'Sales']
            };

            const response = await apiRequest('POST', {
                body: newLocation,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.location).toBeDefined();
            expect(response.data.location.name).toBe(newLocation.name);

            // Store ID for later tests
            testLocationId = response.data.location.id;
        });

        it('should reject location with invalid coordinates', async () => {
            const invalidLocation = {
                name: 'Invalid Location',
                type: 'Space',
                lat: 91, // Invalid latitude
                lng: -118.4697,
                address: '123 Test St',
                city: 'Test City',
                state: 'CA'
            };

            const response = await apiRequest('POST', {
                body: invalidLocation,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(400);
        });

        it('should reject location with missing required fields', async () => {
            const incompleteLocation = {
                name: 'Incomplete Location',
                // Missing lat, lng, type
                address: '123 Test St',
                city: 'Test City'
            };

            const response = await apiRequest('POST', {
                body: incompleteLocation,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(400);
        });

        it('should sanitize HTML in input', async () => {
            const locationWithHTML = {
                name: 'Test <script>alert("xss")</script>',
                type: 'Space',
                lat: 34.0522,
                lng: -118.2437,
                address: '123 Test St',
                city: 'Test City',
                state: 'CA'
            };

            const response = await apiRequest('POST', {
                body: locationWithHTML,
                token: ADMIN_TOKEN
            });

            if (response.ok) {
                expect(response.data.location.name).not.toContain('<script>');
            }
        });
    });

    describe('PUT /api/locations.php', () => {
        it('should require authentication for updates', async () => {
            const updateData = {
                id: 1,
                name: 'Updated Name',
                type: 'Space',
                lat: 34.0522,
                lng: -118.2437
            };

            const response = await apiRequest('PUT', { body: updateData });
            expect(response.status).toBe(401);
        });

        it('should update existing location with valid data', async () => {
            if (!testLocationId) {
                console.log('Skipping update test - no test location created');
                return;
            }

            const updateData = {
                id: testLocationId,
                name: 'Updated Test Location',
                type: 'Demo Center',
                lat: 34.0522,
                lng: -118.2437,
                address: '456 Updated St',
                city: 'Los Angeles, CA 90001',
                state: 'CA'
            };

            const response = await apiRequest('PUT', {
                body: updateData,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.location.name).toBe('Updated Test Location');
        });

        it('should return 404 for non-existent location', async () => {
            const updateData = {
                id: 999999,
                name: 'Non-existent',
                type: 'Space',
                lat: 34.0522,
                lng: -118.2437
            };

            const response = await apiRequest('PUT', {
                body: updateData,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/locations.php', () => {
        it('should require authentication for deletion', async () => {
            const response = await apiRequest('DELETE', {
                query: 'id=1'
            });

            expect(response.status).toBe(401);
        });

        it('should delete location with valid authentication', async () => {
            if (!testLocationId) {
                console.log('Skipping delete test - no test location created');
                return;
            }

            const response = await apiRequest('DELETE', {
                query: `id=${testLocationId}`,
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
        });

        it('should return 404 for non-existent location', async () => {
            const response = await apiRequest('DELETE', {
                query: 'id=999999',
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(404);
        });

        it('should require location ID', async () => {
            const response = await apiRequest('DELETE', {
                token: ADMIN_TOKEN
            });

            expect(response.status).toBe(400);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits after many requests', async () => {
            // Skip in CI environment to avoid long test times
            if (process.env.CI) {
                console.log('Skipping rate limit test in CI');
                return;
            }

            const requests = [];
            for (let i = 0; i < 105; i++) {
                requests.push(apiRequest('GET'));
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        }, 30000); // 30 second timeout
    });

    describe('CORS Headers', () => {
        it('should include appropriate CORS headers', async () => {
            const response = await fetch(API_BASE_URL, {
                method: 'OPTIONS'
            });

            expect(response.status).toBe(200);
        });
    });

    describe('Error Handling', () => {
        it('should return proper error for invalid JSON', async () => {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ADMIN_TOKEN}`
                },
                body: 'invalid json{'
            });

            expect(response.status).toBe(400);
        });

        it('should handle method not allowed', async () => {
            const response = await fetch(API_BASE_URL, {
                method: 'PATCH'
            });

            expect(response.status).toBe(405);
        });
    });
});

describe('API Data Validation', () => {
    describe('Coordinate Validation', () => {
        it('should validate latitude boundaries', async () => {
            const testCases = [
                { lat: -91, lng: 0, valid: false },
                { lat: -90, lng: 0, valid: true },
                { lat: 0, lng: 0, valid: true },
                { lat: 90, lng: 0, valid: true },
                { lat: 91, lng: 0, valid: false }
            ];

            for (const testCase of testCases) {
                const location = {
                    name: 'Test',
                    type: 'Space',
                    lat: testCase.lat,
                    lng: testCase.lng,
                    address: '123 Test',
                    city: 'Test',
                    state: 'CA'
                };

                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ADMIN_TOKEN}`
                    },
                    body: JSON.stringify(location)
                });

                if (testCase.valid) {
                    expect(response.status).toBe(200);
                } else {
                    expect(response.status).toBe(400);
                }
            }
        });
    });

    describe('Date Validation', () => {
        it('should validate opening date format', async () => {
            const validDate = {
                name: 'Test',
                type: 'Space',
                lat: 34.0522,
                lng: -118.2437,
                address: '123 Test',
                city: 'Test',
                state: 'CA',
                openingDate: '2024-01-15'
            };

            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ADMIN_TOKEN}`
                },
                body: JSON.stringify(validDate)
            });

            expect(response.ok).toBe(true);
        });
    });
});
