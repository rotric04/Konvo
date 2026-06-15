/**
 * KONVO™ COOKIE CONSENT MODULE
 * frontend/src/components/cookie-consent.js
 *
 * Implements a modern obsidian-glass cookie consent banner and
 * settings manager popup. Stores choices in localStorage.
 */

(function () {
    const STORAGE_KEY = 'konvo_cookie_consent';

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        if (!localStorage.getItem(STORAGE_KEY)) {
            showBanner();
        }
    });

    function injectStyles() {
        if (document.getElementById('konvo-cookie-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'konvo-cookie-styles';
        styles.textContent = `
            .konvo-cookie-banner {
                position: fixed;
                bottom: 2rem;
                left: 50%;
                transform: translate(-50%, 100px);
                width: 90%;
                max-width: 580px;
                background: rgba(18, 18, 20, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 18px;
                padding: 1.5rem 2rem;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 
                            inset 0 1px 1px rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .konvo-cookie-banner.show {
                transform: translate(-50%, 0);
                opacity: 1;
            }

            .konvo-cookie-text {
                font-size: 0.9rem;
                line-height: 1.5;
                color: #a1a1aa;
                margin: 0;
            }

            .konvo-cookie-btn-row {
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
                flex-wrap: wrap;
            }

            .konvo-cookie-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: #ffffff;
                font-family: inherit;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 0.6rem 1.2rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .konvo-cookie-btn:hover {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(255, 255, 255, 0.2);
            }

            .konvo-cookie-btn.primary {
                background: linear-gradient(135deg, #14b8a6, #0d9488);
                border: none;
                color: #ffffff;
            }

            .konvo-cookie-btn.primary:hover {
                background: linear-gradient(135deg, #0d9488, #0f766e);
                box-shadow: 0 4px 12px rgba(20, 184, 166, 0.15);
            }

            /* Preferences Modal */
            .konvo-cookie-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(9, 9, 11, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .konvo-cookie-modal.show {
                opacity: 1;
                pointer-events: all;
            }

            .konvo-cookie-modal-card {
                background: #121214;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px;
                width: 90%;
                max-width: 460px;
                padding: 2rem;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                transform: scale(0.95);
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .konvo-cookie-modal.show .konvo-cookie-modal-card {
                transform: scale(1);
            }

            .konvo-cookie-modal-title {
                font-size: 1.35rem;
                font-weight: 600;
                color: #ffffff;
                margin-top: 0;
                margin-bottom: 0.5rem;
            }

            .konvo-cookie-preference-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 1rem 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                gap: 1rem;
            }

            .konvo-cookie-pref-info {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .konvo-cookie-pref-name {
                font-size: 0.95rem;
                font-weight: 600;
                color: #ffffff;
            }

            .konvo-cookie-pref-desc {
                font-size: 0.8rem;
                color: #71717a;
                line-height: 1.4;
            }

            /* Custom Switch Toggle */
            .konvo-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
                flex-shrink: 0;
            }

            .konvo-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .konvo-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #27272a;
                transition: .3s;
                border-radius: 20px;
            }

            .konvo-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
            }

            input:checked + .konvo-slider {
                background-color: #14b8a6;
            }

            input:checked + .konvo-slider:before {
                transform: translateX(20px);
            }

            input:disabled + .konvo-slider {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(styles);
    }

    function showBanner() {
        const banner = document.createElement('div');
        banner.className = 'konvo-cookie-banner';
        banner.innerHTML = `
            <p class="konvo-cookie-text">
                We use cookies to analyze traffic, personalize your Cognitive Calibration experience, and enable secure AI twin communications.
            </p>
            <div class="konvo-cookie-btn-row">
                <button class="konvo-cookie-btn" id="konvo-cookie-manage">Manage</button>
                <button class="konvo-cookie-btn" id="konvo-cookie-reject">Reject</button>
                <button class="konvo-cookie-btn primary" id="konvo-cookie-accept">Accept All</button>
            </div>
        `;
        document.body.appendChild(banner);

        // Slide in
        requestAnimationFrame(() => {
            banner.classList.add('show');
        });

        document.getElementById('konvo-cookie-accept').addEventListener('click', () => {
            saveChoices({ essential: true, personalization: true, analytics: true });
            dismissBanner();
        });

        document.getElementById('konvo-cookie-reject').addEventListener('click', () => {
            saveChoices({ essential: true, personalization: false, analytics: false });
            dismissBanner();
        });

        document.getElementById('konvo-cookie-manage').addEventListener('click', () => {
            showModal();
        });
    }

    function dismissBanner() {
        const banner = document.querySelector('.konvo-cookie-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 400);
        }
    }

    function showModal() {
        let modal = document.querySelector('.konvo-cookie-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'konvo-cookie-modal';
            modal.innerHTML = `
                <div class="konvo-cookie-modal-card">
                    <h3 class="konvo-cookie-modal-title">Cookie Preferences</h3>
                    <p class="konvo-cookie-pref-desc" style="margin-bottom: 1.5rem;">
                        Customize which cookies you permit us to save. Strictly necessary cookies are required to manage your sessions securely.
                    </p>

                    <div class="konvo-cookie-preference-item">
                        <div class="konvo-cookie-pref-info">
                            <span class="konvo-cookie-pref-name">Strictly Necessary</span>
                            <span class="konvo-cookie-pref-desc">Required to maintain session tokens, OTP cache, and security safeguards.</span>
                        </div>
                        <label class="konvo-switch">
                            <input type="checkbox" id="pref-essential" checked disabled />
                            <span class="konvo-slider"></span>
                        </label>
                    </div>

                    <div class="konvo-cookie-preference-item">
                        <div class="konvo-cookie-pref-info">
                            <span class="konvo-cookie-pref-name">AI Calibration & Preferences</span>
                            <span class="konvo-cookie-pref-desc">Stores identity calibrations and personalization tokens to adapt questions.</span>
                        </div>
                        <label class="konvo-switch">
                            <input type="checkbox" id="pref-personalization" checked />
                            <span class="konvo-slider"></span>
                        </label>
                    </div>

                    <div class="konvo-cookie-preference-item">
                        <div class="konvo-cookie-pref-info">
                            <span class="konvo-cookie-pref-name">Analytical Tracking</span>
                            <span class="konvo-cookie-pref-desc">Monitors platform latency speeds and feature usage for performance tuning.</span>
                        </div>
                        <label class="konvo-switch">
                            <input type="checkbox" id="pref-analytics" checked />
                            <span class="konvo-slider"></span>
                        </label>
                    </div>

                    <div class="konvo-cookie-btn-row" style="margin-top: 1.5rem;">
                        <button class="konvo-cookie-btn" id="konvo-cookie-modal-cancel">Cancel</button>
                        <button class="konvo-cookie-btn primary" id="konvo-cookie-modal-save">Save Settings</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('konvo-cookie-modal-cancel').addEventListener('click', () => {
                modal.classList.remove('show');
            });

            document.getElementById('konvo-cookie-modal-save').addEventListener('click', () => {
                const personalization = document.getElementById('pref-personalization').checked;
                const analytics = document.getElementById('pref-analytics').checked;
                saveChoices({ essential: true, personalization, analytics });
                modal.classList.remove('show');
                dismissBanner();
            });
        }

        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    function saveChoices(choices) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
    }

    // Expose globally to trigger preferences from footer/settings
    window.konvoShowCookieSettings = showModal;
})();
