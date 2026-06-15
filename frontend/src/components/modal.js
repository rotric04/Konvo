/**
 * KONVO™ MODAL SYSTEM
 * Unified, accessible modal management.
 * 
 * Fixes all modal issues:
 * ✓ Close button always works
 * ✓ ESC key closes
 * ✓ Backdrop click closes  
 * ✓ Body scroll locks when modal open
 * ✓ No sticky overlays after close
 * ✓ Consistent animations
 * ✓ ARIA attributes
 * ✓ Focus trapping
 * ✓ Focus returns to trigger on close
 * ✓ No head-script stub needed (race condition removed)
 */

let _scrollbarWidth = 0;
let _bodyScrollLocked = false;
let _activeModals = new Set();
let _lastFocusTrigger = null;

// ─── Scroll Lock ────────────────────────────────────────────────────

function getScrollbarWidth() {
    if (_scrollbarWidth) return _scrollbarWidth;
    const outer = document.createElement('div');
    outer.style.cssText = 'visibility:hidden;overflow:scroll;position:absolute;top:-9999px';
    document.body.appendChild(outer);
    const inner = document.createElement('div');
    outer.appendChild(inner);
    _scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.remove();
    return _scrollbarWidth;
}

function lockBodyScroll() {
    if (_bodyScrollLocked) return;
    const sbw = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${sbw}px`;
    _bodyScrollLocked = true;
}

function unlockBodyScroll() {
    if (_activeModals.size > 0) return; // Still have open modals
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    _bodyScrollLocked = false;
}

// ─── Focus Trap ─────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function trapFocus(modalEl) {
    const focusable = Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTORS));
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    // Focus first element
    setTimeout(() => first?.focus(), 50);

    const handler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
    };

    modalEl._focusTrapHandler = handler;
    modalEl.addEventListener('keydown', handler);
}

function releaseFocus(modalEl) {
    if (modalEl._focusTrapHandler) {
        modalEl.removeEventListener('keydown', modalEl._focusTrapHandler);
        delete modalEl._focusTrapHandler;
    }
}

// ─── Core Open / Close ──────────────────────────────────────────────

/**
 * openModal(idOrEl, trigger?)
 * Open a modal by ID or element reference.
 * @param {string|HTMLElement} idOrEl
 * @param {HTMLElement} [trigger] - Element that triggered the modal (for focus return)
 */
function openModal(idOrEl, trigger = null) {
    const modal = typeof idOrEl === 'string'
        ? document.getElementById(idOrEl)
        : idOrEl;

    if (!modal) {
        console.warn(`[Modal] Modal not found: ${idOrEl}`);
        return;
    }

    if (_lastFocusTrigger === null) {
        _lastFocusTrigger = trigger || document.activeElement;
    }

    // ARIA attributes
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    if (!modal.getAttribute('aria-label') && !modal.getAttribute('aria-labelledby')) {
        const title = modal.querySelector('h2, h3, .modal-title');
        if (title) {
            if (!title.id) title.id = `modal-title-${Date.now()}`;
            modal.setAttribute('aria-labelledby', title.id);
        }
    }

    modal.classList.add('active');
    _activeModals.add(modal.id || modal);
    lockBodyScroll();
    trapFocus(modal);
}

/**
 * closeModal(idOrEl)
 * Close a modal by ID or element reference.
 * @param {string|HTMLElement} idOrEl
 */
function closeModal(idOrEl) {
    const modal = typeof idOrEl === 'string'
        ? document.getElementById(idOrEl)
        : idOrEl;

    if (!modal) return;

    modal.classList.remove('active');
    _activeModals.delete(modal.id || modal);
    releaseFocus(modal);

    // Return focus to trigger element
    if (_activeModals.size === 0) {
        unlockBodyScroll();
        if (_lastFocusTrigger && typeof _lastFocusTrigger.focus === 'function') {
            setTimeout(() => _lastFocusTrigger?.focus(), 50);
        }
        _lastFocusTrigger = null;
    }
}

/**
 * closeAllModals()
 * Close every open modal.
 */
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
        releaseFocus(modal);
    });
    _activeModals.clear();
    unlockBodyScroll();
    if (_lastFocusTrigger?.focus) _lastFocusTrigger.focus();
    _lastFocusTrigger = null;
}

// ─── Global Setup ───────────────────────────────────────────────────

/**
 * setupModalClosers()
 * Initializes global ESC key handler and backdrop click handler.
 * Call once on app init.
 */
function setupModalClosers() {
    // ESC key: close topmost modal
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openModals = document.querySelectorAll('.modal.active');
        if (!openModals.length) return;
        e.preventDefault();
        closeModal(openModals[openModals.length - 1]);
    });

    // Backdrop click: click outside modal-content closes it
    document.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal.active');
        if (!modal) return;
        // Only close if click is directly on the modal backdrop, not modal-content
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    // Close buttons with class .close-modal
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.close-modal');
        if (!closeBtn) return;
        const modal = closeBtn.closest('.modal');
        if (modal) closeModal(modal);
    });

    // MutationObserver: watch for modals getting .active added externally
    // (backwards compat with legacy code that directly adds .active class)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;
            const el = mutation.target;
            if (!el.classList.contains('modal')) return;

            if (el.classList.contains('active')) {
                // Modal was opened externally
                if (!_activeModals.has(el.id || el)) {
                    _activeModals.add(el.id || el);
                    lockBodyScroll();
                    trapFocus(el);
                }
            } else {
                // Modal was closed externally
                _activeModals.delete(el.id || el);
                releaseFocus(el);
                if (_activeModals.size === 0) unlockBodyScroll();
            }
        });
    });

    // Observe all modals
    document.querySelectorAll('.modal').forEach(modal => {
        observer.observe(modal, { attributes: true });
    });

    // Also observe body for dynamically added modals
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.classList?.contains('modal')) {
                    observer.observe(node, { attributes: true });
                }
                node.querySelectorAll?.('.modal').forEach(modal => {
                    observer.observe(modal, { attributes: true });
                });
            });
        });
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── Drain Legacy Modal Queue ────────────────────────────────────────
// Handles the head-script stub queue from the old index.html
function drainLegacyModalQueue() {
    if (typeof window.__drainModalQueue === 'function') {
        window._konvoOpenModalReal  = openModal;
        window._konvoCloseModalReal = closeModal;
        window.__drainModalQueue();
    }
}

// ─── Exports ───────────────────────────────────────────────────────
// Replace the stub with real implementations
window.konvoOpenModal  = openModal;
window.konvoCloseModal = closeModal;

export { openModal, closeModal, closeAllModals, setupModalClosers, drainLegacyModalQueue };
