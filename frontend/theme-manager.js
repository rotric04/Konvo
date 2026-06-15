/* ═══════════════════════════════════════════════════════════════════
   KONVO™ GLOBAL THEME COORDINATOR (theme-manager.js)
   Synchronizes local settings, browser preferences, and active tabs.
   ═══════════════════════════════════════════════════════════════════ */

class ThemeManager {
    constructor() {
        this.channel = new BroadcastChannel('konvo_theme_channel');
        this.init();
    }

    init() {
        // Multi-tab sync via BroadcastChannel
        this.channel.onmessage = (event) => {
            if (event.data && event.data.type === 'THEME_CHANGE') {
                this.applyTheme(event.data.theme, false);
            }
        };

        // Watch OS preferences change in real-time
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.getTheme() === 'system') {
                this.applyTheme('system', false);
            }
        });

        // Initialize pickers and selectors once DOM is parsed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.syncPickers();
                document.documentElement.classList.remove('preload');
            });
        } else {
            this.syncPickers();
            document.documentElement.classList.remove('preload');
        }
    }

    getTheme() {
        return localStorage.getItem('konvo_theme') || 'system';
    }

    setTheme(theme) {
        localStorage.setItem('konvo_theme', theme);
        this.applyTheme(theme, true);
    }

    syncPickers() {
        const theme = this.getTheme();
        
        // 1. Dropdown select pickers (e.g., in Settings panel)
        const pickers = document.querySelectorAll('#set-theme-picker, #theme-select');
        pickers.forEach(picker => {
            if (picker.value !== theme) {
                picker.value = theme;
            }
        });

        // 2. Custom header button toggle (light <-> dark)
        const toggleBtn = document.getElementById('btn-theme-toggle');
        if (toggleBtn) {
            const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            // Update visual state (e.g. icon classes or custom attributes if needed)
            toggleBtn.setAttribute('data-current-theme', activeTheme);
        }
    }

    applyTheme(theme, broadcast = true) {
        let resolvedTheme = theme;
        if (theme === 'system') {
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        // Apply HTML attribute which controls all semantic tokens
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        
        this.syncPickers();

        // 1. Dynamic MapLibre Style Update
        if (typeof window.updateMapStyle === 'function') {
            window.updateMapStyle(resolvedTheme);
        }

        // 2. Dynamic Three.js Materials & Lights Update
        if (typeof window.updateThreeJSTheme === 'function') {
            window.updateThreeJSTheme(resolvedTheme);
        }

        // 3. Dynamic GSAP Anim Values Update
        if (typeof window.updateGSAPTheme === 'function') {
            window.updateGSAPTheme(resolvedTheme);
        }

        // 4. Tab syncing
        if (broadcast) {
            this.channel.postMessage({ type: 'THEME_CHANGE', theme });
        }

        // Fire global custom event for custom components/widgets
        window.dispatchEvent(new CustomEvent('konvoThemeChanged', {
            detail: { theme: resolvedTheme, raw: theme }
        }));
    }
}

// Instantiate and apply theme immediately before body renders to avoid flickering
window.ThemeManager = new ThemeManager();
window.ThemeManager.applyTheme(window.ThemeManager.getTheme(), false);
