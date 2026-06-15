/**
 * KONVO™ TOAST NOTIFICATIONS (src/components/toast.js)
 * Modular non-blocking toast notification system.
 * Uses CSS classes from components.css for premium design, transitions, and responsiveness.
 */

export const KonvoToast = {
    /**
     * Show a toast message.
     * @param {string} message - The text content to display.
     * @param {'success'|'error'|'warning'|'info'} type - Severity classification.
     * @param {number} duration - Time visible in milliseconds.
     */
    show(message, type = 'info', duration = 3500) {
        // Find or create toast container
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '✨'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '✨'}</span>
            <div class="toast-body">${message}</div>
        `;
        
        container.appendChild(toast);

        // Auto-remove setup
        let timeoutId = setTimeout(() => {
            dismiss();
        }, duration);

        function dismiss() {
            clearTimeout(timeoutId);
            toast.classList.add('exiting');
            
            // Wait for slide-out transition
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
            
            // Hard fallback in case animation fails
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }

        // Allow manual click-to-dismiss
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', dismiss);
    }
};

// Bind to window for backwards compatibility with legacy modules
window.KonvoToast = KonvoToast;
