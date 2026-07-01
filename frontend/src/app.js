/**
 * KONVO™ APP ENTRY POINT
 * src/app.js - Wires together all modules and boots the application.
 */

import { registerPageInit } from '/src/router/router.js';
import { apiFetch } from '/src/services/api.js';

// Feature modules
import { initSwipePage, initRizzPanel } from '/src/features/discovery/discovery.js';
import { initChatPage } from '/src/features/chat/chat.js';
import { initProfilePage } from '/src/features/profile/profile.js';
import { initSettingsPage } from '/src/features/settings/settings.js';
import { initAgentsPage } from '/src/features/agents/agents.js';
import { initCommunitiesPage, initGraphPage, initMapPage, initDiscoverTabs } from '/src/features/grid/grid.js';
import { setupLogout, updateSidebarUser } from '/src/components/nav.js';
import { initLiveWebSockets } from '/src/services/websocket.js';
import { initRealtimeWebSockets } from '/src/services/realtime.js';
import { openVirtualDate, initRatingPopup, animateStatCounters } from '/src/features/virtual-dates/virtual-dates.js';
import { initLandingPage, initAgentLivePreview, initCookieConsent, initUserGuideTabs } from '/src/features/landing/landing.js';
import { initAuthPage } from '/src/features/auth/auth.js?v=2';
import { setupModalClosers, drainLegacyModalQueue } from '/src/components/modal.js';

// ─── Observability & Analytics (lazy, optional) ───────────────────────────
import { initErrorTracking, captureError, setErrorUser } from '/src/services/error-tracking.js';
import { identifyUser, trackPageView, resetAnalytics } from '/src/services/analytics.js';

// ─── Register SPA page initializers ──────────────────────────────────
registerPageInit('home', () => {
    const hrs = new Date().getHours();
    let greet = "Good morning.";
    if (hrs >= 12 && hrs < 17) greet = "Good afternoon.";
    else if (hrs >= 17 || hrs < 5) greet = "Good evening.";

    const greetingEl = document.getElementById('companion-greeting');
    if (greetingEl) {
        const name = window.currentUser?.display_name || (window.currentUser?.profile?.display_name) || "there";
        greetingEl.textContent = `${greet} Hello, ${name}.`;
    }

    const continueBtn = document.getElementById('btn-companion-continue');
    if (continueBtn) {
        continueBtn.onclick = () => {
            window.navigateTo('/discover');
        };
    }
});

registerPageInit('discover', () => {
    initSwipePage('swipe-discovery-box');
    initRizzPanel();
});

registerPageInit('chat', () => {
    initChatPage();
});

registerPageInit('grid', () => {
    initSwipePage('discovery-deck-container');
    initMapPage();
    initCommunitiesPage();
    initGraphPage();
    initDiscoverTabs();
});

registerPageInit('profile', () => {
    initProfilePage();
    initAgentsPage();
});

registerPageInit('settings', () => {
    initSettingsPage();
});


// Expose apiFetch to window for other modules
window.apiFetch = apiFetch;

// ─── Auth Check ─────────────────────────────────────────────────────
async function checkAuth() {
    const { getAuthState, setAuth, clearAuth } = await import('/src/store/state.js');
    const path = window.location.pathname;
    const isAuthPage = path.includes('/auth') || path.includes('/login');
    const isMainPage = path === '/' || path.includes('/index.html');

    const token = localStorage.getItem('konvo_token') || '';
    if (!token) {
        clearAuth();
        if (!isAuthPage && !isMainPage) {
            window.location.href = '/login';
        }
        return false;
    }

    try {
        const currentUser = await apiFetch('/api/users/me');
        if (currentUser) {
            setAuth(token, currentUser);
            updateSidebarUser(currentUser);

            // ── Identify user in analytics & error tracking ───────────────────
            try {
                await identifyUser(currentUser.id, currentUser);
                setErrorUser(currentUser);
            } catch (_) {} // Never let tracking break auth

            if (isAuthPage) {
                window.location.href = '/';
            }
            return true;
        }
    } catch (e) {
        console.error('[Auth] checkAuth failed:', e);
        try { captureError(e, { feature: 'auth', action: 'checkAuth' }); } catch (_) {}
        clearAuth();
        if (!isAuthPage && !isMainPage) {
            window.location.href = '/login';
        }
    }
    return false;
}

// ─── Bootstrap ────────────────────────────────────────────────────────
async function bootKonvo() {
    // 0. Initialize error tracking (first — captures all subsequent errors)
    try { await initErrorTracking(); } catch (_) {}

    // 1. Initialize modal system (must be before any modal can open)
    setupModalClosers();
    drainLegacyModalQueue();

    // 2. Initialize theme (already handled by theme-manager.js in <head>)

    // 3. Initialize scroll reveal
    initScrollRevealObserver();

    // 4. Initialize cookie consent
    initCookieConsent();

    // 5. Initialize user guide tabs
    initUserGuideTabs();

    // 6. Initialize sidebar mobile controls
    initMobileSidebar();

    // 7. Initialize theme toggle
    initThemeToggle();

    // 8. Initialize logout handler
    setupLogout();

    // 9. Initialize DIGIPIN modal binding
    initDigipinHelper();

    // 10. Check authentication & boot routing
    await bootAuth();

    // 11. Hide splash loader
    hideSplash();

    // 12. Initialize stat counters
    animateStatCounters();

    // 13. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[ServiceWorker] Registered successfully with scope: ', reg.scope))
                .catch(err => console.error('[ServiceWorker] Registration failed: ', err));
        });
    }
}

