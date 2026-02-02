// features.js - User Features (Favorites, Sharing, Print/Export, Recent Locations)

// Feature State Management
const FeatureState = {
    favorites: new Set(),
    recentLocations: [],
    maxRecentLocations: 10
};

// ============================================================================
// 1. FAVORITES SYSTEM
// ============================================================================

const FavoritesManager = {
    // Initialize favorites from localStorage
    init() {
        try {
            const stored = localStorage.getItem('rivian_favorites');
            if (stored) {
                const parsed = JSON.parse(stored);
                FeatureState.favorites = new Set(parsed);
            }
            this.syncAcrossTabs();
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    },

    // Add location to favorites
    addFavorite(locationId) {
        try {
            FeatureState.favorites.add(locationId);
            this.saveFavorites();
            this.updateUI();
            this.showNotification(`Added to favorites`);
        } catch (error) {
            console.error('Failed to add favorite:', error);
        }
    },

    // Remove location from favorites
    removeFavorite(locationId) {
        try {
            FeatureState.favorites.delete(locationId);
            this.saveFavorites();
            this.updateUI();
            this.showNotification(`Removed from favorites`);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    },

    // Toggle favorite status
    toggleFavorite(locationId) {
        if (FeatureState.favorites.has(locationId)) {
            this.removeFavorite(locationId);
        } else {
            this.addFavorite(locationId);
        }
    },

    // Check if location is favorited
    isFavorite(locationId) {
        return FeatureState.favorites.has(locationId);
    },

    // Get all favorite locations
    getFavorites() {
        return Array.from(FeatureState.favorites);
    },

    // Get favorite locations count
    getCount() {
        return FeatureState.favorites.size;
    },

    // Save favorites to localStorage
    saveFavorites() {
        try {
            const favArray = Array.from(FeatureState.favorites);
            localStorage.setItem('rivian_favorites', JSON.stringify(favArray));
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    },

    // Update UI elements
    updateUI() {
        // Update favorite buttons
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            const locationId = parseInt(btn.dataset.locationId);
            const isFav = this.isFavorite(locationId);
            btn.classList.toggle('active', isFav);
            btn.innerHTML = isFav ? this.getHeartIcon(true) : this.getHeartIcon(false);
            btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
        });

        // Update favorites count badge
        const badge = document.getElementById('favoritesCountBadge');
        if (badge) {
            const count = this.getCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Update favorites filter button
        const filterBtn = document.getElementById('favoritesFilterBtn');
        if (filterBtn) {
            const count = this.getCount();
            filterBtn.disabled = count === 0;
            filterBtn.textContent = `My Favorites (${count})`;
        }
    },

    // Get heart icon SVG
    getHeartIcon(filled = false) {
        if (filled) {
            return `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>`;
    },

    // Filter to show only favorites
    filterFavorites() {
        if (!rivianLocations || this.getCount() === 0) return;

        const favoriteLocations = rivianLocations.filter(loc =>
            this.isFavorite(loc.id)
        );

        // Update the location list and map
        if (typeof LocationManager !== 'undefined') {
            LocationManager.renderLocationList(favoriteLocations);
            LocationManager.updateStats(favoriteLocations);
            LocationManager.updateMapMarkers(favoriteLocations);
        }

        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('favoritesFilterBtn')?.classList.add('active');
    },

    // Export favorites to JSON file
    exportFavorites() {
        try {
            const favorites = this.getFavorites();
            if (favorites.length === 0) {
                alert('No favorites to export');
                return;
            }

            const favoriteLocations = rivianLocations.filter(loc =>
                favorites.includes(loc.id)
            );

            const data = {
                exported: new Date().toISOString(),
                count: favorites.length,
                favorites: favoriteLocations
            };

            const blob = new Blob([JSON.stringify(data, null, 2)],
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rivian-favorites-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Favorites exported successfully');
        } catch (error) {
            console.error('Failed to export favorites:', error);
            alert('Failed to export favorites');
        }
    },

    // Import favorites from JSON file
    importFavorites(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.favorites && Array.isArray(data.favorites)) {
                        data.favorites.forEach(loc => {
                            if (loc.id) {
                                FeatureState.favorites.add(loc.id);
                            }
                        });
                        this.saveFavorites();
                        this.updateUI();
                        this.showNotification(`Imported ${data.favorites.length} favorites`);
                    } else {
                        alert('Invalid favorites file format');
                    }
                } catch (error) {
                    alert('Failed to parse favorites file');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Failed to import favorites:', error);
            alert('Failed to import favorites');
        }
    },

    // Sync favorites across tabs using storage events
    syncAcrossTabs() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'rivian_favorites' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    FeatureState.favorites = new Set(parsed);
                    this.updateUI();
                } catch (error) {
                    console.error('Failed to sync favorites across tabs:', error);
                }
            }
        });
    },

    // Show notification
    showNotification(message) {
        const notification = document.getElementById('featureNotification');
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }
};

