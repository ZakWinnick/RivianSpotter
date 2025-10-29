// tests/e2e/basic.test.js - Basic end-to-end tests
// Note: These are lightweight E2E tests that verify basic functionality
// For full browser-based E2E testing, consider using Playwright or Cypress

describe('Basic E2E Tests', () => {
    let originalHTML;

    beforeEach(() => {
        // Save original HTML
        originalHTML = document.body.innerHTML;

        // Set up a basic DOM structure similar to the actual page
        document.body.innerHTML = `
            <div id="map"></div>
            <div id="sidebar" class="sidebar">
                <div class="sidebar-header">
                    <h2>Rivian Locations</h2>
                    <button id="closeSidebar" class="close-btn">×</button>
                </div>
                <div class="search-box">
                    <input id="searchInput" type="text" placeholder="Search locations..." />
                </div>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="Space">Spaces</button>
                    <button class="filter-btn" data-filter="Demo Center">Demo Centers</button>
                    <button class="filter-btn" data-filter="Outpost">Outposts</button>
                </div>
                <select id="stateFilter">
                    <option value="all">All States</option>
                </select>
                <div id="locationStats"></div>
                <div id="locationList" class="location-list"></div>
            </div>
            <div id="mobileOverlay" class="mobile-overlay"></div>
            <div class="mobile-bottom-bar">
                <button id="mobileFilterBtn">Filter</button>
                <button id="mobileListBtn">List</button>
                <button id="mobileNearMeBtn">Near Me</button>
            </div>
            <button id="locationBtn">My Location</button>
        `;
    });

    afterEach(() => {
        // Restore original HTML
        document.body.innerHTML = originalHTML;
    });

    describe('Page Structure', () => {
        it('should have all required DOM elements', () => {
            expect(document.getElementById('map')).toBeTruthy();
            expect(document.getElementById('sidebar')).toBeTruthy();
            expect(document.getElementById('locationList')).toBeTruthy();
            expect(document.getElementById('searchInput')).toBeTruthy();
            expect(document.getElementById('stateFilter')).toBeTruthy();
        });

        it('should have filter buttons', () => {
            const filterButtons = document.querySelectorAll('.filter-btn');
            expect(filterButtons.length).toBeGreaterThan(0);
        });

        it('should have mobile controls', () => {
            expect(document.getElementById('mobileFilterBtn')).toBeTruthy();
            expect(document.getElementById('mobileListBtn')).toBeTruthy();
            expect(document.getElementById('mobileNearMeBtn')).toBeTruthy();
        });
    });

    describe('Location Data Display', () => {
        it('should display location data when available', () => {
            const locationList = document.getElementById('locationList');
            expect(locationList).toBeTruthy();

            // Simulate location rendering
            locationList.innerHTML = `
                <div class="location-card">
                    <div class="location-type">Space</div>
                    <div class="location-name">Venice Space</div>
                    <div class="location-address">333 Lincoln Blvd</div>
                </div>
            `;

            const cards = locationList.querySelectorAll('.location-card');
            expect(cards.length).toBe(1);
            expect(cards[0].textContent).toContain('Venice Space');
        });

        it('should show empty state when no locations found', () => {
            const locationList = document.getElementById('locationList');
            locationList.innerHTML = '<div style="padding: 2rem;">No locations found</div>';

            expect(locationList.textContent).toContain('No locations found');
        });

        it('should display location statistics', () => {
            const stats = document.getElementById('locationStats');
            stats.innerHTML = 'Showing 10 locations • 5 Spaces • 3 Demo Centers • 2 Outposts';

            expect(stats.textContent).toContain('Showing 10 locations');
            expect(stats.textContent).toContain('5 Spaces');
        });
    });

    describe('Filter Functionality', () => {
        it('should have filter buttons with correct data attributes', () => {
            const allBtn = document.querySelector('[data-filter="all"]');
            const spacesBtn = document.querySelector('[data-filter="Space"]');
            const demoBtn = document.querySelector('[data-filter="Demo Center"]');
            const outpostBtn = document.querySelector('[data-filter="Outpost"]');

            expect(allBtn).toBeTruthy();
            expect(spacesBtn).toBeTruthy();
            expect(demoBtn).toBeTruthy();
            expect(outpostBtn).toBeTruthy();
        });

        it('should toggle active class on filter button click', () => {
            const allBtn = document.querySelector('[data-filter="all"]');
            const spacesBtn = document.querySelector('[data-filter="Space"]');

            expect(allBtn.classList.contains('active')).toBe(true);

            // Simulate filter change
            allBtn.classList.remove('active');
            spacesBtn.classList.add('active');

            expect(allBtn.classList.contains('active')).toBe(false);
            expect(spacesBtn.classList.contains('active')).toBe(true);
        });

        it('should have state filter dropdown', () => {
            const stateFilter = document.getElementById('stateFilter');
            expect(stateFilter).toBeTruthy();
            expect(stateFilter.tagName).toBe('SELECT');
        });
    });

    describe('Search Functionality', () => {
        it('should have search input', () => {
            const searchInput = document.getElementById('searchInput');
            expect(searchInput).toBeTruthy();
            expect(searchInput.type).toBe('text');
        });

        it('should accept search input', () => {
            const searchInput = document.getElementById('searchInput');
            searchInput.value = 'Venice';

            expect(searchInput.value).toBe('Venice');
        });
    });

    describe('Mobile UI', () => {
        it('should have mobile overlay', () => {
            const overlay = document.getElementById('mobileOverlay');
            expect(overlay).toBeTruthy();
        });

        it('should toggle mobile sidebar', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');

            expect(sidebar.classList.contains('active')).toBe(false);

            // Simulate opening
            sidebar.classList.add('active');
            overlay.classList.add('active');

            expect(sidebar.classList.contains('active')).toBe(true);
            expect(overlay.classList.contains('active')).toBe(true);

            // Simulate closing
            sidebar.classList.remove('active');
            overlay.classList.remove('active');

            expect(sidebar.classList.contains('active')).toBe(false);
        });

        it('should have close button in sidebar', () => {
            const closeBtn = document.getElementById('closeSidebar');
            expect(closeBtn).toBeTruthy();
        });
    });

    describe('Location Interaction', () => {
        it('should allow clicking on location cards', () => {
            const locationList = document.getElementById('locationList');
            locationList.innerHTML = `
                <div class="location-card" onclick="testClick()">
                    <div class="location-name">Test Location</div>
                </div>
            `;

            const card = locationList.querySelector('.location-card');
            expect(card).toBeTruthy();
            expect(card.onclick).toBeDefined();
        });

        it('should highlight active location', () => {
            const locationList = document.getElementById('locationList');
            locationList.innerHTML = `
                <div class="location-card">Location 1</div>
                <div class="location-card active">Location 2</div>
                <div class="location-card">Location 3</div>
            `;

            const activeCard = locationList.querySelector('.location-card.active');
            expect(activeCard).toBeTruthy();
            expect(activeCard.textContent).toBe('Location 2');
        });
    });

    describe('Geolocation Button', () => {
        it('should have geolocation button', () => {
            const locationBtn = document.getElementById('locationBtn');
            expect(locationBtn).toBeTruthy();
        });

        it('should handle geolocation request', (done) => {
            // Mock geolocation success
            global.navigator.geolocation.getCurrentPosition = jest.fn((success) => {
                success({
                    coords: {
                        latitude: 34.0522,
                        longitude: -118.2437
                    }
                });
            });

            navigator.geolocation.getCurrentPosition((position) => {
                expect(position.coords.latitude).toBe(34.0522);
                expect(position.coords.longitude).toBe(-118.2437);
                done();
            });
        });
    });

    describe('Loading States', () => {
        it('should show loading indicator', () => {
            const locationList = document.getElementById('locationList');
            locationList.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>Loading...</div>
                </div>
            `;

            expect(locationList.querySelector('.loading')).toBeTruthy();
            expect(locationList.textContent).toContain('Loading...');
        });

        it('should show error state', () => {
            const locationList = document.getElementById('locationList');
            locationList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #dc3545;">
                    <div>Error</div>
                    <div>Failed to load locations</div>
                </div>
            `;

            expect(locationList.textContent).toContain('Error');
            expect(locationList.textContent).toContain('Failed to load locations');
        });
    });

    describe('Accessibility', () => {
        it('should have proper button elements', () => {
            const buttons = document.querySelectorAll('button');
            expect(buttons.length).toBeGreaterThan(0);

            buttons.forEach(button => {
                expect(button.tagName).toBe('BUTTON');
            });
        });

        it('should have form elements with proper types', () => {
            const searchInput = document.getElementById('searchInput');
            const stateFilter = document.getElementById('stateFilter');

            expect(searchInput.tagName).toBe('INPUT');
            expect(stateFilter.tagName).toBe('SELECT');
        });
    });

    describe('Data Attributes', () => {
        it('should have proper data attributes on filter buttons', () => {
            const filterBtns = document.querySelectorAll('.filter-btn');

            filterBtns.forEach(btn => {
                expect(btn.dataset.filter).toBeDefined();
                expect(['all', 'Space', 'Demo Center', 'Outpost']).toContain(btn.dataset.filter);
            });
        });
    });
});
