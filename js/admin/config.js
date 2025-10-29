// ============================================
// CONFIGURATION
// ============================================

const AdminConfig = {
    API_URL: './api/locations.php',

    // TODO: Move ADMIN_PASSWORD to backend authentication
    // This should be handled by a proper session-based auth system
    ADMIN_PASSWORD: 'rivian2024',

    // Admin token will be loaded from API config endpoint
    ADMIN_TOKEN: null,

    // Session settings
    SESSION_DURATION_HOURS: 24,

    // Storage keys
    STORAGE_KEYS: {
        AUTH: 'rivianAdminAuth',
        AUTH_TIME: 'rivianAdminAuthTime'
    },

    // Initialize and load token from API
    async initialize() {
        try {
            // Try to load config from API endpoint
            const response = await fetch('./api/config.php');
            if (response.ok) {
                const config = await response.json();
                this.ADMIN_TOKEN = config.adminToken;
            } else {
                // Fallback to hardcoded token if config endpoint doesn't exist
                this.ADMIN_TOKEN = 'aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c';
            }
        } catch (error) {
            // Fallback to hardcoded token
            console.warn('Could not load config from API, using fallback token');
            this.ADMIN_TOKEN = 'aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c';
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminConfig = AdminConfig;
}
