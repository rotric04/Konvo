/**
 * KONVO™ NAVIGATION COMPONENT
 * src/components/nav.js
 *
 * Handles sidebar user info rendering and logout actions.
 */

import { clearAuth } from '/src/store/state.js';

export function setupLogout() {
    const btn = document.getElementById('btn-logout');
    if (btn) {
        btn.replaceWith(btn.cloneNode(true));
        const newBtn = document.getElementById('btn-logout');
        newBtn.addEventListener('click', () => {
            if (confirm("Disconnect cryptographic session and exit?")) {
                clearAuth();
                window.location.href = '/login';
            }
        });
    }
}

export function updateSidebarUser(user) {
    if (!user) return;
    const nameEl = document.querySelector('.sidebar .user-name');
    const idEl = document.querySelector('.sidebar .user-id');
    
    if (nameEl) {
        nameEl.textContent = user.profile ? user.profile.display_name : 'New Node';
    }
    if (idEl) {
        idEl.textContent = user.konvo_id || 'KONVO-XXXX';
    }

    // If user is admin, inject link to admin portal
    const navLinks = document.querySelector('.sidebar .nav-links');
    if (navLinks && user.role === 'admin' && !document.getElementById('nav-admin-link')) {
        const li = document.createElement('li');
        li.id = 'nav-admin-link';
        li.innerHTML = `<a href="/admin-portal-secured" rel="external" style="color: var(--accent-rose);">Admin Console</a>`;
        navLinks.appendChild(li);
    }
}

// Expose globally for backward compatibility
window.setupLogout = setupLogout;
window.updateSidebarUser = updateSidebarUser;
