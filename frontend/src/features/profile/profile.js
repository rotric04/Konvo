/**
 * KONVO™ PROFILE FEATURE
 * src/features/profile/profile.js
 *
 * Manages user profile details, trust/safety index metrics, astrological readings, and log transactions.
 */

import { apiFetch } from '/src/services/api.js';

export function initProfilePage() {
    const profName = document.getElementById('prof-display-name');
    const profKonvoId = document.getElementById('prof-konvo-id');
    const profBio = document.getElementById('prof-bio');
    const profInterests = document.getElementById('prof-interests');
    
    if (!profName) return;

    // Load Profile and Trust stats
    async function loadIdentityData() {
        try {
            const user = await apiFetch('/api/users/me');
            if (!user) return;

            // Cache globally
            window.currentUser = user;
            
            if (profName) profName.textContent = user.profile ? user.profile.display_name : 'No display name';
            if (profKonvoId) profKonvoId.textContent = user.konvo_id;
            if (profBio) profBio.textContent = user.profile && user.profile.bio ? user.profile.bio : 'No profile biography provided.';
            
            // Interests
            if (profInterests && user.profile && user.profile.interests) {
                profInterests.innerHTML = user.profile.interests.map(i => `<span class="tag" style="background-color: var(--border-color); color: var(--text-primary); font-family: var(--font-mono); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">${i.toUpperCase()}</span>`).join(' ');
            }

            // Personality Engine Summary
            const assessmentCard = document.getElementById('assessment-status-card');
            const mbtiCard = document.getElementById('mbti-details-card');
            
            if (user.profile && user.profile.mbti_summary) {
                if (assessmentCard) assessmentCard.classList.add('hidden');
                if (mbtiCard) {
                    mbtiCard.classList.remove('hidden');
                    const title = document.getElementById('mbti-type-title');
                    const conf = document.getElementById('mbti-confidence-val');
                    const desc = document.getElementById('mbti-summary-desc');
                    const comm = document.getElementById('mbti-comm-desc');
                    const rel = document.getElementById('mbti-rel-desc');
                    
                    if (title) title.textContent = user.profile.mbti_type;
                    if (conf) conf.textContent = `${user.profile.mbti_confidence}%`;
                    if (desc) desc.textContent = user.profile.mbti_summary;
                    if (comm) comm.textContent = user.profile.mbti_communication_style;
                    if (rel) rel.textContent = user.profile.mbti_relationship_style;
                    
                    const growthList = document.getElementById('mbti-growth-list');
                    if (growthList) {
                        growthList.innerHTML = '';
                        (user.profile.mbti_growth_areas || []).forEach(g => {
                            const li = document.createElement('li');
                            li.textContent = g;
                            growthList.appendChild(li);
                        });
                    }
                }
            } else {
                if (assessmentCard) assessmentCard.classList.remove('hidden');
                if (mbtiCard) mbtiCard.classList.add('hidden');
            }

            // DNA Values
            if (user.profile) {
                const dnaFields = ['behavior', 'personality', 'communication', 'relationship', 'emotional', 'lifestyle', 'interest', 'trust', 'values'];
                dnaFields.forEach(field => {
                    const score = user.profile[`dna_${field}`];
                    const valEl = document.getElementById(`dna-val-${field}`);
                    const fillEl = document.getElementById(`dna-fill-${field}`);
                    if (valEl && score !== undefined) valEl.textContent = `${Math.round(score)}%`;
                    if (fillEl && score !== undefined) fillEl.style.width = `${score}%`;
                });
            }

            // Trust Dashboard stats
            const trust = await apiFetch('/api/users/me/trust');
            if (trust) {
                const badge = document.getElementById('trust-otp-badge');
                if (badge) {
                    if (trust.otp_verified) {
                        badge.textContent = "VERIFIED IDENTITY";
                        badge.style.color = "var(--accent-teal)";
                    } else {
                        badge.textContent = "UNVERIFIED PROFILE";
                        badge.style.color = "var(--accent-rose)";
                    }
                }
                
                const scoreEl = document.getElementById('trust-score-val');
                const behaviorEl = document.getElementById('trust-behavior-val');
                const completionEl = document.getElementById('trust-completion-val');
                const completionBar = document.getElementById('trust-completion-bar');
                if (scoreEl) scoreEl.textContent = `${Math.round(trust.trust_score)}%`;
                if (behaviorEl) behaviorEl.textContent = `${Math.round(trust.behavior_score)}%`;
                if (completionEl) completionEl.textContent = `${Math.round(trust.profile_completion)}%`;
                if (completionBar) completionBar.style.width = `${trust.profile_completion}%`;

                const historyList = document.getElementById('trust-safety-history');
                if (historyList && trust.safety_history) {
                    historyList.innerHTML = '';
                    trust.safety_history.forEach(hist => {
                        const li = document.createElement('li');
                        li.textContent = hist;
                        historyList.appendChild(li);
                    });
                }
            }
            
            // Astrology insights
            const astroPanel = document.getElementById('astrology-module-panel');
            if (astroPanel) {
                try {
                    const astro = await apiFetch('/api/users/me/astrology');
                    astroPanel.innerHTML = `
                        <div style="font-size: 0.75rem; color: var(--accent-amber); font-family: var(--font-mono); margin-bottom: 0.5rem;">${astro.disclaimer}</div>
                        <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">SUN</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif); color: var(--text-primary);">${astro.sun_sign}</div></div>
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">MOON</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif); color: var(--text-primary);">${astro.moon_sign}</div></div>
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">ASCENDANT</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif); color: var(--text-primary);">${astro.ascendant}</div></div>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
                            <div><strong>Celestial Insights:</strong> ${astro.personality_insights}</div>
                            <div><strong>Zodiac Style:</strong> ${astro.communication_tendencies}</div>
                            <div><strong>Astro Ledger:</strong> ${astro.life_pattern_report}</div>
                        </div>
                    `;
                } catch (err) {
                    astroPanel.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Provide birth date, time and place in settings to compute birth charts.</div>`;
                }
            }

            // Ledger entries
            const ledgerList = document.getElementById('behavioral-ledger-entries');
            if (ledgerList) {
                ledgerList.innerHTML = '<div style="color: var(--text-muted); font-family: var(--font-mono)">Querying log ledger...</div>';
                const ledger = await apiFetch('/api/users/fingerprint/ledger').catch(() => []);
                ledgerList.innerHTML = '';
                if (ledger.length === 0) {
                    ledgerList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No audit transactions recorded yet. Complete discussions to sync log.</div>';
                } else {
                    ledger.forEach(item => {
                        const div = document.createElement('div');
                        div.style.marginBottom = '1rem';
                        div.style.borderBottom = '1px solid var(--border-color)';
                        div.style.paddingBottom = '0.5rem';
                        const sign = item.delta > 0 ? `+${item.delta}` : `${item.delta}`;
                        const color = item.delta > 0 ? 'var(--accent-teal)' : 'var(--accent-rose)';
                        div.innerHTML = `
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--font-mono); margin-bottom: 0.2rem;">
                                <span style="color: var(--text-primary);">${item.metric_changed}</span>
                                <span style="color: ${color}; font-weight: bold;">${sign}</span>
                                <span style="color: var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${item.reason}</div>
                        `;
                        ledgerList.appendChild(div);
                    });
                }
            }

        } catch (e) {
            console.error("Failed loading identity data in profile:", e);
        }
    }

    // Direct Start Quiz to the onboarding flow
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    if (btnStartQuiz) {
        btnStartQuiz.replaceWith(btnStartQuiz.cloneNode(true));
        const newBtnStartQuiz = document.getElementById('btn-start-quiz');
        newBtnStartQuiz.addEventListener('click', () => {
            window.location.href = '/onboarding';
        });
    }

    loadIdentityData();
}

// Expose globally
window.initProfilePage = initProfilePage;
