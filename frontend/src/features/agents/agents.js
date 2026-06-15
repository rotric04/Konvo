/**
 * KONVO™ AGENTS FEATURE
 * src/features/agents/agents.js
 *
 * Coordinates AI Twin calibration reports, simulated date histories, and dialogue playbacks.
 */

import { apiFetch } from '/src/services/api.js';

export function initAgentsPage() {
    const twinCard = document.getElementById('twin-profile-card');
    const simHistoryList = document.getElementById('sim-history-list');
    const simDetailBox = document.getElementById('sim-detail-box');
    
    let activeTwin = null;
    let selectedSimId = null;

    if (simDetailBox) {
        simDetailBox.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:3rem;text-align:center;color:var(--text-muted);">
                <div style="font-size:2.5rem;margin-bottom:1rem;">🤖</div>
                <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--accent-amber);margin-bottom:0.5rem;">NO SIMULATION SELECTED</div>
                <div style="font-size:0.85rem;line-height:1.6;">Swipe through profiles in the Resonance Grid, generate a simulated date, then select it here to review and approve.</div>
            </div>
        `;
    }

    async function loadTwinAndSimulations() {
        try {
            // Load Twin profile details
            let twinResp;
            try {
                twinResp = await apiFetch('/api/agents/twin');
            } catch (twinErr) {
                if (twinCard) {
                    twinCard.innerHTML = `
                        <div style="text-align:center;padding:2rem;">
                            <div style="font-size:2.5rem;margin-bottom:1rem;">🧬</div>
                            <h3 style="font-family:var(--font-serif);color:var(--text-primary);margin-bottom:0.75rem;">AI Twin Not Initialized</h3>
                            <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.6;">Complete the Personality Assessment to compile your AI Twin digital representative.</p>
                            <a href="/profile" class="btn btn-primary" style="text-decoration:none;" onclick="event.preventDefault(); window.navigateTo('/profile');">Go to Twin DNA →</a>
                        </div>
                    `;
                }
                if (simHistoryList) {
                    simHistoryList.innerHTML = `<div style="color:var(--text-muted);font-style:italic;padding:1rem;">No simulations active.</div>`;
                }
                return;
            }

            if (twinResp) {
                activeTwin = twinResp;
                renderTwinCard(twinResp);
                await loadSimulationsHistory();
            }
        } catch (e) {
            console.error("Failed loading twin and simulations:", e);
        }
    }

    function renderTwinCard(twin) {
        if (!twinCard) return;
        twinCard.innerHTML = `
            <div class="card" style="padding:1.5rem;">
                <div style="display:flex; gap:1.25rem; align-items:center;">
                    <div style="width:64px; height:64px; border-radius:50%; border:2px solid var(--accent-teal); display:flex; align-items:center; justify-content:center; background-color:var(--bg-primary); overflow:hidden;">
                        ${twin.avatar || `<svg viewBox="0 0 100 100" style="width:40px; height:40px; fill:var(--accent-teal);"><circle cx="50" cy="40" r="22"/><path d="M15 85 C20 65, 80 65, 85 85"/></svg>`}
                    </div>
                    <div>
                        <h3 style="font-family:var(--font-serif); font-size:1.35rem; color:var(--text-primary); margin:0;">${twin.name}</h3>
                        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-amber);">${twin.role_type} Archetype</span>
                    </div>
                </div>
                <p style="font-size:0.9rem; line-height:1.5; color:var(--text-secondary); margin-top:1rem; margin-bottom:0; font-style:italic;">
                    "${twin.description || 'Personality matrix successfully compiled and deployed to network node.'}"
                </p>
            </div>
        `;
    }

    async function loadSimulationsHistory() {
        if (!simHistoryList) return;
        try {
            const sims = await apiFetch('/api/agents/simulations');
            simHistoryList.innerHTML = '';
            
            if (!sims || sims.length === 0) {
                simHistoryList.innerHTML = `<div style="color:var(--text-muted);font-style:italic;font-size:0.8rem;padding:1rem;">No simulations found. Swipe on matches to trigger agent interactions.</div>`;
                return;
            }

            sims.forEach(sim => {
                const item = document.createElement('div');
                item.style.padding = '0.75rem 1rem';
                item.style.border = '1px solid var(--border-color)';
                item.style.borderRadius = '8px';
                item.style.cursor = 'pointer';
                item.style.transition = 'all 0.2s';
                item.style.marginBottom = '0.5rem';
                item.style.backgroundColor = selectedSimId === sim.id ? 'rgba(13, 148, 136, 0.08)' : 'rgba(255,255,255,0.01)';
                if (selectedSimId === sim.id) {
                    item.style.borderColor = 'var(--accent-teal)';
                }

                const currentUser = window.currentUser;
                const isUserA = sim.user_a_id === currentUser?.id;
                const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
                const partnerApp = isUserA ? sim.approval_user_b : sim.approval_user_a;

                let appLabel = '';
                if (myApp === 'approved' && partnerApp === 'approved') {
                    appLabel = `<span style="font-family:var(--font-mono); font-size:0.6rem; color:var(--accent-teal); border:1px solid rgba(13,148,136,0.3); padding:0.1rem 0.25rem; border-radius:3px; background:rgba(13,148,136,0.02);">✨ Unlocked</span>`;
                } else {
                    appLabel = `<span style="font-family:var(--font-mono); font-size:0.6rem; color:var(--accent-amber); border:1px solid rgba(217,119,6,0.3); padding:0.1rem 0.25rem; border-radius:3px; background:rgba(217,119,6,0.02);">⚖ Reviewing</span>`;
                }

                item.innerHTML = `
                    <div style="font-weight:600; font-size:0.82rem; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <span>vs ${sim.partner_name}</span>
                        ${appLabel}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                        <span>Score: ${sim.compatibility_score}%</span>
                        <span>Env: ${sim.environment}</span>
                    </div>
                `;

                item.addEventListener('click', () => {
                    selectedSimId = sim.id;
                    document.querySelectorAll('#sim-history-list > div').forEach(el => {
                        el.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                        el.style.borderColor = 'var(--border-color)';
                    });
                    item.style.backgroundColor = 'rgba(13, 148, 136, 0.08)';
                    item.style.borderColor = 'var(--accent-teal)';
                    renderSimulationDetails(sim);
                });

                simHistoryList.appendChild(item);
            });
        } catch (e) {
            simHistoryList.innerHTML = `<div style="color:var(--accent-rose);font-size:0.8rem;">Load error: ${e.message}</div>`;
        }
    }

    function renderSimulationDetails(sim) {
        if (!simDetailBox) return;

        const currentUser = window.currentUser;
        const isUserA = sim.user_a_id === currentUser?.id;
        const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
        const partnerApp = isUserA ? sim.approval_user_b : sim.approval_user_a;

        const isUnlocked = myApp === 'approved' && partnerApp === 'approved';
        const isExpired = sim.is_expired;

        let approvalText = '';
        if (isUnlocked) {
            approvalText = `<span style="color:var(--accent-teal); font-weight:600;">Mutual approval completed. Direct chat routing unlocked!</span>`;
        } else if (myApp === 'approved') {
            approvalText = `<span style="color:var(--text-secondary);">Your twin approved. Awaiting partner approval.</span>`;
        } else if (myApp === 'declined') {
            approvalText = `<span style="color:var(--accent-rose);">You declined compatibility routing.</span>`;
        } else {
            approvalText = `<span style="color:var(--accent-amber);">Review dialogue history below to grant human approval.</span>`;
        }

        simDetailBox.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; gap:1.25rem;">
                <div class="card" style="padding:1.25rem; margin-bottom:0;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                        <div>
                            <h3 style="font-family:var(--font-serif); font-size:1.3rem; margin:0; color:var(--text-primary);">Twin Simulation: ${sim.partner_name}</h3>
                            <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Environment: ${sim.environment} • Score: ${sim.compatibility_score}%</div>
                        </div>
                    </div>
                    
                    <p style="font-size:0.88rem; line-height:1.5; color:var(--text-secondary); margin-bottom:1rem;">
                        ${sim.summary || 'Summary profile report.'}
                    </p>
                    
                    <div style="border-top:1px solid var(--border-color); padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.8rem;">${approvalText}</span>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-primary" id="btn-animate-date-stage" style="padding:0.4rem 0.8rem; font-size:0.75rem; color:var(--bg-primary);">⚡ Run Dialogue Playback</button>
                            ${myApp === 'pending' && !isExpired ? `
                                <button class="btn btn-secondary" id="btn-approve-match" style="padding:0.4rem 0.8rem; font-size:0.75rem; border-color:var(--accent-teal); color:var(--accent-teal);">Approve</button>
                                <button class="btn btn-secondary" id="btn-decline-match" style="padding:0.4rem 0.8rem; font-size:0.75rem; border-color:var(--accent-rose); color:var(--accent-rose);">Decline</button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Simulation dialogue log review -->
                <div class="card" style="flex:1; display:flex; flex-direction:column; min-height:200px; padding:1.25rem;">
                    <h4 style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary); margin-top:0; margin-bottom:0.75rem;">Cryptographic Dialogues Log</h4>
                    <div style="flex:1; overflow-y:auto; font-family:var(--font-mono); font-size:0.8rem; line-height:1.5; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.5rem;" id="sim-dialog-log-review-box">
                        ${sim.dialogue_log && sim.dialogue_log.length ? sim.dialogue_log.map(log => `
                            <div>
                                <span style="color:${log.speaker === activeTwin.name ? 'var(--accent-teal)' : 'var(--accent-indigo)'}; font-weight:600;">${log.speaker}:</span>
                                <span>${log.message}</span>
                            </div>
                        `).join('') : '<div style="color:var(--text-muted); font-style:italic;">No dialogue logs recorded.</div>'}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-approve-match')?.addEventListener('click', () => handleApproval('approved'));
        document.getElementById('btn-decline-match')?.addEventListener('click', () => handleApproval('declined'));
        
        document.getElementById('btn-animate-date-stage')?.addEventListener('click', () => {
            openDateAnimationStageModal(sim);
        });
    }

    async function handleApproval(action) {
        try {
            const res = await apiFetch(`/api/agents/simulations/${selectedSimId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ approval_action: action })
            });
            if (res) {
                alert(`You have ${action} this simulated match.`);
                loadTwinAndSimulations();
                renderSimulationDetails(res);
            }
        } catch (e) {
            alert(`Approval failed: ${e.message}`);
        }
    }

    function openDateAnimationStageModal(sim) {
        const modal = document.getElementById('date-stage-modal');
        const stageLogs = document.getElementById('date-stage-logs-scroller');
        const approvalsTray = document.getElementById('date-stage-approvals-tray');
        
        if (!modal) return;
        
        const titleEl = document.getElementById('modal-stage-title');
        const subtitleEl = document.getElementById('modal-stage-subtitle');
        if (titleEl) titleEl.textContent = `${activeTwin.name} & ${sim.partner_name}`;
        if (subtitleEl) subtitleEl.textContent = `Environment: ${sim.environment}`;
        
        if (typeof window.konvoOpenModal === 'function') {
            window.konvoOpenModal('date-stage-modal');
        }

        // Play entrance animation
        if (window.anime) {
            window.anime({
                targets: '#date-stage-modal .modal-content',
                scale: [0.8, 1],
                opacity: [0, 1],
                duration: 450,
                easing: 'easeOutBack'
            });
        }
        
        if (stageLogs) stageLogs.innerHTML = '';
        
        const bubbleA = document.getElementById('speech-bubble-a');
        const bubbleB = document.getElementById('speech-bubble-b');
        if (bubbleA) {
            bubbleA.style.opacity = '0';
            bubbleA.style.transform = 'scale(0.8)';
        }
        if (bubbleB) {
            bubbleB.style.opacity = '0';
            bubbleB.style.transform = 'scale(0.8)';
        }
        
        const currentUser = window.currentUser;
        const isUserA = sim.user_a_id === currentUser?.id;
        const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
        
        if (approvalsTray) {
            approvalsTray.innerHTML = '';
            if (myApp === 'pending') {
                approvalsTray.innerHTML = `
                    <button class="btn btn-primary" id="btn-stage-approve" style="color:var(--bg-primary);">Approve Compatibility</button>
                    <button class="btn btn-secondary" id="btn-stage-decline" style="color:var(--accent-rose); border-color:var(--accent-rose);">Decline</button>
                `;
                document.getElementById('btn-stage-approve')?.addEventListener('click', () => {
                    if (typeof window.konvoCloseModal === 'function') window.konvoCloseModal('date-stage-modal');
                    handleApproval('approved');
                });
                document.getElementById('btn-stage-decline')?.addEventListener('click', () => {
                    if (typeof window.konvoCloseModal === 'function') window.konvoCloseModal('date-stage-modal');
                    handleApproval('declined');
                });
            } else {
                approvalsTray.innerHTML = `<span style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-muted);">Status: ${myApp.toUpperCase()}</span>`;
            }
        }

        let logIndex = 0;
        const logEntries = sim.dialogue_log || [];
        
        function runDialogAnimation() {
            const isModalActive = modal.classList.contains('active') || modal.style.display === 'flex' || modal.style.display === 'block';
            if (!isModalActive || logIndex >= logEntries.length) {
                if (bubbleA && window.anime) {
                    window.anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB && window.anime) {
                    window.anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                return;
            }
            
            const entry = logEntries[logIndex];
            const div = document.createElement('div');
            
            if (entry.speaker === 'System Core') {
                div.style.color = 'var(--text-muted)';
                div.style.fontFamily = 'var(--font-mono)';
                div.style.fontSize = '0.75rem';
                if (bubbleA && window.anime) {
                    window.anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB && window.anime) {
                    window.anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
            } else if (entry.speaker === activeTwin.name) {
                div.style.color = 'var(--accent-teal)';
                div.style.fontWeight = 'bold';
                
                if (bubbleB && window.anime) {
                    window.anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleA) {
                    bubbleA.textContent = entry.message;
                    if (window.anime) {
                        window.anime({
                            targets: '#speech-bubble-a',
                            opacity: 1,
                            scale: [0.8, 1],
                            translateY: [10, 0],
                            duration: 500,
                            easing: 'easeOutBack'
                        });
                        
                        window.anime({
                            targets: '#stage-avatar-a',
                            translateY: [0, -15, 0],
                            duration: 600,
                            easing: 'easeOutElastic(1, .5)'
                        });
                    } else {
                        bubbleA.style.opacity = '1';
                        bubbleA.style.transform = 'scale(1)';
                    }
                }
            } else {
                div.style.color = 'var(--accent-indigo)';
                div.style.fontWeight = 'bold';
                
                if (bubbleA && window.anime) {
                    window.anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB) {
                    bubbleB.textContent = entry.message;
                    if (window.anime) {
                        window.anime({
                            targets: '#speech-bubble-b',
                            opacity: 1,
                            scale: [0.8, 1],
                            translateY: [10, 0],
                            duration: 500,
                            easing: 'easeOutBack'
                        });
                        
                        window.anime({
                            targets: '#stage-avatar-b',
                            translateY: [0, -15, 0],
                            duration: 600,
                            easing: 'easeOutElastic(1, .5)'
                        });
                    } else {
                        bubbleB.style.opacity = '1';
                        bubbleB.style.transform = 'scale(1)';
                    }
                }
            }
            
            div.textContent = `${entry.speaker}: ${entry.message}`;
            div.style.marginBottom = '0.4rem';
            div.style.fontSize = '0.85rem';
            if (stageLogs) {
                stageLogs.appendChild(div);
                stageLogs.scrollTop = stageLogs.scrollHeight;
            }
            
            logIndex++;
            setTimeout(runDialogAnimation, 3000);
        }

        setTimeout(runDialogAnimation, 1000);
    }

    loadTwinAndSimulations();
}

// Expose globally
window.initAgentsPage = initAgentsPage;
export { initAgentsPage as initAgentsPageModule };
