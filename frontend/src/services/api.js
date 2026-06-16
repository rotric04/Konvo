/**
 * KONVO™ API SERVICE
 * Centralized HTTP client with JWT auth, 401 handling, and error management.
 * Extracted from app.js to be the single place for all API calls.
 */

// Automatically detect the correct API backend URL based on the current host.
let detectedApiUrl = window.location.origin;

// 1. Local development static port bypass (e.g., Live Server on 5500, Vite on 5173, etc. -> route to FastAPI gateway)
if (window.location.port && window.location.port !== '8000' && window.location.port !== '80') {
    detectedApiUrl = 'http://localhost:8000';
}
// 2. Known static hosting subdomains -> route to the deployed Render backend gateway
else if (
    window.location.hostname.includes('github.io') || 
    window.location.hostname.includes('pages.dev') ||
    window.location.hostname.includes('netlify.app')
) {
    detectedApiUrl = 'https://konvo-u5qb.onrender.com';
}

export const API_BASE_URL = detectedApiUrl;
export const WS_BASE_URL  = API_BASE_URL.replace(/^http/, 'ws');


/**
 * apiFetch(endpoint, options)
 * The central HTTP client for all Konvo API calls.
 * - Automatically injects Authorization: Bearer <token>
 * - Handles 401 by clearing auth and redirecting
 * - Throws on non-OK responses with detailed error message
 * 
 * @param {string} endpoint - e.g. '/api/users/me'
 * @param {RequestInit} options - standard fetch options
 * @returns {Promise<any>} - parsed JSON response
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('konvo_token') || '';

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (networkError) {
        throw new Error(`Network error: ${networkError.message}`);
    }

    // 401: token expired or invalid → clear auth and redirect
    if (response.status === 401) {
        localStorage.removeItem('konvo_token');

        const isAuthPage = window.location.pathname.includes('/auth') ||
                           window.location.pathname.includes('/login');
        const isLandingPage = window.location.pathname === '/';

        if (!isAuthPage && !isLandingPage) {
            window.location.href = '/auth';
        }
        return null;
    }

    // Non-OK: extract error detail and throw
    if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errDetail = errData.detail || errData.message || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
    }

    // 204 No Content: return null
    if (response.status === 204) return null;

    return response.json();
}

let turnstileConfigCache = null;
/**
 * fetchTurnstileConfig(forceRefresh)
 * Fetches Turnstile site key and fallback challenge from the backend.
 */
export async function fetchTurnstileConfig(forceRefresh = false) {
    if (turnstileConfigCache && !forceRefresh) {
        return turnstileConfigCache;
    }
    try {
        const res = await apiFetch('/api/auth/turnstile-config');
        if (res) {
            // Cache the site key, but always return the latest fallback challenge
            if (turnstileConfigCache) {
                turnstileConfigCache.fallback_challenge = res.fallback_challenge;
            } else {
                turnstileConfigCache = res;
            }
            return res;
        }
    } catch (err) {
        console.error("[API] Failed to fetch Turnstile config:", err);
    }
    return null;
}

// Expose globally for backwards compat with existing app.js code
window.apiFetch      = apiFetch;
window.API_BASE_URL  = API_BASE_URL;
window.WS_BASE_URL   = WS_BASE_URL;
window.fetchTurnstileConfig = fetchTurnstileConfig;
