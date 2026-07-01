/**
 * KONVO™ FRONTEND ERROR TRACKING SERVICE
 * frontend/src/services/error-tracking.js
 *
 * Sentry browser SDK integration — lazy-loaded, fully optional.
 * Captures unhandled JS errors and promise rejections.
 * Adds breadcrumbs at key user actions for better debugging context.
 *
 * Usage:
 *   import { initErrorTracking, captureError, addBreadcrumb } from '/src/services/error-tracking.js';
 *   initErrorTracking(); // Call once at app startup
 *   captureError(new Error('Something broke'), { feature: 'chat' });
 */

let _sentry = null;
let _initialized = false;

// Sentry DSN must be served safely — inject via meta tag in HTML
// <meta name="sentry-dsn" content="https://...@sentry.io/...">
// or via window global set by the backend-rendered HTML
function _getSentryDSN() {
    // Try window global first (set in app.html)
    if (window.__SENTRY_DSN__) return window.__SENTRY_DSN__;

    // Try meta tag
    const metaTag = document.querySelector('meta[name="sentry-dsn"]');
    if (metaTag) return metaTag.getAttribute('content');

    return '';
}

/**
 * Initialize Sentry browser SDK.
 * Safe to call multiple times — only initializes once.
 */
export async function initErrorTracking() {
    if (_initialized) return;

    const dsn = _getSentryDSN();
    if (!dsn) {
        _initialized = true;
        console.debug('[ErrorTracking] Sentry DSN not configured — error tracking disabled.');
        return;
    }

    try {
        await _loadSentrySDK();

        if (window.Sentry) {
            window.Sentry.init({
                dsn,
                environment: window.__APP_ENV__ || 'production',
                release: window.__APP_VERSION__ || '1.0.0',
                tracesSampleRate: 0.1,
                integrations: [
                    new window.Sentry.BrowserTracing(),
                ],
                // Ignore common benign errors
                ignoreErrors: [
                    'ResizeObserver loop limit exceeded',
                    'Non-Error promise rejection captured',
                    'AbortError',
                    /^Script error/,
                    /^Network request failed/,
                ],
                beforeSend(event) {
                    // Strip any PII from request data
                    if (event.request) {
                        delete event.request.cookies;
                        delete event.request.headers?.Authorization;
                    }
                    return event;
                },
            });

            _sentry = window.Sentry;
            _initialized = true;

            // Set up global error handlers
            _setupGlobalHandlers();

            console.debug('[ErrorTracking] Sentry initialized.');
        }
    } catch (err) {
        console.debug('[ErrorTracking] Sentry failed to initialize:', err);
        _initialized = true;
    }
}

/**
 * Lazily load the Sentry browser SDK from CDN.
 */
function _loadSentrySDK() {
    return new Promise((resolve, reject) => {
        if (window.Sentry) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        // Use the bundle that includes BrowserTracing
        script.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.tracing.min.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
            console.debug('[ErrorTracking] Sentry SDK failed to load.');
            resolve(); // Don't reject — allow app to continue without Sentry
        };
        document.head.appendChild(script);
    });
}

/**
 * Set up window-level error and unhandled rejection handlers.
 */
function _setupGlobalHandlers() {
    // These complement Sentry's built-in handlers with extra context
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        // Skip network errors and aborts (expected behavior)
        if (reason?.name === 'AbortError') return;
        if (reason?.message?.includes('Network request failed')) return;

        addBreadcrumb({
            category: 'promise',
            message: `Unhandled rejection: ${reason?.message || reason}`,
            level: 'error',
        });
    });
}

/**
 * Manually capture an error with optional context.
 * @param {Error|string} error   The error to capture
 * @param {Object} [context]     Extra context (feature, action, etc.)
 */
export function captureError(error, context = {}) {
    try {
        if (_sentry) {
            _sentry.withScope((scope) => {
                Object.entries(context).forEach(([key, value]) => {
                    scope.setExtra(key, value);
                });
                if (typeof error === 'string') {
                    _sentry.captureMessage(error, 'error');
                } else {
                    _sentry.captureException(error);
                }
            });
        }
    } catch (_) {
        // Never let error tracking break the app
    }
}

/**
 * Add a breadcrumb to the Sentry event trail.
 * @param {Object} breadcrumb  { category, message, level, data }
 */
export function addBreadcrumb(breadcrumb = {}) {
    try {
        if (_sentry) {
            _sentry.addBreadcrumb({
                category: breadcrumb.category || 'app',
                message: breadcrumb.message || '',
                level: breadcrumb.level || 'info',
                data: breadcrumb.data,
                timestamp: Date.now() / 1000,
            });
        }
    } catch (_) {}
}

/**
 * Set the current user context for error reports.
 * Only sets non-PII identifiers.
 * @param {Object} user  { id, konvo_id, role }
 */
export function setErrorUser(user = {}) {
    try {
        if (_sentry) {
            _sentry.setUser({
                id: user.id ? String(user.id) : undefined,
                username: user.konvo_id || undefined,
                segment: user.role || 'user',
            });
        }
    } catch (_) {}
}

/**
 * Clear user context on logout.
 */
export function clearErrorUser() {
    try {
        if (_sentry) _sentry.setUser(null);
    } catch (_) {}
}
