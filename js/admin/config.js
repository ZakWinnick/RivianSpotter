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
        // Set fallback token first (for file mode)
        this.ADMIN_TOKEN = 'aef8301d12c72fb3498e63bc27e08fe4fc1cc6f5cde89ca59ea3e0fcbc1e9a5c';

        try {
            // Try to load config from API endpoint (only in API mode)
            const response = await fetch('./api/config.php', {
                method: 'GET',
                cache: 'no-cache'
            });

            if (response.ok) {
                const config = await response.json();
                // Note: API config endpoint doesn't expose adminToken for security
                // Token is only used server-side for authentication
                console.log('API config loaded successfully');
            }
        } catch (error) {
            // Silent fail - this is expected when PHP server isn't running
            console.log('API not available, admin will run in file mode');
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminConfig = AdminConfig;
}
