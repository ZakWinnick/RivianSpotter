// ============================================
// CONFIGURATION
// ============================================

const AdminConfig = {
    // GitHub repository settings
    GITHUB: {
        OWNER: 'zakwinnick',
        REPO: 'RivianSpotter',
        BRANCH: 'main',
        LOCATIONS_PATH: 'js/locations.js'
    },

    // Session settings
    SESSION_DURATION_HOURS: 24 * 7, // 7 days for GitHub PAT

    // Storage keys
    STORAGE_KEYS: {
        GITHUB_TOKEN: 'rivianAdminGitHubToken',
        AUTH_TIME: 'rivianAdminAuthTime'
    },

    // Get stored GitHub token
    getGitHubToken() {
        return localStorage.getItem(this.STORAGE_KEYS.GITHUB_TOKEN);
    },

    // Set GitHub token
    setGitHubToken(token) {
        localStorage.setItem(this.STORAGE_KEYS.GITHUB_TOKEN, token);
        localStorage.setItem(this.STORAGE_KEYS.AUTH_TIME, Date.now().toString());
    },

    // Clear GitHub token
    clearGitHubToken() {
        localStorage.removeItem(this.STORAGE_KEYS.GITHUB_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.AUTH_TIME);
    },

    // Initialize config
    async initialize() {
        console.log('Admin config initialized for GitHub Pages mode');
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminConfig = AdminConfig;
}
