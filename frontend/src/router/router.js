/**
 * KONVO™ SPA ROUTER
 * Production-grade client-side router using the History API.
 * 
 * This fixes the critical bug: handleRouting() and initSPALinks()
 * were called in initApp() but never defined - causing all navigation to fail silently.
 *
 * Features:
 * - History API pushState + popstate (browser back/forward)
 * - Protected routes (auth required)
 * - Guest-only routes (redirect if already authenticated)
 * - Incomplete profile guard → /onboarding
 * - Active nav link highlighting
 * - Page transition animations
 * - Async page initialization with loading states
 * - Error boundary (404 fallback)
 * - Deep link support
 * - Mobile sidebar auto-close on navigation
 */

// ─── Route Registry ───────────────────────────────────────────────
const ROUTES = {
    '/':              { page: 'discover',   title: 'Discovery',      auth: true,  guestOnly: false },
    '/discover':      { page: 'discover',   title: 'Discovery',      auth: true,  guestOnly: false },
    '/chat':          { page: 'chat',       title: 'Messages',       auth: true,  guestOnly: false },
    '/grid':          { page: 'grid',       title: 'Resonance Grid', auth: true,  guestOnly: false },
    '/profile':       { page: 'profile',    title: 'Twin DNA',       auth: true,  guestOnly: false },
    '/compatibility': { page: 'grid',       title: 'Resonance Grid', auth: true,  guestOnly: false },
    '/communities':   { page: 'grid',       title: 'Resonance Grid', auth: true,  guestOnly: false },
    '/graph':         { page: 'grid',       title: 'Resonance Grid', auth: true,  guestOnly: false },
    '/virtual-dates': { page: 'profile',    title: 'Twin DNA',       auth: true,  guestOnly: false },
    '/agents':        { page: 'profile',    title: 'Twin DNA',       auth: true,  guestOnly: false },
    '/settings':      { page: 'settings',   title: 'Settings',       auth: true,  guestOnly: false },
    '/notifications': { page: 'notifications', title: 'Notifications', auth: true, guestOnly: false },
    '/onboarding':    { page: 'profile',    title: 'Get Started',    auth: true,  guestOnly: false },
    '/auth':          { page: 'auth',       title: 'Sign In',        auth: false, guestOnly: true  },
    '/login':         { page: 'auth',       title: 'Sign In',        auth: false, guestOnly: true  },
    '/404':           { page: '404',        title: 'Not Found',      auth: false, guestOnly: false },
};

// ─── Page Section Registry ─────────────────────────────────────────
// Maps route page IDs to the actual DOM element IDs in index.html/app.html
const PAGE_SECTIONS = {
    'discover':      'view-discover-deck',
    'chat':          'view-chat-center',
    'grid':          'view-grid',
    'profile':       'view-profile',
    'settings':      'view-settings',
    'notifications': 'view-notifications',
    'auth':          null, // auth.html is separate
    '404':           'view-404',
};

// ─── Page Init Callbacks ───────────────────────────────────────────
// Each page registers its own init function here via registerPageInit()
const PAGE_INIT_REGISTRY = {};

/**
 * Register a page init function.
 * Call this from each feature module: Router.registerPageInit('discovery', initDiscovery)
 * @param {string} pageId
 * @param {Function} fn
 */
function registerPageInit(pageId, fn) {
    PAGE_INIT_REGISTRY[pageId] = fn;
}

// ─── State ─────────────────────────────────────────────────────────
let _currentPage = null;
let _isNavigating = false;

// ─── Core Router Functions ──────────────────────────────────────────

/**
 * handleRouting(path)
 * The main route handler. Called on initial load and every navigation.
 * Was missing from the codebase - this is the critical fix.
 * 
 * @param {string} path - The URL path to route to
 */