// ============================================================================
// 2. LOCATION SHARING
// ============================================================================

const SharingManager = {
    // Initialize sharing features
    init() {
        // Check for location in URL on page load
        this.handleDeepLink();
    },

    // Handle deep link from URL
    handleDeepLink() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const locationId = urlParams.get('location');

            if (locationId) {
                const id = parseInt(locationId);
                const location = rivianLocations.find(loc => loc.id === id);

                if (location) {
                    // Wait for map to load, then fly to location
                    setTimeout(() => {
                        if (typeof LocationManager !== 'undefined') {
                            LocationManager.flyToLocation(location.lng, location.lat, location.id);
                        }
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Failed to handle deep link:', error);
        }
    },

    // Generate shareable URL for location
    generateShareUrl(locationId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?location=${locationId}`;
    },

    // Copy share link to clipboard
    async copyShareLink(locationId, locationName) {
        try {
            const shareUrl = this.generateShareUrl(locationId);
            await navigator.clipboard.writeText(shareUrl);
            FavoritesManager.showNotification('Link copied to clipboard!');
        } catch (error) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(this.generateShareUrl(locationId));
        }
    },

    // Fallback clipboard copy method
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            FavoritesManager.showNotification('Link copied to clipboard!');
        } catch (error) {
            console.error('Fallback copy failed:', error);
            alert('Failed to copy link');
        }

        document.body.removeChild(textArea);
    },

    // Share via Web Share API (mobile)
    async shareViaWebShare(locationId, locationName, locationAddress) {
        if (!navigator.share) {
            // Fallback to copy link
            this.copyShareLink(locationId, locationName);
            return;
        }

        try {
            const shareUrl = this.generateShareUrl(locationId);
            await navigator.share({
                title: `Rivian ${locationName}`,
                text: `Check out this Rivian location: ${locationName} - ${locationAddress}`,
                url: shareUrl
            });
        } catch (error) {
            // User cancelled or error occurred
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                this.copyShareLink(locationId, locationName);
            }
        }
    },

    // Share to Twitter
    shareToTwitter(locationId, locationName, locationAddress) {
        const shareUrl = this.generateShareUrl(locationId);
        const text = `Check out ${locationName} - ${locationAddress}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    },

    // Share to Facebook
    shareToFacebook(locationId) {
        const shareUrl = this.generateShareUrl(locationId);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(facebookUrl, '_blank', 'width=550,height=420');
    },

    // Get share button HTML
    getShareButtonHTML(location) {
        return `
            <button class="share-btn"
                    data-location-id="${location.id}"
                    data-location-name="${location.name}"
                    data-location-address="${location.address}"
                    onclick="SharingManager.handleShareClick(this)"
                    title="Share this location"
                    aria-label="Share ${location.name}">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
            </button>
        `;
    },

    // Handle share button click
    handleShareClick(button) {
        const locationId = parseInt(button.dataset.locationId);
        const locationName = button.dataset.locationName;
        const locationAddress = button.dataset.locationAddress;

        // Show share menu
        this.showShareMenu(locationId, locationName, locationAddress, button);
    },

    // Show share menu
    showShareMenu(locationId, locationName, locationAddress, button) {
        // Remove existing menu if any
        const existingMenu = document.querySelector('.share-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'share-menu';

        const hasWebShare = navigator.share !== undefined;

        menu.innerHTML = `
            ${hasWebShare ? `
                <button onclick="SharingManager.shareViaWebShare(${locationId}, '${locationName}', '${locationAddress}')">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                    </svg>
                    Share...
                </button>
            ` : ''}
            <button onclick="SharingManager.copyShareLink(${locationId}, '${locationName}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Link
            </button>
            <button onclick="SharingManager.shareToTwitter(${locationId}, '${locationName}', '${locationAddress}')">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
                Twitter
            </button>
            <button onclick="SharingManager.shareToFacebook(${locationId})">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
                Facebook
            </button>
        `;

        // Position menu near button
        document.body.appendChild(menu);
        const rect = button.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }
};

// ============================================================================
// 3. PRINT/EXPORT FEATURES
// ============================================================================

const ExportManager = {
    // Print location details
    printLocation(location) {
        const printWindow = window.open('', '_blank');
        const printContent = this.generatePrintContent([location]);

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 250);
    },

    // Print all visible locations
    printAllLocations() {
        const printWindow = window.open('', '_blank');
        const printContent = this.generatePrintContent(rivianLocations);

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 250);
    },

    // Generate print content HTML
    generatePrintContent(locations) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rivian Locations</title>
                <style>
                    @media print {
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            font-size: 12pt;
                        }
                        h1 {
                            color: #78BE21;
                            border-bottom: 2px solid #78BE21;
                            padding-bottom: 10px;
                        }
                        .location {
                            page-break-inside: avoid;
                            margin-bottom: 20px;
                            border: 1px solid #e5e5e5;
                            padding: 15px;
                            border-radius: 4px;
                        }
                        .location-name {
                            font-weight: bold;
                            font-size: 14pt;
                            margin-bottom: 5px;
                        }
                        .location-type {
                            display: inline-block;
                            padding: 3px 8px;
                            background: #e8f5e9;
                            color: #2e7d32;
                            border-radius: 4px;
                            font-size: 10pt;
                            margin-bottom: 10px;
                        }
                        .location-address {
                            color: #666;
                            margin-bottom: 5px;
                        }
                        .location-hours {
                            color: #78BE21;
                            font-weight: 500;
                        }
                        .footer {
                            margin-top: 30px;
                            text-align: center;
                            color: #999;
                            font-size: 10pt;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>Rivian Locations (${locations.length})</h1>
                <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
                ${locations.map(loc => `
                    <div class="location">
                        <div class="location-type">${loc.type}</div>
                        <div class="location-name">${loc.name}</div>
                        <div class="location-address">
                            ${loc.address}<br>
                            ${loc.city}
                        </div>
                        ${loc.hours ? `<div class="location-hours">${loc.hours}</div>` : ''}
                        ${loc.phone ? `<div>Phone: ${loc.phone}</div>` : ''}
                        ${loc.services && loc.services.length > 0 ?
                            `<div style="margin-top: 5px;">Services: ${loc.services.join(', ')}</div>`
                            : ''}
                    </div>
                `).join('')}
                <div class="footer">
                    Printed from RivianSpotter.com
                </div>
            </body>
            </html>
        `;
    },

    // Export locations as CSV
    exportCSV(locations) {
        try {
            const headers = ['Name', 'Type', 'Address', 'City', 'State', 'Phone', 'Hours', 'Services'];
            const rows = locations.map(loc => [
                loc.name,
                loc.type,
                loc.address,
                loc.city,
                loc.state,
                loc.phone || '',
                loc.hours || '',
                (loc.services || []).join('; ')
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row =>
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rivian-locations-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            FavoritesManager.showNotification('CSV exported successfully');
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export CSV');
        }
    },

    // Export as JSON
    exportJSON(locations) {
        try {
            const data = {
                exported: new Date().toISOString(),
                count: locations.length,
                locations: locations
            };

            const blob = new Blob([JSON.stringify(data, null, 2)],
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rivian-locations-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            FavoritesManager.showNotification('JSON exported successfully');
        } catch (error) {
            console.error('Failed to export JSON:', error);
            alert('Failed to export JSON');
        }
    }
};

// ============================================================================
// 4. RECENT LOCATIONS
// ============================================================================

const RecentLocationsManager = {
    // Initialize recent locations from localStorage
    init() {
        try {
            const stored = localStorage.getItem('rivian_recent_locations');
            if (stored) {
                FeatureState.recentLocations = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load recent locations:', error);
        }
    },

    // Add location to recent list
    addRecent(locationId) {
        try {
            // Remove if already exists
            FeatureState.recentLocations = FeatureState.recentLocations.filter(
                id => id !== locationId
            );

            // Add to front
            FeatureState.recentLocations.unshift(locationId);

            // Keep only max recent locations
            if (FeatureState.recentLocations.length > FeatureState.maxRecentLocations) {
                FeatureState.recentLocations = FeatureState.recentLocations.slice(
                    0, FeatureState.maxRecentLocations
                );
            }

            this.saveRecent();
            this.updateUI();
        } catch (error) {
            console.error('Failed to add recent location:', error);
        }
    },

    // Save recent locations to localStorage
    saveRecent() {
        try {
            localStorage.setItem('rivian_recent_locations',
                JSON.stringify(FeatureState.recentLocations));
        } catch (error) {
            console.error('Failed to save recent locations:', error);
        }
    },

    // Clear all recent locations
    clearRecent() {
        FeatureState.recentLocations = [];
        this.saveRecent();
        this.updateUI();
        FavoritesManager.showNotification('Recent locations cleared');
    },

    // Get recent locations
    getRecent() {
        return FeatureState.recentLocations.map(id =>
            rivianLocations.find(loc => loc.id === id)
        ).filter(loc => loc !== undefined);
    },

    // Update UI
    updateUI() {
        const container = document.getElementById('recentLocationsList');
        if (!container) return;

        const recentLocs = this.getRecent();

        if (recentLocs.length === 0) {
            container.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #999; font-size: 0.9rem;">
                    No recent locations
                </div>
            `;
            return;
        }

        container.innerHTML = recentLocs.map(loc => `
            <div class="recent-location-item"
                 onclick="LocationManager.flyToLocation(${loc.lng}, ${loc.lat}, ${loc.id}); RecentLocationsManager.addRecent(${loc.id})">
                <div class="recent-location-type ${loc.type === 'Demo Center' ? 'demo-center' : loc.type === 'Outpost' ? 'outpost' : ''}">${loc.type}</div>
                <div class="recent-location-name">${loc.name}</div>
                <div class="recent-location-city">${loc.city}</div>
            </div>
        `).join('');
    }
};

