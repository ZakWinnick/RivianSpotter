// ============================================
// API FUNCTIONS
// ============================================

const AdminAPI = {
    // Generic API request handler
    async apiRequest(method, data = null, params = {}) {
        const url = new URL(AdminConfig.API_URL, window.location.origin);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add auth header for non-GET requests
        if (method !== 'GET') {
            options.headers['Authorization'] = `Bearer ${AdminConfig.ADMIN_TOKEN}`;
        }

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'API request failed');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            AdminUI.showNotification(`Error: ${error.message}`, 'error');
            throw error;
        }
    },

    // Load locations from API or fallback to JS file
    async loadLocations() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(AdminConfig.API_URL, {
                signal: controller.signal,
                cache: 'no-cache'
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                await this.loadFromJSFile();
                return;
            }

            const locations = await response.json();
            AdminState.setLocations(locations);
            AdminUI.renderLocations();
            AdminUI.updateStats();

            document.getElementById('connectionStatus').textContent = '● API Connected';
            document.getElementById('connectionStatus').style.color = '#4CAF50';
        } catch (error) {
            console.error('Error loading from API, falling back to JS file:', error);
            await this.loadFromJSFile();
        }
    },

    // Fallback: Load from JS file if API is not available
    async loadFromJSFile() {
        console.log('loadFromJSFile() called');
        try {
            const script = document.createElement('script');
            script.src = './js/locations.js?v=20250926b';
            console.log('Loading script from:', script.src);

            await new Promise((resolve, reject) => {
                script.onload = () => {
                    console.log('Script loaded, checking rivianLocations...');
                    if (typeof rivianLocations !== 'undefined' && Array.isArray(rivianLocations)) {
                        console.log('Found rivianLocations with', rivianLocations.length, 'items');
                        AdminState.setLocations([...rivianLocations]);
                        resolve();
                    } else {
                        reject(new Error('rivianLocations not found after script load'));
                    }
                };
                script.onerror = (e) => {
                    console.error('Script error:', e);
                    reject(new Error('Failed to load locations.js script'));
                };
                document.head.appendChild(script);
            });

            console.log('About to render locations...');
            AdminUI.renderLocations();
            AdminUI.updateStats();

            document.getElementById('connectionStatus').textContent = '● File Mode (Read-Only)';
            document.getElementById('connectionStatus').style.color = '#fbbf24';
            AdminUI.showNotification('Running in file mode. To enable API mode, start a PHP server: php -S localhost:8000', 'info');

        } catch (error) {
            console.error('Script loading failed, trying fetch method:', error);

            try {
                const response = await fetch('./js/locations.js?v=20250926b');
                if (!response.ok) throw new Error('Failed to fetch JS file');

                const jsContent = await response.text();
                const match = jsContent.match(/const rivianLocations = (\[[\s\S]*?\]);/);
                if (!match) throw new Error('Could not parse locations data');

                const locationsData = JSON.parse(match[1]);
                AdminState.setLocations([...locationsData]);

                AdminUI.renderLocations();
                AdminUI.updateStats();

                document.getElementById('connectionStatus').textContent = '● File Mode';
                document.getElementById('connectionStatus').style.color = '#fbbf24';
                AdminUI.showNotification('API not configured. Using file mode. Changes will download as file.', 'info');

            } catch (fetchError) {
                console.error('All loading methods failed:', fetchError);
                document.getElementById('locationsList').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h3>Error loading locations</h3>
                        <p>Please ensure you're running this page from a web server, not opening the file directly.</p>
                        <p><small>For local testing: <code>python -m http.server 8000</code></small></p>
                    </div>
                `;
            }
        }
    },

    // Save a location (create or update)
    async saveLocation(formData) {
        const editingId = AdminState.getEditingId();

        try {
            if (editingId) {
                await this.apiRequest('PUT', formData);
                AdminState.updateLocation(editingId, formData);
            } else {
                const result = await this.apiRequest('POST', formData);
                AdminState.addLocation(result.location || formData);
            }

            AdminState.setLocations(AdminState.getLocations());
            AdminUI.showNotification('Location saved successfully', 'success');
        } catch (error) {
            // Fallback to local changes
            if (editingId) {
                AdminState.updateLocation(editingId, formData);
                AdminState.trackChange(editingId, 'modified');
            } else {
                AdminState.addLocation(formData);
                AdminState.trackChange(formData.id, 'added');
            }
            AdminUI.showNotification('Saved locally. Use "Save All" to download changes.', 'info');
        }

        AdminUI.renderLocations();
        AdminUI.updateStats();
    },

    // Delete a location
    async deleteLocation(id) {
        try {
            await this.apiRequest('DELETE', null, { id: id });
            AdminState.deleteLocation(id);
            AdminState.setLocations(AdminState.getLocations());
            AdminUI.showNotification('Location deleted successfully', 'success');
        } catch (error) {
            // Fallback to local deletion
            AdminState.deleteLocation(id);
            AdminState.trackChange(id, 'deleted');
            AdminUI.showNotification('Deleted locally. Use "Save All" to apply changes.', 'info');
        }

        AdminUI.renderLocations();
        AdminUI.updateStats();
    },

    // Save all changes
    async saveAllChanges() {
        const locations = AdminState.getLocations();

        try {
            await this.apiRequest('PUT', locations, { action: 'bulk' });
            AdminState.clearPendingChanges();
            AdminState.setLocations(locations);
            AdminUI.updateChangesBar();
            AdminUI.showNotification('All changes saved to server!', 'success');
        } catch (error) {
            // Fallback to file download
            const dataStr = `const rivianLocations = ${JSON.stringify(locations, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rivianLocations;
}`;

            const blob = new Blob([dataStr], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'locations.js';
            a.click();

            AdminState.clearPendingChanges();
            AdminState.setLocations(locations);
            AdminUI.updateChangesBar();

            alert('API not configured. Downloaded locations.js file. Upload this to your server at /js/locations.js');
        }

        AdminUI.renderLocations();
    },

    // Export data as JSON backup
    exportData() {
        const locations = AdminState.getLocations();
        const dataStr = JSON.stringify(locations, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rivian-locations-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        AdminUI.showNotification('Backup downloaded successfully', 'success');
    },

    // Import data from JSON file
    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (!confirm(`Import ${imported.length} locations? This will replace all current data.`)) {
                        return;
                    }

                    try {
                        await this.apiRequest('PUT', imported, { action: 'bulk' });
                        AdminState.setLocations(imported);
                        AdminUI.showNotification(`Successfully imported ${imported.length} locations!`, 'success');
                    } catch (error) {
                        AdminState.setLocations(imported);
                        AdminUI.showNotification('Imported locally. Use "Save All" to save to server.', 'info');
                    }

                    AdminUI.renderLocations();
                    AdminUI.updateStats();
                } catch (error) {
                    AdminUI.showNotification('Error importing file', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminAPI = AdminAPI;
}
