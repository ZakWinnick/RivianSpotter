// ============================================
// API FUNCTIONS (GitHub API)
// ============================================

const AdminAPI = {
    // Current file SHA (needed for GitHub API updates)
    currentSha: null,

    // GitHub API base URL
    GITHUB_API: 'https://api.github.com',

    // Get GitHub API headers
    getHeaders() {
        const token = AdminConfig.getGitHubToken();
        return {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    },

    // Get file content from GitHub
    async getFileFromGitHub() {
        const { OWNER, REPO, BRANCH, LOCATIONS_PATH } = AdminConfig.GITHUB;
        const url = `${this.GITHUB_API}/repos/${OWNER}/${REPO}/contents/${LOCATIONS_PATH}?ref=${BRANCH}`;

        const response = await fetch(url, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch file from GitHub');
        }

        const data = await response.json();
        this.currentSha = data.sha;

        // Decode base64 content
        const content = atob(data.content);
        return content;
    },

    // Parse locations.js content to extract array
    parseLocationsJS(content) {
        const match = content.match(/const rivianLocations = (\[[\s\S]*?\]);/);
        if (!match) {
            throw new Error('Could not parse locations data');
        }
        return JSON.parse(match[1]);
    },

    // Generate locations.js file content
    generateLocationsJS(locations) {
        return `const rivianLocations = ${JSON.stringify(locations, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rivianLocations;
}`;
    },

    // Commit file to GitHub
    async commitToGitHub(content, message) {
        const { OWNER, REPO, BRANCH, LOCATIONS_PATH } = AdminConfig.GITHUB;
        const url = `${this.GITHUB_API}/repos/${OWNER}/${REPO}/contents/${LOCATIONS_PATH}`;

        // We need the current SHA to update the file
        if (!this.currentSha) {
            await this.getFileFromGitHub();
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                message: message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: this.currentSha,
                branch: BRANCH
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to commit to GitHub');
        }

        const result = await response.json();
        this.currentSha = result.content.sha;
        return result;
    },

    // Load locations from GitHub
    async loadLocations() {
        try {
            document.getElementById('connectionStatus').textContent = '● Loading...';
            document.getElementById('connectionStatus').style.color = '#fbbf24';

            const content = await this.getFileFromGitHub();
            const locations = this.parseLocationsJS(content);

            AdminState.setLocations(locations);
            AdminUI.renderLocations();
            AdminUI.updateStats();

            document.getElementById('connectionStatus').textContent = '● GitHub Connected';
            document.getElementById('connectionStatus').style.color = '#4CAF50';

        } catch (error) {
            console.error('Error loading from GitHub:', error);

            // Fallback to loading from static file (for viewing without auth)
            await this.loadFromStaticFile();
        }
    },

    // Fallback: Load from static JS file
    async loadFromStaticFile() {
        try {
            const response = await fetch('./js/locations.js?v=' + Date.now());
            if (!response.ok) throw new Error('Failed to fetch JS file');

            const content = await response.text();
            const locations = this.parseLocationsJS(content);

            AdminState.setLocations(locations);
            AdminUI.renderLocations();
            AdminUI.updateStats();

            document.getElementById('connectionStatus').textContent = '● Read-Only Mode';
            document.getElementById('connectionStatus').style.color = '#fbbf24';

        } catch (error) {
            console.error('Failed to load locations:', error);
            document.getElementById('locationsList').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error loading locations</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="AdminAPI.loadLocations()">Retry</button>
                </div>
            `;
        }
    },

    // Save a location (create or update) - saves to local state
    async saveLocation(formData) {
        const editingId = AdminState.getEditingId();

        if (editingId) {
            AdminState.updateLocation(editingId, formData);
            AdminState.trackChange(editingId, 'modified');
        } else {
            AdminState.addLocation(formData);
            AdminState.trackChange(formData.id, 'added');
        }

        AdminUI.renderLocations();
        AdminUI.updateStats();
        AdminUI.showNotification('Location saved locally. Click "Save All" to commit to GitHub.', 'info');
    },

    // Delete a location - saves to local state
    async deleteLocation(id) {
        AdminState.deleteLocation(id);
        AdminState.trackChange(id, 'deleted');

        AdminUI.renderLocations();
        AdminUI.updateStats();
        AdminUI.showNotification('Location deleted locally. Click "Save All" to commit to GitHub.', 'info');
    },

    // Save all changes to GitHub
    async saveAllChanges() {
        const locations = AdminState.getLocations();
        const pendingChanges = AdminState.getPendingChanges();

        if (Object.keys(pendingChanges).length === 0) {
            AdminUI.showNotification('No changes to save', 'info');
            return;
        }

        try {
            document.getElementById('connectionStatus').textContent = '● Saving...';
            document.getElementById('connectionStatus').style.color = '#fbbf24';

            const content = this.generateLocationsJS(locations);

            // Generate commit message from changes
            const changeTypes = Object.values(pendingChanges);
            const added = changeTypes.filter(t => t === 'added').length;
            const modified = changeTypes.filter(t => t === 'modified').length;
            const deleted = changeTypes.filter(t => t === 'deleted').length;

            const parts = [];
            if (added) parts.push(`Add ${added} location${added > 1 ? 's' : ''}`);
            if (modified) parts.push(`Update ${modified} location${modified > 1 ? 's' : ''}`);
            if (deleted) parts.push(`Remove ${deleted} location${deleted > 1 ? 's' : ''}`);

            const commitMessage = parts.join(', ') || 'Update locations';

            await this.commitToGitHub(content, commitMessage);

            AdminState.clearPendingChanges();
            AdminState.setLocations(locations);
            AdminUI.updateChangesBar();

            document.getElementById('connectionStatus').textContent = '● GitHub Connected';
            document.getElementById('connectionStatus').style.color = '#4CAF50';

            AdminUI.showNotification('Changes committed to GitHub!', 'success');
            AdminUI.renderLocations();

        } catch (error) {
            console.error('Failed to save to GitHub:', error);
            document.getElementById('connectionStatus').textContent = '● Save Failed';
            document.getElementById('connectionStatus').style.color = '#ef4444';

            AdminUI.showNotification(`Failed to save: ${error.message}`, 'error');
        }
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

                    // Track all as changes
                    imported.forEach(loc => {
                        AdminState.trackChange(loc.id, 'modified');
                    });

                    AdminState.setLocations(imported);
                    AdminUI.renderLocations();
                    AdminUI.updateStats();
                    AdminUI.showNotification(`Imported ${imported.length} locations. Click "Save All" to commit to GitHub.`, 'info');

                } catch (error) {
                    AdminUI.showNotification('Error importing file: ' + error.message, 'error');
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
