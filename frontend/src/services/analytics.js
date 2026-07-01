/**
 * KONVO™ PRODUCT ANALYTICS SERVICE
 * frontend/src/services/analytics.js
 *
 * PostHog analytics integration — lazy-loaded, fully optional.
 * If POSTHOG_API_KEY is not served or PostHog fails to load,
 * all tracking calls are silent no-ops.
 *
 * Usage:
 *   import { trackEvent, identifyUser, trackPageView } from '/src/services/analytics.js';
 *   trackEvent('chat_message_sent', { conversation_id: 123 });
 */

let _ph = null;
let _initialized = false;
let _initPromise = null;

// PostHog API key injected at build time via meta tag or window global
// The backend does NOT expose this in the API — it's a public key (safe client-side)
const POSTHOG_KEY   = window.__POSTHOG_KEY__ || '';
const POSTHOG_HOST  = window.__POSTHOG_HOST__ || 'https://app.posthog.com';

/**
 * Lazily load PostHog and initialize it.
 * Returns the posthog instance or null if unavailable.
 */
async function _initPostHog() {
    if (_initialized) return _ph;
    if (_initPromise) return _initPromise;

    if (!POSTHOG_KEY) {
        _initialized = true;
        return null;
    }

    _initPromise = new Promise((resolve) => {
        try {
            // PostHog snippet approach — load JS from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1/dist/posthog.min.js';
            script.async = true;

            script.onload = () => {
                try {
                    if (window.posthog) {
                        window.posthog.init(POSTHOG_KEY, {
                            api_host: POSTHOG_HOST,
                            autocapture: false,       // Manual tracking only for precision
                            capture_pageview: false,  // We handle this manually in the router
                            persistence: 'localStorage+cookie',
                            loaded: (ph) => {
                                _ph = ph;
                                _initialized = true;
                                console.debug('[Analytics] PostHog initialized.');
                                resolve(_ph);
                            },
                        });
                    } else {
                        _initialized = true;
                        resolve(null);
                    }
                } catch (err) {
                    console.debug('[Analytics] PostHog init error:', err);
                    _initialized = true;
                    resolve(null);
                }
            };

            script.onerror = () => {
                console.debug('[Analytics] PostHog failed to load (network/ad-blocker).');
                _initialized = true;
                resolve(null);
            };

            document.head.appendChild(script);
        } catch (err) {
            console.debug('[Analytics] PostHog setup error:', err);
            _initialized = true;
            resolve(null);
        }
    });

    return _initPromise;
}

/**
 * Track a named event with optional properties.
 * @param {string} eventName  e.g. 'chat_message_sent'
 * @param {Object} [props]    Additional properties
 */
export async function trackEvent(eventName, props = {}) {
    try {
        const ph = await _initPostHog();
        if (ph) {
            ph.capture(eventName, {
                ...props,
                $timestamp: new Date().toISOString(),
            });
        }
    } catch (_) {
        // Silent fail — analytics must never break the app
    }
}

/**
 * Identify the current user after login.
 * @param {string|number} userId   Konvo user ID
 * @param {Object} [traits]        User traits (never include PII like email)
 */
export async function identifyUser(userId, traits = {}) {
    try {
        const ph = await _initPostHog();
        if (ph) {
            ph.identify(String(userId), {
                mbti_type: traits.mbti_type,
                gender: traits.gender,
                premium: traits.premium_user,
                onboarding_complete: Boolean(traits.profile?.mbti_summary),
            });
        }
    } catch (_) {}
}

/**
 * Track a page view. Called by the SPA router on every navigation.
 * @param {string} route  e.g. '/chat', '/discover'
 */
export async function trackPageView(route) {
    try {
        const ph = await _initPostHog();
        if (ph) {
            ph.capture('$pageview', {
                $current_url: window.location.href,
                route,
            });
        }
    } catch (_) {}
}

/**
 * Reset the user session (on logout).
 */
export async function resetAnalytics() {
    try {
        const ph = await _initPostHog();
        if (ph) ph.reset();
    } catch (_) {}
}

// Eagerly begin init in the background (non-blocking)
_initPostHog().catch(() => {});
