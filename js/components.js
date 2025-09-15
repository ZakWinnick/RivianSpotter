// components.js - Reusable header and footer components for Rivian Spotter

// Component initialization
class RivianComponents {
    constructor() {
        this.currentPage = this.getCurrentPage();
    }

    // Determine current page from URL
    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.includes('index.html')) return 'map';
        if (path.includes('about.html')) return 'about';
        if (path.includes('contact.html')) return 'contact';
        if (path.includes('admin.html')) return 'admin';
        return 'map';
    }

    // Create header component
    createHeader() {
        const isAdmin = this.currentPage === 'admin';
        
        // Don't add header to admin page as it has its own auth system
        if (isAdmin) return '';
        
        const header = `
            <header class="header">
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <div class="hamburger">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
                <a href="/" class="logo">
                    <img src="/images/rivianspotter-logosolo-trans.png" alt="Rivian Spotter" class="logo-img">
                    <span class="logo-text">Rivian Spotter</span>
                </a>
                <nav class="nav-links desktop">
                    <a href="/" class="nav-link ${this.currentPage === 'map' ? 'active' : ''}">Map</a>
                    <a href="/about.html" class="nav-link ${this.currentPage === 'about' ? 'active' : ''}">About</a>
                    <a href="/contact.html" class="nav-link ${this.currentPage === 'contact' ? 'active' : ''}">Contact</a>
                    <a href="https://zak.codetoadventure.com/" class="nav-link target="_blank">R1 Shop</a>
                    ${this.currentPage === 'map' ? '<a href="#" class="nav-link" id="statsLink">Stats</a>' : ''}
                </nav>
            </header>
            
            <!-- Mobile Navigation Dropdown -->
            <div class="mobile-nav" id="mobileNav">
                <a href="/">Map</a>
                <a href="/about.html">About</a>
                <a href="/contact.html">Contact</a>
                <a href="https://zak.codetoadventure.com/" target="_blank">R1 Shop</a>
                ${this.currentPage === 'map' ? '<a href="#" id="mobileStatsLink">Statistics</a>' : ''}
            </div>
        `;
        
        return header;
    }

    // Create footer component
    createFooter() {
        const isAdmin = this.currentPage === 'admin';
        
        // Don't add footer to admin page
        if (isAdmin) return '';
        
        const currentYear = new Date().getFullYear();
        
        const footer = `
            <footer class="footer">
                <p class="footer-text">
                    © ${currentYear} Wyld Media • 
                    <a href="/contact.html" style="color: #666;">Contact</a> • 
                    <a href="/about.html" style="color: #666;">About</a> • 
                    <a href="https://zak.codetoadventure.com" target="_blank">Zak's Referral Code</a>
                </p>
            </footer>
        `;
        
        return footer;
    }

    // Initialize mobile menu functionality
    initializeMobileMenu() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');
        
        if (mobileMenuBtn && mobileNav) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileNav.classList.toggle('active');
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', function(e) {
                if (mobileNav && !mobileNav.contains(e.target) && mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                    mobileNav.classList.remove('active');
                }
            });
        }
    }

    // Inject styles needed for components
    injectStyles() {
        if (document.getElementById('component-styles')) return; // Already injected
        
        const styles = `
            <style id="component-styles">
                /* Mobile-First Header Styles */
                .header {
                    background: white;
                    border-bottom: 1px solid #e5e5e5;
                    padding: 0.75rem 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    z-index: 1000;
                }
                
                .logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    text-decoration: none;
                    color: #1a1a1a;
                    font-weight: 600;
                    font-size: 1.25rem;
                    transition: opacity 0.2s;
                }
                
                .logo:hover {
                    opacity: 0.8;
                }
                
                .logo-img {
                    width: 64px;
                    height: 64px;
                    object-fit: contain;
                    display: block;
                }
                
                .logo-text {
                    display: inline-block;
                }
                
                /* Hide logo text on very small screens if needed */
                @media (max-width: 360px) {
                    .logo-text {
                        display: none;
                    }
                    
                    .logo {
                        gap: 0;
                    }
                }
                
                .nav-links.desktop {
                    display: none !important;
                }
                
                .nav-link {
                    color: #666;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.2s;
                }
                
                .nav-link:hover {
                    color: #4CAF50;
                }
                
                .nav-link.active {
                    color: #4CAF50;
                    font-weight: 600;
                }
                
                .mobile-menu-btn {
                    display: flex;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    align-items: center;
                    justify-content: center;
                }
                
                .hamburger {
                    width: 24px;
                    height: 18px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .hamburger span {
                    display: block;
                    height: 2px;
                    background: #333;
                    border-radius: 2px;
                    transition: all 0.3s ease;
                }
                
                .mobile-nav {
                    display: none;
                    position: fixed;
                    top: 88px;
                    right: 0;
                    background: white;
                    border: 1px solid #e5e5e5;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1500;
                    margin: 0.5rem;
                    min-width: 200px;
                }
                
                .mobile-nav.active {
                    display: block;
                }
                
                .mobile-nav a {
                    display: block;
                    padding: 1rem 1.5rem;
                    color: #666;
                    text-decoration: none;
                    border-bottom: 1px solid #e5e5e5;
                    transition: background 0.2s;
                }
                
                .mobile-nav a:last-child {
                    border-bottom: none;
                }
                
                .mobile-nav a:hover {
                    background: #f9f9f9;
                }
                
                /* Footer Styles */
                .footer {
                    background: white;
                    border-top: 1px solid #e5e5e5;
                    padding: 2rem 1rem;
                    text-align: center;
                    margin-top: auto;
                }
                
                .footer-text {
                    color: #666;
                    font-size: 0.875rem;
                    line-height: 1.6;
                }
                
                .footer-text a {
                    color: #666;
                    text-decoration: none;
                }
                
                .footer-text a:hover {
                    color: #4CAF50;
                    text-decoration: underline;
                }
                
                /* Tablet styles */
                @media (min-width: 481px) and (max-width: 768px) {
                    .logo-img {
                        width: 80px;
                        height: 80px;
                    }
                    
                    .mobile-nav {
                        top: 88px;
                    }
                }
                
                /* Desktop styles */
                @media (min-width: 769px) {
                    .header {
                        padding: 0.5rem 1.5rem;
                    }
                    
                    .logo {
                        font-size: 1.5rem;
                    }
                    
                    .logo-img {
                        width: 120px;
                        height: 120px;
                    }
                    
                    .nav-links.desktop {
                        display: flex !important;
                        gap: 2rem;
                        align-items: center;
                    }
                    
                    .mobile-menu-btn {
                        display: none !important;
                    }
                    
                    .mobile-nav {
                        display: none !important;
                    }
                    
                    .footer {
                        padding: 2rem;
                    }
                    
                    .footer-text {
                        font-size: 0.9rem;
                    }
                }
                
                /* Ensure proper layout */
                body {
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .container {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    flex: 1;
                }
                
                .page-content {
                    flex: 1;
                    padding: 1.5rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                @media (min-width: 769px) {
                    .page-content {
                        padding: 2rem;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Main render method
    render() {
        // Skip for admin page entirely
        if (this.currentPage === 'admin') return;
        
        // Inject styles
        this.injectStyles();
        
        // Find container
        const container = document.querySelector('.container');
        if (!container) {
            console.error('Container element not found');
            return;
        }
        
        // Create wrapper for proper structure
        const existingContent = container.innerHTML;
        
        // Clear container
        container.innerHTML = '';
        
        // Add header
        container.innerHTML = this.createHeader();
        
        // Add main content wrapper
        const mainContent = document.createElement('div');
        mainContent.className = 'main-content-wrapper';
        mainContent.style.flex = '1';
        mainContent.innerHTML = existingContent;
        container.appendChild(mainContent);
        
        // Add footer
        container.insertAdjacentHTML('beforeend', this.createFooter());
        
        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Initialize page-specific features
        this.initializePageSpecific();
    }

    // Initialize page-specific functionality
    initializePageSpecific() {
        if (this.currentPage === 'map') {
            // Stats link handler for map page
            const statsLink = document.getElementById('statsLink');
            const mobileStatsLink = document.getElementById('mobileStatsLink');
            
            if (statsLink) {
                statsLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (typeof showStats === 'function') {
                        showStats();
                    }
                });
            }
            
            if (mobileStatsLink) {
                mobileStatsLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (typeof showStats === 'function') {
                        showStats();
                    }
                    document.getElementById('mobileNav').classList.remove('active');
                });
            }
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const rivianComponents = new RivianComponents();
        rivianComponents.render();
    });
} else {
    // DOM is already loaded
    const rivianComponents = new RivianComponents();
    rivianComponents.render();
}