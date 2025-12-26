// ============================================
// AUTHENTICATION (GitHub PAT)
// ============================================

const AdminAuth = {
    // Check if user is authenticated with valid GitHub token
    isAuthenticated() {
        const token = AdminConfig.getGitHubToken();
        const authTime = localStorage.getItem(AdminConfig.STORAGE_KEYS.AUTH_TIME);

        if (token && authTime) {
            const hoursSinceAuth = (Date.now() - parseInt(authTime)) / (1000 * 60 * 60);
            return hoursSinceAuth < AdminConfig.SESSION_DURATION_HOURS;
        }

        return false;
    },

    // Validate GitHub token by making a test API call
    async validateToken(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                return { valid: false, error: 'Invalid token' };
            }

            const user = await response.json();

            // Check if user has access to the repo
            const repoResponse = await fetch(
                `https://api.github.com/repos/${AdminConfig.GITHUB.OWNER}/${AdminConfig.GITHUB.REPO}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!repoResponse.ok) {
                return { valid: false, error: 'No access to repository' };
            }

            const repo = await repoResponse.json();
            if (!repo.permissions || !repo.permissions.push) {
                return { valid: false, error: 'No write access to repository' };
            }

            return { valid: true, user: user.login };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    },

    // Login with GitHub PAT
    async login(token) {
        const result = await this.validateToken(token);

        if (result.valid) {
            AdminConfig.setGitHubToken(token);
            return { success: true, user: result.user };
        }

        return { success: false, error: result.error };
    },

    // Logout
    logout() {
        AdminConfig.clearGitHubToken();
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
    async checkAuth() {
        if (this.isAuthenticated()) {
            // Re-validate token
            const token = AdminConfig.getGitHubToken();
            const result = await this.validateToken(token);

            if (result.valid) {
                this.showAdminApp();
                AdminAPI.loadLocations();
                return;
            } else {
                // Token expired or invalid
                this.logout();
            }
        }

        this.showLoginScreen();
    },

    // Initialize authentication handlers
    initialize() {
        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('adminPassword').value;
            const loginBtn = document.querySelector('#loginForm button[type="submit"]');
            const errorDiv = document.getElementById('loginError');

            // Show loading state
            loginBtn.disabled = true;
            loginBtn.textContent = 'Validating...';
            errorDiv.style.display = 'none';

            const result = await this.login(token);

            if (result.success) {
                this.showAdminApp();
                AdminAPI.loadLocations();
                AdminUI.showNotification(`Logged in as ${result.user}`, 'success');
            } else {
                errorDiv.textContent = result.error || 'Invalid token. Please try again.';
                errorDiv.style.display = 'block';
                document.getElementById('adminPassword').value = '';
            }

            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminAuth = AdminAuth;
}
