// tests/helpers.js - Test helper utilities

/**
 * Create a mock location object for testing
 * @param {object} overrides - Properties to override
 * @returns {object} Mock location object
 */
function createMockLocation(overrides = {}) {
    return {
        id: 1,
        name: 'Test Location',
        type: 'Space',
        address: '123 Test St',
        city: 'Test City, CA 90210',
        state: 'CA',
        lat: 34.0522,
        lng: -118.2437,
        phone: '(310) 555-0100',
        hours: 'Mon-Fri: 9am-6pm',
        openingDate: '2024-01-01',
        rivianUrl: 'https://rivian.com/spaces/test',
        services: ['Test Drives', 'Sales'],
        isOpen: true,
        ...overrides
    };
}

/**
 * Create multiple mock locations
 * @param {number} count - Number of locations to create
 * @returns {array} Array of mock locations
 */
function createMockLocations(count = 3) {
    const types = ['Space', 'Demo Center', 'Outpost'];
    const states = ['CA', 'TX', 'NY', 'IL', 'FL'];
    const cities = ['Los Angeles', 'Austin', 'New York', 'Chicago', 'Miami'];

    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Test Location ${i + 1}`,
        type: types[i % types.length],
        address: `${100 + i} Test St`,
        city: `${cities[i % cities.length]}, ${states[i % states.length]} 90000`,
        state: states[i % states.length],
        lat: 30 + (i * 2),
        lng: -120 + (i * 3),
        phone: `(310) 555-${String(i).padStart(4, '0')}`,
        hours: 'Daily: 9am-6pm',
        openingDate: '2024-01-01',
        rivianUrl: `https://rivian.com/locations/test-${i + 1}`,
        services: ['Test Drives', 'Sales'],
        isOpen: true
    }));
}

/**
 * Wait for a specific amount of time (for async tests)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock fetch response
 * @param {*} data - Data to return
 * @param {number} status - HTTP status code
 * @returns {Promise}
 */
function mockFetchResponse(data, status = 200) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data))
    });
}

/**
 * Mock fetch error
 * @param {string} message - Error message
 * @returns {Promise}
 */
function mockFetchError(message = 'Network error') {
    return Promise.reject(new Error(message));
}

/**
 * Create a mock DOM event
 * @param {string} type - Event type (e.g., 'click', 'input')
 * @param {object} properties - Event properties
 * @returns {Event}
 */
function createMockEvent(type, properties = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, properties);
    return event;
}

/**
 * Simulate user input
 * @param {HTMLElement} element - Input element
 * @param {string} value - Value to set
 */
function simulateInput(element, value) {
    element.value = value;
    const event = createMockEvent('input', { target: element });
    element.dispatchEvent(event);
}

/**
 * Simulate button click
 * @param {HTMLElement} element - Button element
 */
function simulateClick(element) {
    const event = createMockEvent('click');
    element.dispatchEvent(event);
}

/**
 * Get all console error calls
 * @returns {array} Array of error messages
 */
function getConsoleErrors() {
    return console.error.mock.calls.map(call => call[0]);
}

/**
 * Clear all console mocks
 */
function clearConsoleMocks() {
    if (console.log.mockClear) console.log.mockClear();
    if (console.error.mockClear) console.error.mockClear();
    if (console.warn.mockClear) console.warn.mockClear();
}

/**
 * Check if coordinates are valid
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
function isValidCoordinate(lat, lng) {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
}

/**
 * Generate random coordinates within bounds
 * @param {object} bounds - { minLat, maxLat, minLng, maxLng }
 * @returns {object} { lat, lng }
 */
function randomCoordinates(bounds = {}) {
    const { minLat = -90, maxLat = 90, minLng = -180, maxLng = 180 } = bounds;
    return {
        lat: minLat + Math.random() * (maxLat - minLat),
        lng: minLng + Math.random() * (maxLng - minLng)
    };
}

module.exports = {
    createMockLocation,
    createMockLocations,
    wait,
    mockFetchResponse,
    mockFetchError,
    createMockEvent,
    simulateInput,
    simulateClick,
    getConsoleErrors,
    clearConsoleMocks,
    isValidCoordinate,
    randomCoordinates
};