// ─── Auth Boot ──────────────────────────────────────────────────────
async function bootAuth() {
    const { initSPALinks, handleRouting } = await import('/src/router/router.js');

    // Determine current path
    const path = window.location.pathname;

    // Auth page (auth.html) handles its own init via old app.js
    if (path.includes('/auth') || path.includes('/login')) {
        initAuthPage();
        return;
    }

    // Check auth state
    let isAuth = false;
    try {
        isAuth = await checkAuth();
    } catch (e) {
        console.error('[Boot] Auth check failed:', e);
    }

    const authLayout = document.getElementById('auth-app-layout');
    const unauthLayout = document.getElementById('unauth-landing-layout');

    if (isAuth) {
        // Show authenticated app layout
        if (authLayout) authLayout.classList.remove('hidden');
        if (unauthLayout) unauthLayout.classList.add('hidden');

        // Boot SPA routing
        initSPALinks();
        handleRouting(path);

        // Boot live features
        initLiveWebSockets();
        initRealtimeWebSockets();
        initRatingPopup();

        // Wire up virtual date launch buttons (delegation)
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-open-vdate]');
            if (btn) {
                const loc = btn.dataset.openVdate || 'rooftop';
                const partnerName = btn.dataset.partnerName || 'Your Match';
                const { getState } = await import('/src/store/state.js');
                const partnerId = btn.dataset.partnerId || getState('chatPartnerId');
                // Show device recommendation popup first, then launch
                window.showVirtualDateDeviceWarning(() => {
                    openVirtualDate(loc, {
                        displayName: window.currentUser?.profile?.display_name || 'You',
                        partnerName,
                        partnerId,
                    });
                });
            }
        });

        // JWT background refresh every 10 minutes
        startTokenRefresh();

    } else {
        // Show landing page
        if (authLayout) authLayout.classList.add('hidden');
        if (unauthLayout) unauthLayout.classList.remove('hidden');

        initLandingPage();
        initAgentLivePreview();
        animateStatCounters();
    }
}

// ─── Token Refresh ──────────────────────────────────────────────────
function startTokenRefresh() {
    setInterval(async () => {
        try {
            const res = await apiFetch('/api/auth/refresh', { method: 'POST' });
            if (res?.access_token) {
                localStorage.setItem('konvo_token', res.access_token);
                window.token = res.access_token;
            }
        } catch (err) {
            console.error('[Auth] Token refresh failed:', err);
        }
    }, 10 * 60 * 1000); // 10 minutes
}

// ─── Scroll Reveal ──────────────────────────────────────────────────
function initScrollRevealObserver() {
    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-left, .reveal-right, .reveal-scale');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
}

// ─── Mobile Sidebar ─────────────────────────────────────────────────
function initMobileSidebar() {
    const btnToggle = document.getElementById('btn-sidebar-toggle');
    const btnClose = document.getElementById('btn-sidebar-close');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (!sidebar) return;

    const openSidebar = () => {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
    };

    if (btnToggle) btnToggle.addEventListener('click', openSidebar);
    if (btnClose) btnClose.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
}

// ─── Theme Toggle ───────────────────────────────────────────────────
function initThemeToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        if (window.ThemeManager?.setTheme) {
            window.ThemeManager.setTheme(next);
        }
    });
}

// ─── DIGIPIN Helper ─────────────────────────────────────────────────
function initDigipinHelper() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('#btn-know-digipin, #btn-set-know-digipin, #btn-wiz-know-digipin');
        if (target) {
            window.konvoOpenModal?.('digipin-helper-modal');
        }
    });

    // Formatting helper function for DIGIPIN input fields
    const formatDigipin = (value) => {
        const cleaned = value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 10);

        let formatted = cleaned;

        if (cleaned.length > 3) {
            formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
        }

        if (cleaned.length > 6) {
            formatted =
                cleaned.slice(0, 3) +
                '-' +
                cleaned.slice(3, 6) +
                '-' +
                cleaned.slice(6);
        }

        return formatted;
    };

    // Use event delegation to format all DIGIPIN input fields dynamically
    document.addEventListener('input', (e) => {
        const id = e.target.id;
        if (id === 'set-digipin' || id === 'wiz-digipin' || id === 'analyzer-digipin-input') {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const origLength = e.target.value.length;
            
            const formatted = formatDigipin(e.target.value);
            e.target.value = formatted;
            
            const diff = formatted.length - origLength;
            e.target.setSelectionRange(start + diff, end + diff);
        }
    });
}

// ─── Splash Loader ──────────────────────────────────────────────────
function hideSplash() {
    const loader = document.getElementById('app-splash-loader');
    if (!loader) return;

    setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => { loader.style.display = 'none'; }, 600);
    }, 600);
}

// ─── Boot Sequence ──────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootKonvo);
} else {
    bootKonvo();
}
