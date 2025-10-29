// ============================================
// MODAL DIALOG HANDLING
// ============================================

const AdminModal = {
    // Open modal for adding or editing location
    openModal(id = null) {
        AdminState.setEditingId(id);
        document.getElementById('locationModal').classList.add('active');

        if (id) {
            const location = AdminState.findLocationById(id);
            if (!location) {
                console.error('Location not found:', id);
                return;
            }

            document.getElementById('modalTitle').textContent = 'Edit Location';
            document.getElementById('locationId').value = location.id;
            document.getElementById('name').value = location.name;
            document.getElementById('type').value = location.type;
            document.getElementById('lat').value = location.lat;
            document.getElementById('lng').value = location.lng;
            document.getElementById('address').value = location.address;
            document.getElementById('city').value = location.city;
            document.getElementById('state').value = location.state;
            document.getElementById('hours').value = location.hours || '';
            document.getElementById('phone').value = location.phone || '';
            document.getElementById('openingDate').value = location.openingDate || '';
            document.getElementById('rivianUrl').value = location.rivianUrl || '';
            document.getElementById('isOpen').value = location.isOpen !== false ? 'true' : 'false';

            // Set service checkboxes
            document.querySelectorAll('input[name="services"]').forEach(cb => cb.checked = false);
            (location.services || []).forEach(service => {
                const checkbox = document.querySelector(`input[name="services"][value="${service}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            document.getElementById('modalTitle').textContent = 'Add Location';
            document.getElementById('locationForm').reset();
            document.getElementById('isOpen').value = 'true';
            // Clear all service checkboxes
            document.querySelectorAll('input[name="services"]').forEach(cb => cb.checked = false);
        }
    },

    // Close modal
    closeModal() {
        document.getElementById('locationModal').classList.remove('active');
        AdminState.setEditingId(null);
    },

    // Edit location (wrapper for openModal)
    editLocation(id) {
        this.openModal(id);
    },

    // Save location from form
    async saveLocation() {
        // Collect checked services
        const checkedServices = [];
        document.querySelectorAll('input[name="services"]:checked').forEach(cb => {
            checkedServices.push(cb.value);
        });

        const editingId = AdminState.getEditingId();
        const formData = {
            id: editingId || Date.now(),
            name: document.getElementById('name').value,
            type: document.getElementById('type').value,
            lat: parseFloat(document.getElementById('lat').value),
            lng: parseFloat(document.getElementById('lng').value),
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value.toUpperCase(),
            hours: document.getElementById('hours').value || '',
            phone: document.getElementById('phone').value || '',
            openingDate: document.getElementById('openingDate').value || '',
            rivianUrl: document.getElementById('rivianUrl').value || '',
            services: checkedServices,
            isOpen: document.getElementById('isOpen').value === 'true'
        };

        await AdminAPI.saveLocation(formData);
        this.closeModal();
    },

    // Initialize modal event handlers
    initialize() {
        // Modal can be initialized here if needed
        // Currently handlers are attached via onclick in HTML
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminModal = AdminModal;
}