async function handleRouting(path) {
    // Normalize path: strip query strings for lookup, keep them for state
    const cleanPath = path.split('?')[0].split('#')[0] || '/';

    if (cleanPath === '/onboarding') {
        window.location.href = '/onboarding';
        return;
    }

    // Match route (exact or fallback to 404)
    const route = ROUTES[cleanPath] || ROUTES['/404'];
    const { page } = route;

    // Auth guard: redirect to /auth if route requires auth and user is not authenticated
    if (route.auth) {
        const { getAuthState } = await import('/src/store/state.js');
        const state = getAuthState();
        if (!state.isAuthenticated) {
            navigateTo('/auth');
            return;
        }
    }

    // Guest-only guard: redirect to / if already authenticated
    if (route.guestOnly) {
        const { getAuthState } = await import('/src/store/state.js');
        const state = getAuthState();
        if (state.isAuthenticated) {
            navigateTo('/');
            return;
        }
    }

    // Incomplete profile guard: redirect to onboarding after login
    if (route.auth && cleanPath !== '/onboarding' && cleanPath !== '/profile') {
        const { getAuthState } = await import('/src/store/state.js');
        const state = getAuthState();
        if (state.isAuthenticated && state.currentUser) {
            const needsOnboarding = !state.currentUser.profile || !state.currentUser.profile.mbti_summary;
            const isAdmin = state.currentUser.role === 'admin';
            if (needsOnboarding && !isAdmin) {
                window.location.href = '/onboarding';
                return;
            }
        }
    }

    // Don't re-render the same page (unless forced)
    if (_currentPage === page && !_isNavigating) return;

    await renderPage(page, route);
}

/**
 * renderPage(pageId, route)
 * Shows the correct page section and hides all others.
 * Runs the page's init function if registered.
 * 
 * @param {string} pageId
 * @param {object} route
 */