// ============================================================================
// INITIALIZATION AND GLOBAL SETUP
// ============================================================================

// Initialize all features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize features
    FavoritesManager.init();
    SharingManager.init();
    RecentLocationsManager.init();

    // Setup UI event handlers
    setupFeatureEventHandlers();
});

// Setup event handlers for feature UI
function setupFeatureEventHandlers() {
    // Favorites filter button
    const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
    if (favoritesFilterBtn) {
        favoritesFilterBtn.addEventListener('click', () => {
            FavoritesManager.filterFavorites();
        });
    }

    // Export/Import favorites buttons
    const exportFavBtn = document.getElementById('exportFavoritesBtn');
    if (exportFavBtn) {
        exportFavBtn.addEventListener('click', () => {
            FavoritesManager.exportFavorites();
        });
    }

    const importFavBtn = document.getElementById('importFavoritesBtn');
    const importFavInput = document.getElementById('importFavoritesInput');
    if (importFavBtn && importFavInput) {
        importFavBtn.addEventListener('click', () => {
            importFavInput.click();
        });
        importFavInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                FavoritesManager.importFavorites(e.target.files[0]);
            }
        });
    }

    // Clear recent locations button
    const clearRecentBtn = document.getElementById('clearRecentBtn');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            if (confirm('Clear all recent locations?')) {
                RecentLocationsManager.clearRecent();
            }
        });
    }

    // Export buttons
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            ExportManager.exportCSV(rivianLocations);
        });
    }

    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', () => {
            ExportManager.exportJSON(rivianLocations);
        });
    }

    const printAllBtn = document.getElementById('printAllBtn');
    if (printAllBtn) {
        printAllBtn.addEventListener('click', () => {
            ExportManager.printAllLocations();
        });
    }
}

