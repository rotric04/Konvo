/**
 * KONVO™ REALTIME SERVICE
 * src/services/realtime.js
 *
 * Establishes real-time connection to the gateway for:
 * - Presence updates (online/offline indicators)
 * - Chat typing indicators
 * - Read receipts
 * - In-app notifications
 *
 * Enhancements:
 * - Exponential backoff reconnection (1s → 2s → 4s → 8s → 16s → 30s max)
 * - Ping/pong heartbeat every 25 seconds to keep presence alive
 * - Message queue: messages sent while disconnected are queued and replayed on reconnect
 */

import { WS_BASE_URL } from '/src/constants/config.js';

let realtimeWs = null;
const subscribers = {}; // { eventType: [callback1, callback2] }

// Reconnection state
let _reconnectAttempts = 0;
let _reconnectTimer    = null;
let _heartbeatTimer    = null;
let _isIntentionalClose = false;

// Message queue for offline-period messages (best-effort delivery)
const _messageQueue = [];
const MAX_QUEUE_SIZE = 50;

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
function _getBackoffMs(attempt) {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
}

/**
 * Initialize the realtime WebSocket connection.
 * Safe to call multiple times — reconnects if not already connected.
 */
export function initRealtimeWebSockets() {
    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) return;
    if (realtimeWs && realtimeWs.readyState === WebSocket.CONNECTING) return;

    const token = localStorage.getItem('konvo_token');
    if (!token) {
        console.warn('[Realtime WS] No auth token — cannot connect.');
        return;
    }

    _isIntentionalClose = false;

    const wsUrl = `${WS_BASE_URL}/ws/realtime?channel=presence_updates&token=${token}`;
    _connect(wsUrl);
}

function _connect(wsUrl) {
    try {
        realtimeWs = new WebSocket(wsUrl);

        realtimeWs.onopen = () => {
            console.debug(`[Realtime WS] Connected (attempt ${_reconnectAttempts + 1}).`);
            _reconnectAttempts = 0; // Reset backoff on successful connect

            // Flush queued messages
            while (_messageQueue.length > 0) {
                const queued = _messageQueue.shift();
                try {
                    realtimeWs.send(JSON.stringify(queued));
                } catch (_) {}
            }

            // Start heartbeat
            _startHeartbeat();
        };

        realtimeWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle pong from server
                if (data.type === 'pong') {
                    console.debug('[Realtime WS] Pong received.');
                    return;
                }

                // Distribute to type-based subscribers
                const eventType = data.type || 'message';
                if (subscribers[eventType]) {
                    subscribers[eventType].forEach(cb => {
                        try { cb(data); } catch (_) {}
                    });
                }

                // Always deliver to wildcard subscribers
                if (subscribers['*']) {
                    subscribers['*'].forEach(cb => {
                        try { cb(data); } catch (_) {}
                    });
                }
            } catch (e) {
                console.debug('[Realtime WS] Message parse failed:', e);
            }
        };

        realtimeWs.onclose = (event) => {
            _stopHeartbeat();

            if (_isIntentionalClose) {
                console.debug('[Realtime WS] Connection closed intentionally.');
                return;
            }

            _reconnectAttempts++;
            const delay = _getBackoffMs(_reconnectAttempts - 1);
            console.debug(
                `[Realtime WS] Disconnected (code=${event.code}). ` +
                `Reconnecting in ${delay / 1000}s (attempt ${_reconnectAttempts})...`
            );

            realtimeWs = null;
            _reconnectTimer = setTimeout(() => {
                if (!_isIntentionalClose) initRealtimeWebSockets();
            }, delay);
        };

        realtimeWs.onerror = (err) => {
            console.debug('[Realtime WS] Socket error:', err?.message || err);
            // onclose fires after onerror — reconnection handled there
        };

    } catch (err) {
        console.debug('[Realtime WS] Setup failed:', err);
        _reconnectAttempts++;
        const delay = _getBackoffMs(_reconnectAttempts - 1);
        _reconnectTimer = setTimeout(() => initRealtimeWebSockets(), delay);
    }
}

function _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = setInterval(() => {
        if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
            try {
                realtimeWs.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            } catch (err) {
                console.debug('[Realtime WS] Heartbeat send failed:', err);
            }
        }
    }, 25000); // Ping every 25 seconds
}

function _stopHeartbeat() {
    if (_heartbeatTimer) {
        clearInterval(_heartbeatTimer);
        _heartbeatTimer = null;
    }
}

/**
 * Subscribe to a specific event type from the realtime connection.
 *
 * @param {string}   eventType  e.g. 'presence_update', 'chat_message', 'typing', '*' for all
 * @param {Function} callback   Called with the parsed message object
 * @returns {Function} Unsubscribe function (call to remove the listener)
 */
export function subscribeToRealtimeUpdates(eventType, callback) {
    if (!subscribers[eventType]) {
        subscribers[eventType] = [];
    }
    subscribers[eventType].push(callback);

    // Return unsubscribe function
    return () => unsubscribeFromRealtimeUpdates(eventType, callback);
}

/**
 * Unsubscribe a specific callback from an event type.
 */
export function unsubscribeFromRealtimeUpdates(eventType, callback) {
    if (subscribers[eventType]) {
        subscribers[eventType] = subscribers[eventType].filter(cb => cb !== callback);
    }
}

/**
 * Send a message over the realtime WebSocket.
 * If the socket is not open, the message is queued and replayed on reconnect.
 *
 * @param {Object} message  JSON-serializable message object
 */
export function sendRealtimeMessage(message) {
    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
        try {
            realtimeWs.send(JSON.stringify(message));
        } catch (err) {
            console.debug('[Realtime WS] Send failed, queuing message:', err);
            _queueMessage(message);
        }
    } else {
        _queueMessage(message);
    }
}

function _queueMessage(message) {
    if (_messageQueue.length < MAX_QUEUE_SIZE) {
        _messageQueue.push(message);
    }
    // Auto-reconnect if disconnected
    if (!realtimeWs || realtimeWs.readyState === WebSocket.CLOSED) {
        initRealtimeWebSockets();
    }
}

/**
 * Gracefully close the realtime WebSocket (e.g., on logout).
 * Prevents automatic reconnection.
 */
export function closeRealtimeWebSocket() {
    _isIntentionalClose = true;
    _stopHeartbeat();

    if (_reconnectTimer) {
        clearTimeout(_reconnectTimer);
        _reconnectTimer = null;
    }

    if (realtimeWs) {
        try { realtimeWs.close(1000, 'User logged out'); } catch (_) {}
        realtimeWs = null;
    }

    _reconnectAttempts = 0;
    _messageQueue.length = 0;
}

/**
 * Get the current WebSocket connection status.
 * @returns {'connected'|'connecting'|'disconnected'}
 */
export function getRealtimeStatus() {
    if (!realtimeWs) return 'disconnected';
    switch (realtimeWs.readyState) {
        case WebSocket.OPEN:       return 'connected';
        case WebSocket.CONNECTING: return 'connecting';
        default:                   return 'disconnected';
    }
}
