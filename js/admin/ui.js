// ============================================
// UI RENDERING AND MANAGEMENT
// ============================================

const AdminUI = {
    // Show notification toast
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Render locations list
    renderLocations(searchTerm = '') {
        const container = document.getElementById('locationsList');
        const locations = AdminState.getLocations();
        const typeFilter = AdminState.getTypeFilter();

        const filtered = locations.filter(loc => {
            const matchesSearch = searchTerm === '' ||
                loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                loc.state.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'all' || loc.type === typeFilter;

            return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📍</div>
                    <h3>No locations found</h3>
                    <p>Try adjusting your filters or add a new location</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(location => {
            const isModified = AdminState.hasChanges(location.id);
            const typeClass = location.type === 'Service Center' ? 'service' : location.type.toLowerCase();

            return `
                <div class="location-item ${isModified ? 'modified' : ''}">
                    <div class="location-info">
                        <strong>${location.name}</strong>
                        <span class="badge badge-${typeClass}">${location.type}</span>
                        <br>
                        <small style="color: #666;">${location.address}, ${location.city}, ${location.state}</small>
                        ${location.isOpen === false ? '<span style="color: red; margin-left: 1rem;">CLOSED</span>' : ''}
                        ${isModified ? '<span style="color: #ffa726; margin-left: 1rem;">• Modified</span>' : ''}
                    </div>
                    <div class="location-actions">
                        <button class="btn btn-secondary" onclick="AdminModal.editLocation(${location.id})">Edit</button>
                        <button class="btn btn-danger" onclick="AdminUI.confirmDelete(${location.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Update statistics
    updateStats() {
        const locations = AdminState.getLocations();
        document.getElementById('totalCount').textContent = locations.length;
        document.getElementById('spacesCount').textContent = locations.filter(l => l.type === 'Space').length;
        document.getElementById('serviceCentersCount').textContent = locations.filter(l => l.type === 'Service Center').length;
        document.getElementById('outpostsCount').textContent = locations.filter(l => l.type === 'Outpost').length;
        document.getElementById('statesCount').textContent = [...new Set(locations.map(l => l.state))].length;
    },

    // Update changes bar visibility
    updateChangesBar() {
        const changesBar = document.getElementById('changesBar');
        const changesCount = document.getElementById('changesCount');
        const count = AdminState.getPendingChangesCount();

        if (count > 0) {
            changesBar.classList.add('active');
            changesCount.textContent = count;
        } else {
            changesBar.classList.remove('active');
        }
    },

    // Filter locations by type
    filterByType(type, event) {
        AdminState.setTypeFilter(type);
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        const searchTerm = document.getElementById('searchInput').value;
        this.renderLocations(searchTerm);
    },

    // Confirm and delete location
    async confirmDelete(id) {
        if (!confirm('Are you sure you want to delete this location?')) return;
        await AdminAPI.deleteLocation(id);
    },

    // Discard all pending changes
    discardChanges() {
        const count = AdminState.getPendingChangesCount();
        if (count === 0) return;

        if (confirm(`Discard ${count} unsaved changes?`)) {
            AdminState.discardChanges();
            this.updateChangesBar();
            const searchTerm = document.getElementById('searchInput').value;
            this.renderLocations(searchTerm);
        }
    },

    // Initialize UI event handlers
    initialize() {
        // Search input handler
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderLocations(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                AdminAPI.saveAllChanges();
            }
            // Escape to close modal
            if (e.key === 'Escape') {
                AdminModal.closeModal();
            }
        });

        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (AdminState.getPendingChangesCount() > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminUI = AdminUI;
}
