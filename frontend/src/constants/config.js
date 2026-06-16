/**
 * KONVO™ GLOBAL CONFIG
 * Single source of truth for all app-wide constants.
 */

export const API_BASE_URL = window.location.origin;
export const WS_BASE_URL  = (
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.startsWith('192.168.') || 
    window.location.hostname.startsWith('10.') || 
    window.location.hostname.startsWith('172.') || 
    window.location.hostname.endsWith('.local')
)
    ? window.location.origin.replace(/^http/, 'ws')
    : 'wss://konvo-u5qb.onrender.com';

export const APP_NAME    = 'Konvo';
export const APP_TAGLINE = 'Human Chemistry, Amplified';

export const TOKEN_KEY   = 'konvo_token';
export const THEME_KEY   = 'konvo-theme';
export const DEFAULT_THEME = 'dark';

// Route paths
export const ROUTES = {
    ROOT:        '/',
    DISCOVER:    '/discover',
    CHAT:        '/chat',
    GRID:        '/grid',
    PROFILE:     '/profile',
    SETTINGS:    '/settings',
    ONBOARDING:  '/onboarding',
    AUTH:        '/auth',
    LOGIN:       '/login',
    AGENTS:      '/agents',
    COMMUNITIES: '/communities',
    GRAPH:       '/graph',
    VIRTUAL_DATES: '/virtual-dates',
    COMPATIBILITY: '/compatibility',
    FEEDBACK:    '/feedback',
    NOT_FOUND:   '/404',
};