async function renderPage(pageId, route) {
    _isNavigating = true;

    // Reset swipe deck initialized guards on navigation to force fresh candidate query
    const swipeBox = document.getElementById('swipe-discovery-box');
    if (swipeBox) delete swipeBox.dataset.initialized;
    const deckContainer = document.getElementById('discovery-deck-container');
    if (deckContainer) delete deckContainer.dataset.initialized;

    // Update document title
    document.title = route.title ? `${route.title} | Konvo` : 'Konvo';

    // Get all page sections - uses the existing .view-section class from index.html
    const allSections = document.querySelectorAll('.view-section');

    // Hide all sections
    allSections.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
    });

    // Show target section
    const targetSectionId = PAGE_SECTIONS[pageId];
    let targetSection = null;

    if (targetSectionId) {
        targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.style.display = '';

            // Page entrance animation
            targetSection.classList.remove('page-enter');
            void targetSection.offsetWidth; // force reflow
            targetSection.classList.add('page-enter');
        }
    }

    // Update active nav link
    syncNavActive(window.location.pathname);

    // Close mobile sidebar on navigation
    closeMobileSidebar();

    // Run page-specific init function if registered
    if (PAGE_INIT_REGISTRY[pageId]) {
        try {
            await PAGE_INIT_REGISTRY[pageId]();
        } catch (err) {
            console.error(`[Router] Page init failed for '${pageId}':`, err);
        }
    } else {
        // Try to lazy-initialize legacy init functions for backwards compatibility
        const legacyInits = {
            'profile':    () => typeof initProfilePage   === 'function' && initProfilePage(),
            'discovery':  () => typeof initSwipePage     === 'function' && initSwipePage('discovery-deck-container'),
            'chat':       () => typeof initChatPage      === 'function' && initChatPage(),
            'matching':   () => typeof initMatchingPage  === 'function' && initMatchingPage(),
            'agents':     () => typeof initAgentsPage    === 'function' && initAgentsPage(),
            'settings':   () => typeof initSettingsPage  === 'function' && initSettingsPage(),
            'feed':       () => typeof initFeedPage      === 'function' && initFeedPage(),
            'onboarding': () => typeof initProfilePage   === 'function' && initProfilePage(),
            'dashboard':  () => typeof initDashboard     === 'function' && initDashboard(),
        };

        if (legacyInits[pageId]) {
            legacyInits[pageId]();
        }
    }

    // Handle tab switching for sub-pages inside view-grid
    if (pageId === 'grid') {
        let tabId = 'discover-deck-map-section'; // default
        const path = window.location.pathname;
        if (path === '/graph') {
            tabId = 'relationship-graph-section';
        } else if (path === '/communities') {
            tabId = 'communities-section';
        }
        const btn = document.querySelector(`.tab-navigation .tab-btn[data-tab="${tabId}"]`);
        if (btn) {
            btn.click();
        } else {
            // Fallback tab content selection if buttons aren't ready yet
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
            const tabBtns = document.querySelectorAll('.tab-navigation .tab-btn');
            tabBtns.forEach(el => {
                el.classList.toggle('active', el.dataset.tab === tabId);
            });
        }
        if (window.map) {
            setTimeout(() => window.map.resize(), 100);
        }
    }

    // Scroll into view for sub-pages inside view-profile
    if (pageId === 'profile') {
        const path = window.location.pathname;
        if (path === '/virtual-dates' || path === '/agents') {
            setTimeout(() => {
                const target = document.querySelector('.virtual-dates-layout') || document.getElementById('sim-history-list');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }

    _currentPage = pageId;
    _isNavigating = false;
}

/**
 * navigateTo(path, pushState = true)
 * Programmatic navigation - the primary way to navigate in code.
 * 
 * @param {string} path - The URL path to navigate to
 * @param {boolean} pushState - Whether to push to browser history
 */
function navigateTo(path, pushState = true) {
    if (pushState) {
        window.history.pushState({ path }, '', path);
    }
    handleRouting(path);
}

/**
 * initSPALinks()
 * Intercepts all internal link clicks and routes them through the SPA router.
 * This was missing from the codebase - the other critical fix.
 * 
 * Uses event delegation on document for performance and to catch dynamically added links.
 */
function initSPALinks() {
    document.addEventListener('click', (e) => {
        // Find closest anchor tag
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Skip: external links, mailto, tel, hash-only, javascript:, target=_blank
        if (
            !href ||
            href.startsWith('http') ||
            href.startsWith('//') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            href.startsWith('#') ||
            link.target === '_blank' ||
            link.rel === 'external' ||
            link.hasAttribute('download')
        ) {
            return;
        }

        // Same origin check
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // Bypass SPA routing for standalone pages
        const standalonePages = ['/blog', '/privacy-policy', '/terms-of-service', '/security-policy', '/feedback', '/hall-of-fame'];
        if (standalonePages.some(page => url.pathname === page || url.pathname.startsWith(page + '/'))) {
            return;
        }

        // Intercept the click and handle via router
        e.preventDefault();
        navigateTo(url.pathname + url.search);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        const path = e.state?.path || window.location.pathname;
        handleRouting(path);
    });
}

/**
 * syncNavActive(path)
 * Updates the active state of sidebar navigation links.
 * 
 * @param {string} path - Current path
 */
function syncNavActive(path) {
    const navLinks = document.querySelectorAll('.sidebar .nav-links li');
    navLinks.forEach(li => {
        li.classList.remove('active');
        const anchor = li.querySelector('a');
        if (!anchor) return;

        const linkPath = new URL(anchor.href, window.location.origin).pathname;

        // Exact match, or "/" matches only "/"
        if (linkPath === path || (linkPath !== '/' && path.startsWith(linkPath))) {
            li.classList.add('active');
        }
    });
}

/**
 * closeMobileSidebar()
 * Closes the mobile sidebar drawer if open.
 */
function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
    }
}

/**
 * getCurrentPage()
 * Returns the current page ID.
 * @returns {string|null}
 */
function getCurrentPage() {
    return _currentPage;
}

// ─── Exports ───────────────────────────────────────────────────────
// Expose globally for backwards compatibility with app.js
window.handleRouting   = handleRouting;
window.initSPALinks    = initSPALinks;
window.navigateTo      = navigateTo;
window.syncNavActive   = syncNavActive;
window.registerPageInit = registerPageInit;
window.getCurrentPage  = getCurrentPage;

// Named exports for ES module imports
export {
    handleRouting,
    initSPALinks,
    navigateTo,
    syncNavActive,
    registerPageInit,
    getCurrentPage,
    ROUTES,
};
