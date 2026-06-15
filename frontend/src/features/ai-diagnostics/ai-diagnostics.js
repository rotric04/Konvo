import { apiFetch } from '/src/services/api.js';
import { registerPageInit } from '/src/router/router.js';

async function initAIDiagnosticsPage() {
    console.log("[AI Diagnostics] Initializing AI Diagnostics Page...");

    const updateStatus = (id, status, health, usage) => {
        const statusEl = document.getElementById(`${id}-status`);
        const healthEl = document.getElementById(`${id}-health`);
        const usageEl = document.getElementById(`${id}-usage`);

        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `status-indicator ${status.toLowerCase()}`;
        }
        if (healthEl) {
            healthEl.textContent = health;
            healthEl.className = `status-indicator ${health.toLowerCase()}`;
        }
        if (usageEl) {
            usageEl.textContent = usage;
            usageEl.className = `status-indicator ${usage.toLowerCase()}`;
        }
    };

    try {
        const diagnostics = await apiFetch('/api/ai-diagnostics');

        if (diagnostics) {
            updateStatus('gemini', diagnostics.gemini.status, diagnostics.gemini.api_health, diagnostics.gemini.usage_visibility);
            updateStatus('replicate', diagnostics.replicate.status, diagnostics.replicate.api_health, diagnostics.replicate.usage_visibility);
            updateStatus('fal', diagnostics.fal.status, diagnostics.fal.api_health, diagnostics.fal.usage_visibility);
        }
    } catch (error) {
        console.error("[AI Diagnostics] Failed to fetch AI diagnostics:", error);
        updateStatus('gemini', 'Error', 'Error', 'Error');
        updateStatus('replicate', 'Error', 'Error', 'Error');
        updateStatus('fal', 'Error', 'Error', 'Error');
    }
}

registerPageInit('ai-diagnostics', initAIDiagnosticsPage);
