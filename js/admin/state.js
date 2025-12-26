// ============================================
// STATE MANAGEMENT
// ============================================

const AdminState = {
    locations: [],
    originalLocations: [],
    editingId: null,
    pendingChanges: new Map(),
    currentTypeFilter: 'all',

    // Initialize state
    initialize() {
        this.locations = [];
        this.originalLocations = [];
        this.editingId = null;
        this.pendingChanges = new Map();
        this.currentTypeFilter = 'all';
    },

    // Set locations data
    setLocations(locations) {
        this.locations = locations;
        this.originalLocations = JSON.parse(JSON.stringify(locations));
        this.pendingChanges.clear();
    },

    // Get current locations
    getLocations() {
        return this.locations;
    },

    // Get original locations (before any changes)
    getOriginalLocations() {
        return this.originalLocations;
    },

    // Track a change to a location
    trackChange(locationId, action = 'modified') {
        this.pendingChanges.set(locationId, action);
    },

    // Get pending changes count
    getPendingChangesCount() {
        return this.pendingChanges.size;
    },

    // Get pending changes as object
    getPendingChanges() {
        return Object.fromEntries(this.pendingChanges);
    },

    // Clear all pending changes
    clearPendingChanges() {
        this.pendingChanges.clear();
    },

    // Discard all pending changes
    discardChanges() {
        this.locations = JSON.parse(JSON.stringify(this.originalLocations));
        this.pendingChanges.clear();
    },

    // Check if location has pending changes
    hasChanges(locationId) {
        return this.pendingChanges.has(locationId);
    },

    // Set editing ID
    setEditingId(id) {
        this.editingId = id;
    },

    // Get editing ID
    getEditingId() {
        return this.editingId;
    },

    // Set type filter
    setTypeFilter(type) {
        this.currentTypeFilter = type;
    },

    // Get type filter
    getTypeFilter() {
        return this.currentTypeFilter;
    },

    // Add location
    addLocation(location) {
        this.locations.push(location);
    },

    // Update location
    updateLocation(id, locationData) {
        const index = this.locations.findIndex(l => l.id === id);
        if (index !== -1) {
            this.locations[index] = locationData;
        }
    },

    // Delete location
    deleteLocation(id) {
        this.locations = this.locations.filter(l => l.id !== id);
    },

    // Find location by ID
    findLocationById(id) {
        return this.locations.find(l => l.id === id);
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdminState = AdminState;
}
