// admin.js - Updated admin panel JavaScript to use API

// Configuration
const API_URL = '/api/locations.php';
const ADMIN_TOKEN = 'your-secret-admin-token-here'; // Must match the token in locations.php

// State Management
let locations = [];
let originalLocations = [];
let filteredLocations = [];
let editingId = null;
let currentView = 'table';
let currentFilter = 'all';
let selectedLocations = new Set();
let map = null;

// API Helper Functions
async function apiRequest(method, data = null, params = {}) {
    const url = new URL(API_URL, window.location.origin);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load locations from API
async function loadLocations() {
    const loadingHtml = `
        <div class="loading">
            <div class="spinner"></div>
            Loading locations...
        </div>
    `;
    document.getElementById('locationsDisplay').innerHTML = loadingHtml;
    
    try {
        // GET request doesn't need auth
        const response = await fetch(API_URL);
        locations = await response.json();
        originalLocations = JSON.parse(JSON.stringify(locations));
        filteredLocations = [...locations];
        
        renderView();
        updateStats();
        showNotification('Locations loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading locations:', error);
        document.getElementById('locationsDisplay').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error loading locations</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadLocations()">Retry</button>
            </div>
        `;
        showNotification('Failed to load locations', 'error');
    }
}

// Save single location
async function saveLocation() {
    const services = [];
    document.querySelectorAll('#locationForm input[type="checkbox"]:checked').forEach(cb => {
        if (cb.value !== 'on') {
            services.push(cb.value);
        }
    });
    
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
        services: services,
        isOpen: document.getElementById('isOpen').value === 'true'
    };
    
    // Validate required fields
    if (!formData.name || !formData.type || !formData.address || !formData.city || !formData.state) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        if (editingId) {
            // Update existing location
            await apiRequest('PUT', formData);
            const index = locations.findIndex(l => l.id == editingId);
            if (index !== -1) {
                locations[index] = formData;
            }
            showNotification('Location updated successfully', 'success');
        } else {
            // Add new location
            const result = await apiRequest('POST', formData);
            locations.push(result.location || formData);
            showNotification('Location added successfully', 'success');
        }
        
        originalLocations = JSON.parse(JSON.stringify(locations));
        applyFilters();
        updateStats();
        closeModal();
    } catch (error) {
        showNotification(`Failed to save location: ${error.message}`, 'error');
    }
}

// Delete location
async function deleteLocation(id) {
    if (!confirm('Are you sure you want to delete this location?')) {
        return;
    }
    
    try {
        await apiRequest('DELETE', null, { id: id });
        locations = locations.filter(l => l.id != id);
        originalLocations = JSON.parse(JSON.stringify(locations));
        showNotification('Location deleted successfully', 'success');
        applyFilters();
        updateStats();
    } catch (error) {
        showNotification(`Failed to delete location: ${error.message}`, 'error');
    }
}

// Bulk save all locations
async function saveAllLocations() {
    try {
        await apiRequest('PUT', locations, { action: 'bulk' });
        originalLocations = JSON.parse(JSON.stringify(locations));
        showNotification('All changes saved successfully!', 'success');
        renderView();
    } catch (error) {
        showNotification(`Failed to save changes: ${error.message}`, 'error');
    }
}

// Bulk delete
async function bulkDelete() {
    if (selectedLocations.size === 0) {
        showNotification('No locations selected', 'warning');
        return;
    }
    
    if (!confirm(`Delete ${selectedLocations.size} selected locations?`)) {
        return;
    }
    
    try {
        // Delete each selected location
        for (const id of selectedLocations) {
            await apiRequest('DELETE', null, { id: id });
            locations = locations.filter(l => l.id != id);
        }
        
        originalLocations = JSON.parse(JSON.stringify(locations));
        selectedLocations.clear();
        updateBulkActions();
        showNotification(`${selectedLocations.size} locations deleted successfully`, 'success');
        applyFilters();
        updateStats();
    } catch (error) {
        showNotification(`Failed to delete locations: ${error.message}`, 'error');
    }
}

// Import locations
async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const imported = JSON.parse(event.target.result);
                if (!confirm(`Import ${imported.length} locations? This will replace all current data.`)) {
                    return;
                }
                
                await apiRequest('PUT', imported, { action: 'bulk' });
                locations = imported;
                originalLocations = JSON.parse(JSON.stringify(imported));
                applyFilters();
                updateStats();
                showNotification(`Successfully imported ${imported.length} locations!`, 'success');
            } catch (error) {
                showNotification('Error importing file. Please check the format.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Export data
function exportData() {
    const dataStr = JSON.stringify(locations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rivian-locations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showNotification('Locations exported successfully', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we have a token stored
    const storedToken = localStorage.getItem('rivianAdminToken');
    if (storedToken) {
        // Update the global token
        ADMIN_TOKEN = storedToken;
    } else {
        // Prompt for token if not stored
        const token = prompt('Enter admin token:');
        if (token) {
            localStorage.setItem('rivianAdminToken', token);
            ADMIN_TOKEN = token;
        }
    }
    
    loadLocations();
});

// The rest of your existing admin.js functions remain the same (updateStats, renderView, etc.)
// Just remove the old save/load functions that dealt with file downloads