// Intercept LocationManager.flyToLocation to track recent locations
if (typeof LocationManager !== 'undefined') {
    const originalFlyToLocation = LocationManager.flyToLocation;
    LocationManager.flyToLocation = function(lng, lat, id) {
        RecentLocationsManager.addRecent(id);
        return originalFlyToLocation.call(this, lng, lat, id);
    };
}

// ============================================================================
// 5. OPEN NOW FILTER
// ============================================================================

const OpenNowFilter = {
    // Day name mappings
    dayNames: ['Sun', 'Sunday', 'Mon', 'Monday', 'Tue', 'Tues', 'Tuesday', 'Wed', 'Wednesday',
               'Thur', 'Thurs', 'Thursday', 'Fri', 'Friday', 'Sat', 'Saturday'],

    dayAbbreviations: {
        'sun': 0, 'sunday': 0,
        'mon': 1, 'monday': 1,
        'tue': 2, 'tues': 2, 'tuesday': 2,
        'wed': 3, 'wednesday': 3,
        'thur': 4, 'thurs': 4, 'thursday': 4,
        'fri': 5, 'friday': 5,
        'sat': 6, 'saturday': 6
    },

    // Check if a location is currently open based on hours string
    isLocationOpen(location) {
        try {
            // If location explicitly marked as not open, return false
            if (location.isOpen === false) {
                return false;
            }

            // If no hours specified, assume open (can't determine)
            if (!location.hours || location.hours.trim() === '') {
                return null; // Unknown
            }

            // Check for "Temporarily closed" or similar
            const hoursLower = location.hours.toLowerCase();
            if (hoursLower.includes('temporarily closed') ||
                hoursLower.includes('closed for') ||
                hoursLower.includes('permanently closed')) {
                return false;
            }

            const now = new Date();
            const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTimeInMinutes = currentHours * 60 + currentMinutes;

            // Parse the hours string
            const todaySchedule = this.getTodaySchedule(location.hours, currentDay);

            if (!todaySchedule) {
                return false; // Closed today
            }

            // Check if current time falls within any open period
            for (const period of todaySchedule) {
                if (currentTimeInMinutes >= period.open && currentTimeInMinutes < period.close) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking if location is open:', error, location.name);
            return null; // Unknown on error
        }
    },

    // Get today's schedule from hours string
    getTodaySchedule(hoursString, currentDay) {
        try {
            // Handle different formats:
            // "Mon-Sat: 10am-7pm, Sun: 11am-6pm"
            // "General: Mon-Sat: 9am-5pm, Sun: Closed | Service: Mon-Fri: 8am-5pm"
            // "Mon-Sun: 9:00am-6:00pm"
            // "Sun-Thu: 10:00am-9:00pm, Fri-Sat: 10:00am-10:00pm"

            const schedules = [];

            // Split by | to handle General/Service sections - only use General hours
            let relevantHours = hoursString;
            if (hoursString.includes('|')) {
                const sections = hoursString.split('|');
                // Use the first section (usually General hours)
                relevantHours = sections[0].replace(/^General:\s*/i, '');
            }

            // Split by comma to get individual day/time segments
            const segments = relevantHours.split(',').map(s => s.trim());

            for (const segment of segments) {
                const parsed = this.parseTimeSegment(segment);
                if (parsed && this.isDayInRange(currentDay, parsed.days)) {
                    if (parsed.closed) {
                        return null; // Explicitly closed
                    }
                    schedules.push({ open: parsed.openTime, close: parsed.closeTime });
                }
            }

            return schedules.length > 0 ? schedules : null;
        } catch (error) {
            console.error('Error parsing hours:', error, hoursString);
            return null;
        }
    },

    // Parse a time segment like "Mon-Sat: 10am-7pm" or "Sun: Closed"
    parseTimeSegment(segment) {
        try {
            // Match patterns like "Mon-Sat: 10am-7pm", "Sun: 11am-6pm", "Mon-Sun: 9:00am-6:00pm"
            const match = segment.match(/([A-Za-z\-&,\s]+):\s*(.+)/);
            if (!match) return null;

            const daysStr = match[1].trim();
            const timeStr = match[2].trim();

            // Check for closed
            if (timeStr.toLowerCase() === 'closed') {
                return { days: this.parseDays(daysStr), closed: true };
            }

            // Parse time range like "10am-7pm" or "10:00am-7:00pm"
            const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a|p)?[–-](\d{1,2}):?(\d{2})?\s*(am|pm|a|p)?/i);
            if (!timeMatch) return null;

            const openHour = parseInt(timeMatch[1]);
            const openMinutes = parseInt(timeMatch[2] || '0');
            const openPeriod = (timeMatch[3] || 'am').toLowerCase();

            const closeHour = parseInt(timeMatch[4]);
            const closeMinutes = parseInt(timeMatch[5] || '0');
            const closePeriod = (timeMatch[6] || 'pm').toLowerCase();

            const openTime = this.convertTo24Hour(openHour, openMinutes, openPeriod);
            const closeTime = this.convertTo24Hour(closeHour, closeMinutes, closePeriod);

            return {
                days: this.parseDays(daysStr),
                openTime: openTime,
                closeTime: closeTime
            };
        } catch (error) {
            console.error('Error parsing time segment:', error, segment);
            return null;
        }
    },

    // Parse days string like "Mon-Sat", "Sun", "Mon-Fri", "Mon & Tues"
    parseDays(daysStr) {
        const days = [];
        const lowerStr = daysStr.toLowerCase();

        // Handle ranges like "Mon-Sat", "Sun-Thu"
        const rangeMatch = lowerStr.match(/(\w+)\s*[–-]\s*(\w+)/);
        if (rangeMatch) {
            const startDay = this.dayAbbreviations[rangeMatch[1]];
            const endDay = this.dayAbbreviations[rangeMatch[2]];

            if (startDay !== undefined && endDay !== undefined) {
                if (startDay <= endDay) {
                    for (let d = startDay; d <= endDay; d++) {
                        days.push(d);
                    }
                } else {
                    // Handle wrap-around (e.g., Sun-Thu)
                    for (let d = startDay; d <= 6; d++) {
                        days.push(d);
                    }
                    for (let d = 0; d <= endDay; d++) {
                        days.push(d);
                    }
                }
            }
        } else {
            // Single day or comma/ampersand separated
            const dayParts = lowerStr.split(/[,&]/);
            for (const part of dayParts) {
                const trimmed = part.trim();
                if (this.dayAbbreviations[trimmed] !== undefined) {
                    days.push(this.dayAbbreviations[trimmed]);
                }
            }
        }

        return days;
    },

    // Check if current day is in the days array
    isDayInRange(currentDay, days) {
        return days.includes(currentDay);
    },

    // Convert hour to 24-hour format in minutes
    convertTo24Hour(hour, minutes, period) {
        let hour24 = hour;
        const periodLower = period.charAt(0); // 'a' or 'p'

        if (periodLower === 'p' && hour !== 12) {
            hour24 = hour + 12;
        } else if (periodLower === 'a' && hour === 12) {
            hour24 = 0;
        }

        return hour24 * 60 + minutes;
    },

    // Toggle open now filter
    toggle() {
        AppState.openNowFilter = !AppState.openNowFilter;

        // Disable coming soon filter if open now is enabled
        if (AppState.openNowFilter && AppState.comingSoonFilter) {
            AppState.comingSoonFilter = false;
            this.updateComingSoonUI();
        }

        this.updateUI();
        LocationManager.filterLocations();
    },

    // Update UI for open now button
    updateUI() {
        const btn = document.getElementById('openNowFilterBtn');
        if (btn) {
            btn.classList.toggle('active', AppState.openNowFilter);
        }
    },

    // Update coming soon UI (called when toggling off)
    updateComingSoonUI() {
        const btn = document.getElementById('comingSoonFilterBtn');
        if (btn) {
            btn.classList.toggle('active', AppState.comingSoonFilter);
        }
    }
};

