// ============================================
// MAIN INITIALIZATION AND COORDINATION
// ============================================

const AdminApp = {
    // Initialize the entire admin application
    async initialize() {
        console.log('Initializing Admin App...');

        try {
            // 1. Load configuration (including token from API)
            await AdminConfig.initialize();
            console.log('Config initialized');

            // 2. Initialize state
            AdminState.initialize();
            console.log('State initialized');

            // 3. Initialize authentication
            AdminAuth.initialize();
            console.log('Auth initialized');

            // 4. Initialize UI event handlers
            AdminUI.initialize();
            console.log('UI initialized');

            // 5. Initialize modal handlers
            AdminModal.initialize();
            console.log('Modal initialized');

            // 6. Check authentication and load data if authenticated
            AdminAuth.checkAuth();
            console.log('Auth check complete');

            // 7. Set up global functions for onclick handlers in HTML
            this.setupGlobalHandlers();
            console.log('Global handlers set up');

            console.log('Admin App initialized successfully');
        } catch (error) {
            console.error('Error initializing Admin App:', error);
            AdminUI.showNotification('Error initializing application', 'error');
        }
    },

    // Set up global functions for onclick handlers in HTML
    setupGlobalHandlers() {
        // Export/Import
        window.exportData = () => AdminAPI.exportData();
        window.importData = () => AdminAPI.importData();

        // Logout
        window.logout = () => {
            if (confirm('Are you sure you want to logout?')) {
                AdminAuth.logout();
                window.location.reload();
            }
        };

        // Filter
        window.filterByType = (type) => {
            AdminUI.filterByType(type, event);
        };

        // Modal operations
        window.openModal = (id) => AdminModal.openModal(id);
        window.closeModal = () => AdminModal.closeModal();
        window.saveLocation = () => AdminModal.saveLocation();
        window.editLocation = (id) => AdminModal.editLocation(id);
        window.deleteLocation = (id) => AdminUI.confirmDelete(id);

        // Changes management
        window.saveAllChanges = () => AdminAPI.saveAllChanges();
        window.discardChanges = () => AdminUI.discardChanges();
    }
};

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AdminApp.initialize();
    });
} else {
    // DOM is already ready
    AdminApp.initialize();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminApp = AdminApp;
}
