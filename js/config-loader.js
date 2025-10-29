/**
 * Configuration Loader
 * Loads configuration from API endpoint
 */

class ConfigLoader {
    constructor() {
        this.config = null;
        this.loaded = false;
    }

    async load() {
        if (this.loaded) {
            return this.config;
        }

        try {
            const response = await fetch('./api/config.php');
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }

            this.config = await response.json();
            this.loaded = true;
            return this.config;
        } catch (error) {
            console.error('Error loading configuration:', error);

            // Fallback configuration for development
            this.config = {
                mapboxToken: null, // Must be set manually
                cacheEnabled: true,
                cacheExpiration: 30
            };

            this.loaded = true;
            return this.config;
        }
    }

    get(key, defaultValue = null) {
        if (!this.loaded) {
            console.warn('Configuration not loaded yet. Call load() first.');
            return defaultValue;
        }

        return this.config?.[key] ?? defaultValue;
    }
}

// Create singleton instance
const appConfig = new ConfigLoader();
