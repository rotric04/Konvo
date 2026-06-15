/**
 * KONVO™ WEBSOCKET SERVICE
 * src/services/websocket.js
 *
 * Establishes real-time connection to track global sentiment indexes.
 */

import { WS_BASE_URL } from '/src/constants/config.js';

let liveSentimentWs = null;

export function initLiveWebSockets() {
    if (liveSentimentWs) return;

    const wsUrl = `${WS_BASE_URL}/api/sentiment/ws/live-sentiment`;
    try {
        liveSentimentWs = new WebSocket(wsUrl);
        
        liveSentimentWs.onmessage = (event) => {
            try {
                const stats = JSON.parse(event.data);
                updateSentimentWidget(stats);
            } catch (e) {
                console.error('[WS] Sentiment json parse failed:', e);
            }
        };

        liveSentimentWs.onclose = () => {
            liveSentimentWs = null;
            // Retry connection after 5 seconds
            setTimeout(initLiveWebSockets, 5000);
        };

        liveSentimentWs.onerror = (err) => {
            console.error('[WS] Sentiment socket encountered error:', err);
        };
    } catch (err) {
        console.error('[WS] Setup failed:', err);
        setTimeout(initLiveWebSockets, 5000);
    }
}

export function updateSentimentWidget(stats) {
    const bar = document.getElementById('sentiment-bar');
    if (bar) {
        const positivePct = (stats.positive || 0) * 100;
        const neutralPct = (stats.neutral || 0) * 100;
        const negativePct = (stats.negative || 0) * 100;
        
        bar.innerHTML = `
            <div class="sentiment-seg positive" style="width: ${positivePct}%"></div>
            <div class="sentiment-seg neutral" style="width: ${neutralPct}%"></div>
            <div class="sentiment-seg negative" style="width: ${negativePct}%"></div>
        `;
    }
    
    const countEl = document.getElementById('online-users-count');
    if (countEl) countEl.textContent = stats.online_count !== undefined ? stats.online_count : '0';
    
    const posVal = document.getElementById('sent-val-pos');
    const neuVal = document.getElementById('sent-val-neu');
    const negVal = document.getElementById('sent-val-neg');
    
    if (posVal) posVal.textContent = `${Math.round((stats.positive || 0) * 100)}%`;
    if (neuVal) neuVal.textContent = `${Math.round((stats.neutral || 0) * 100)}%`;
    if (negVal) negVal.textContent = `${Math.round((stats.negative || 0) * 100)}%`;
}

// Expose globally for backward compatibility
window.initLiveWebSockets = initLiveWebSockets;
window.updateSentimentWidget = updateSentimentWidget;
