// ============================================
// AUTHENTICATION
// ============================================

const AdminAuth = {
    // Check if user is authenticated
    isAuthenticated() {
        const auth = localStorage.getItem(AdminConfig.STORAGE_KEYS.AUTH);
        const authTime = localStorage.getItem(AdminConfig.STORAGE_KEYS.AUTH_TIME);

        if (auth === 'true' && authTime) {
            const hoursSinceAuth = (Date.now() - parseInt(authTime)) / (1000 * 60 * 60);
            return hoursSinceAuth < AdminConfig.SESSION_DURATION_HOURS;
        }

        return false;
    },

    // Login with password
    login(password) {
        if (password === AdminConfig.ADMIN_PASSWORD) {
            localStorage.setItem(AdminConfig.STORAGE_KEYS.AUTH, 'true');
            localStorage.setItem(AdminConfig.STORAGE_KEYS.AUTH_TIME, Date.now().toString());
            return true;
        }
        return false;
    },

    // Logout
    logout() {
        localStorage.removeItem(AdminConfig.STORAGE_KEYS.AUTH);
        localStorage.removeItem(AdminConfig.STORAGE_KEYS.AUTH_TIME);
    },

    // Show login screen
    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminApp').classList.remove('authenticated');
    },

    // Show admin app
    showAdminApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminApp').classList.add('authenticated');
    },

    // Check authentication on page load
    checkAuth() {
        if (this.isAuthenticated()) {
            this.showAdminApp();
            // Load locations after showing admin app
            AdminAPI.loadLocations();
        } else {
            this.showLoginScreen();
        }
    },

    // Initialize authentication handlers
    initialize() {
        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;

            if (this.login(password)) {
                this.showAdminApp();
                AdminAPI.loadLocations();
            } else {
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('adminPassword').value = '';
            }
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminAuth = AdminAuth;
}
