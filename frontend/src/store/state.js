/**
 * KONVO™ GLOBAL STATE STORE
 * Centralized, reactive state management.
 * Replaces scattered global variables throughout app.js.
 */

// ─── State Object ──────────────────────────────────────────────────
const _state = {
    // Auth
    token: localStorage.getItem('konvo_token') || '',
    isAuthenticated: false,
    currentUser: null,

    // Chat
    activeWsChat: null,
    typingTimeout: null,
    chatPartnerId: null,

    // UI
    theme: localStorage.getItem('konvo-theme') || 'dark',
    isSidebarOpen: false,
    isLoading: false,
};

// ─── Subscribers ────────────────────────────────────────────────────
const _subscribers = new Map();

/**
 * subscribe(key, callback)
 * Listen for state changes on a specific key.
 * @param {string} key
 * @param {Function} callback - receives (newValue, oldValue)
 * @returns {Function} unsubscribe function
 */
function subscribe(key, callback) {
    if (!_subscribers.has(key)) {
        _subscribers.set(key, new Set());
    }
    _subscribers.get(key).add(callback);
    return () => _subscribers.get(key).delete(callback);
}

/**
 * setState(key, value)
 * Update a single state key and notify subscribers.
 * @param {string} key
 * @param {*} value
 */
function setState(key, value) {
    const oldValue = _state[key];
    _state[key] = value;

    if (_subscribers.has(key)) {
        _subscribers.get(key).forEach(cb => {
            try { cb(value, oldValue); } catch (e) { console.error('[State] Subscriber error:', e); }
        });
    }
}

/**
 * getState(key)
 * Get current value of a state key.
 * @param {string} key
 * @returns {*}
 */
function getState(key) {
    return _state[key];
}

/**
 * getAuthState()
 * Convenience: returns a snapshot of auth-related state.
 * @returns {{ isAuthenticated: boolean, currentUser: object|null, token: string }}
 */
function getAuthState() {
    return {
        isAuthenticated: _state.isAuthenticated,
        currentUser: _state.currentUser,
        token: _state.token,
    };
}

// ─── Auth State Helpers ─────────────────────────────────────────────

function setAuth(token, user) {
    localStorage.setItem('konvo_token', token);
    setState('token', token);
    setState('currentUser', user);
    setState('isAuthenticated', true);
    // Backwards compat: expose global
    window.token = token;
    window.currentUser = user;
}

function clearAuth() {
    localStorage.removeItem('konvo_token');
    setState('token', '');
    setState('currentUser', null);
    setState('isAuthenticated', false);
    window.token = '';
    window.currentUser = null;
}

function updateUser(user) {
    setState('currentUser', user);
    window.currentUser = user;
}

// ─── Exports ───────────────────────────────────────────────────────
window.KonvoState = { getState, setState, subscribe, getAuthState, setAuth, clearAuth, updateUser };

export { getState, setState, subscribe, getAuthState, setAuth, clearAuth, updateUser };
