/**
 * KONVO™ REALTIME SERVICE
 * src/services/realtime.js
 *
 * Establishes real-time connection to the gateway for presence and other updates.
 */

import { WS_BASE_URL } from '/src/constants/config.js';

let realtimeWs = null;
const subscribers = {}; // { 'channel': [callback1, callback2] }

export function initRealtimeWebSockets() {
    if (realtimeWs) return;

    const token = localStorage.getItem('konvo_token');
    if (!token) {
        console.warn("[Realtime WS] No token found, cannot establish connection.");
        return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/realtime?channel=presence_updates&token=${token}`; // Pass token for authentication if needed
    try {
        realtimeWs = new WebSocket(wsUrl);
        
        realtimeWs.onopen = () => {
            console.log("[Realtime WS] Connected to gateway.");
            // Optionally send an initial message to subscribe or identify
            // realtimeWs.send(JSON.stringify({ type: "subscribe", channel: "presence_updates" }));
        };

        realtimeWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Distribute message to relevant subscribers
                if (data.channel && subscribers[data.channel]) {
                    subscribers[data.channel].forEach(callback => callback(data.payload));
                } else if (data.type === "presence_update") {
                    // Handle global presence updates
                    console.log("[Realtime WS] Presence Update:", data);
                    // Example: update UI for user with data.user_id and data.status
                }
            } catch (e) {
                console.error('[Realtime WS] JSON parse failed:', e);
            }
        };

        realtimeWs.onclose = () => {
            console.log("[Realtime WS] Disconnected from gateway. Retrying in 5s...");
            realtimeWs = null;
            setTimeout(initRealtimeWebSockets, 5000);
        };

        realtimeWs.onerror = (err) => {
            console.error('[Realtime WS] Socket encountered error:', err);
            realtimeWs.close(); // Attempt to close and trigger reconnect
        };
    } catch (err) {
        console.error('[Realtime WS] Setup failed:', err);
        setTimeout(initRealtimeWebSockets, 5000);
    }
}

export function subscribeToRealtimeUpdates(channel, callback) {
    if (!subscribers[channel]) {
        subscribers[channel] = [];
    }
    subscribers[channel].push(callback);
}

export function unsubscribeFromRealtimeUpdates(channel, callback) {
    if (subscribers[channel]) {
        subscribers[channel] = subscribers[channel].filter(cb => cb !== callback);
    }
}

export function sendRealtimeMessage(message) {
    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
        realtimeWs.send(JSON.stringify(message));
    } else {
        console.warn("[Realtime WS] WebSocket not open, message not sent:", message);
    }
}