// ============================================================================
// 6. COMING SOON FILTER
// ============================================================================

const ComingSoonFilter = {
    // Check if a location is coming soon (not yet open)
    isComingSoon(location) {
        // Check if explicitly marked as not open
        if (location.isOpen === false) {
            return true;
        }

        // Check if opening date is in the future
        if (location.openingDate) {
            const openingDate = new Date(location.openingDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (openingDate > today) {
                return true;
            }
        }

        // Check hours for "coming soon" or "opening" mentions
        if (location.hours) {
            const hoursLower = location.hours.toLowerCase();
            if (hoursLower.includes('coming soon') ||
                hoursLower.includes('opening') ||
                hoursLower.includes('temporarily closed')) {
                return true;
            }
        }

        return false;
    },

    // Get count of coming soon locations
    getCount() {
        if (!rivianLocations || !Array.isArray(rivianLocations)) return 0;
        return rivianLocations.filter(loc => this.isComingSoon(loc)).length;
    },

    // Toggle coming soon filter
    toggle() {
        AppState.comingSoonFilter = !AppState.comingSoonFilter;

        // Disable open now filter if coming soon is enabled
        if (AppState.comingSoonFilter && AppState.openNowFilter) {
            AppState.openNowFilter = false;
            OpenNowFilter.updateUI();
        }

        this.updateUI();
        LocationManager.filterLocations();
    },

    // Update UI
    updateUI() {
        const btn = document.getElementById('comingSoonFilterBtn');
        if (btn) {
            btn.classList.toggle('active', AppState.comingSoonFilter);

            const count = this.getCount();
            const badge = btn.querySelector('.coming-soon-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }
    },

    // Initialize - update badge count
    init() {
        this.updateUI();
    }
};

// Add initialization for new features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Coming Soon filter after a small delay to ensure locations are loaded
    setTimeout(() => {
        ComingSoonFilter.init();
    }, 200);
});

// Make managers globally accessible
window.FavoritesManager = FavoritesManager;
window.SharingManager = SharingManager;
window.ExportManager = ExportManager;
window.RecentLocationsManager = RecentLocationsManager;
window.OpenNowFilter = OpenNowFilter;
window.ComingSoonFilter = ComingSoonFilter;
