/**
 * KONVO™ 3D VIRTUAL DATES FEATURE
 * src/features/virtual-dates/virtual-dates.js
 */

import { apiFetch } from '/src/services/api.js';
import { getState } from '/src/store/state.js';

function openVirtualDate(startLocationId = 'rooftop', userData = {}) {
    const existing = document.getElementById('vd-fullscreen');
    if (existing) existing.remove();

    let currentLocIdx = VirtualDateLocations.findIndex(l => l.id === startLocationId);
    if (currentLocIdx < 0) currentLocIdx = 0;
    let dateScore = 45;
    let isThinking = false;
    let animationFrameId = null;
    let particles = [];
    let currentResizeHandler = null;
    let mouseMoveHandler = null;

    // Web Audio & 3D Interactive State flags
    let audioCtx = null;
    let cheersActive = false;
    let npcSpeaking = false;
    let interactionCooldown = false;
    let speakingSide = 'none'; // 'user' | 'partner' | 'npc' | 'none'

    // Story Engine dynamic calibration logic
    let matchReason = "Values discovery aligned";
    let alignedScenarioId = 'values_discovery';

    if (currentUser && currentUser.profile) {
        const myInterests = (currentUser.profile.interests || []).map(i => i.toLowerCase());
        const matchInterests = (userData.interests || ['travel', 'creativity']).map(i => i.toLowerCase());
        
        const travelOverlap = myInterests.some(i => i.includes('travel')) || matchInterests.includes('travel');
        const bizOverlap = myInterests.some(i => i.includes('entrepreneur') || i.includes('startup') || i.includes('business')) || matchInterests.includes('startup');
        const creativityOverlap = myInterests.some(i => i.includes('create') || i.includes('art') || i.includes('music') || i.includes('book')) || matchInterests.includes('creativity');

        if (travelOverlap) {
            alignedScenarioId = 'travel_planning';
            matchReason = "Both of you share a passion for travel and exploring the world.";
        } else if (bizOverlap) {
            alignedScenarioId = 'entrepreneurship';
            matchReason = "Your combined ambitions show strong potential for entrepreneurship.";
        } else if (creativityOverlap) {
            alignedScenarioId = 'dream_home';
            matchReason = "Collaborative design and creativity are key strengths of your match.";
        } else {
            alignedScenarioId = 'values_discovery';
            matchReason = "Discovering shared values through objective choices.";
        }
    } else {
        const seed = (userData.partnerName || '').length % 3;
        if (seed === 0) {
            alignedScenarioId = 'travel_planning';
            matchReason = "Interests alignment: Both of you enjoy travel & adventure!";
        } else if (seed === 1) {
            alignedScenarioId = 'entrepreneurship';
            matchReason = "Interests alignment: Entrepreneurial energy detected!";
        } else {
            alignedScenarioId = 'weekend_simulation';
            matchReason = "Interests alignment: Spontaneous lifestyle rhythms overlap!";
        }
    }

    let activeScenarioId = null;
    let completedScenarios = {}; // { scenarioId: selectedChoiceIdx }

    const el = document.createElement('div');
    el.id = 'vd-fullscreen';
    el.className = 'virtual-date-fullscreen entering';

    function buildLocationStrip() {
        return VirtualDateLocations.map((loc, i) => {
            const isComing = i >= 10;
            return `<button class="vd-loc-btn ${isComing ? 'coming-soon' : ''} ${i === currentLocIdx ? 'active' : ''}" data-idx="${i}" title="${loc.name}">${loc.emoji} ${loc.name}</button>`;
        }).join('');
    }

    function render() {
        const loc = VirtualDateLocations[currentLocIdx];
        el.innerHTML = `
        <div class="vd-bg ${loc.bg}"></div>
        <canvas class="vd-canvas-particles" id="vd-canvas" style="position: absolute; inset: 0; pointer-events: auto; z-index: 1;"></canvas>
        <button class="vd-close-btn" id="vd-close">✕</button>
        
        <!-- HUD Header -->
        <div class="vd-hud">
            <div class="vd-location-name">${loc.emoji} ${loc.name}</div>
            <div style="display:flex; align-items:center; gap:1rem;">
                <button class="vd-loc-btn" id="btn-toggle-scenario-drawer" style="border-color:var(--accent-amber);color:var(--accent-amber);font-weight:600;">🧠 Scenario Engine</button>
                <div class="vd-score-meter">
                    <span>Date Vibe</span>
                    <div class="vd-score-bar"><div class="vd-score-fill" id="vd-score-fill" style="width:${dateScore}%"></div></div>
                    <span id="vd-score-num">${dateScore}%</span>
                </div>
            </div>
        </div>

        <!-- AI Avatars Dedicated Corner Panel -->
        <div class="vd-avatars-panel">
            <div class="vd-avatar-card">
                <div class="vd-avatar-ring">👤</div>
                <div class="vd-avatar-info">
                    <div class="vd-avatar-role">YOU</div>
                    <div class="vd-avatar-mood" id="vd-avatar-mood-user">Calm</div>
                </div>
            </div>
            <div class="vd-avatar-card">
                <div class="vd-avatar-ring pink">💖</div>
                <div class="vd-avatar-info">
                    <div class="vd-avatar-role">${(userData.partnerName || 'Match').toUpperCase()}</div>
                    <div class="vd-avatar-mood" id="vd-avatar-mood-partner">Calm</div>
                </div>
            </div>
        </div>

        <!-- Character Screen -->
        <div class="vd-scene">
            <div class="vd-characters" style="opacity:0; pointer-events:none;">
                <div class="vd-character" id="vd-char-user">
                    <div class="vd-character-avatar" style="background:rgba(79,70,229,0.3);border-color:rgba(79,70,229,0.5);">${loc.charA}</div>
                    <div class="vd-character-name">${userData.displayName || 'You'}</div>
                </div>
                <div class="vd-character" id="vd-char-partner">
                    <div class="vd-character-avatar" style="background:rgba(236,72,153,0.3);border-color:rgba(236,72,153,0.5);">${loc.charB}</div>
                    <div class="vd-character-name">${userData.partnerName || 'Your Match'}</div>
                </div>
            </div>
            <div class="vd-speech-bubble left" id="vd-bubble-user"></div>
            <div class="vd-speech-bubble right" id="vd-bubble-partner"></div>
            <div class="vd-speech-bubble" id="vd-bubble-npc" style="bottom: 220px; left: 50%; transform: translateX(-50%) scale(0.9); text-align: center; max-width: 320px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; opacity: 0; z-index: 20;"></div>
        </div>

        <!-- Scenario Intel Drawer Panel -->
        <div class="vd-scenario-panel" id="vd-scenario-panel">
            <div class="vd-scenario-panel-header">
                <div class="vd-scenario-panel-title">Scenario Intelligence</div>
                <button id="btn-close-scenario" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.1rem;">✕</button>
            </div>
            <div style="font-size:0.65rem;color:var(--text-secondary);background:rgba(245,158,11,0.06);border:1px dashed rgba(245,158,11,0.25);border-radius:6px;padding:0.4rem 0.6rem;margin-bottom:0.75rem;line-height:1.35;">
                💡 <strong>Story Engine Recommendation:</strong><br>${matchReason}
            </div>
            <div class="vd-scenario-list" id="vd-scenario-list">
                <!-- Dynamically populated scenario items -->
            </div>
            <div class="vd-scenario-active-box" id="vd-scenario-active-box">
                <div style="color:var(--text-muted);font-style:italic;text-align:center;padding:1rem 0;">Select a scenario above to begin compatibility discovery.</div>
            </div>
        </div>

        <!-- Dialogue Input & Neural Prompts Area -->
        <div class="vd-dialogue-area">
            <div class="vd-badge-container" id="vd-badge-container"></div>
            <div class="vd-response-preview" id="vd-response-preview">💬 Say something to start the date...</div>
            <div class="vd-neural-prompts-container" id="vd-neural-prompts"></div>
            <div class="vd-input-row">
                <input type="text" class="vd-input" id="vd-input" placeholder="Type something to ${userData.partnerName || 'your date'}..." maxlength="200">
                <button class="vd-send-btn" id="vd-send">➤</button>
            </div>
        </div>

        <!-- Location strip at the bottom -->
        <div class="vd-location-strip" id="vd-loc-strip">
            ${buildLocationStrip()}
        </div>`;
    }

    render();
    document.body.appendChild(el);
    initVdParticles(VirtualDateLocations[currentLocIdx].id);

    // Initialize list & select story suggested scenario
    populateScenarioList();
    setTimeout(() => {
        selectScenario(alignedScenarioId);
    }, 1500);

    // Initialize GSAP Mouse Parallax (Interactive 3D stereoscopic depth)
    if (typeof gsap !== 'undefined') {
        const bgDiv = el.querySelector('.vd-bg');
        const charsDiv = el.querySelector('.vd-characters');
        
        mouseMoveHandler = (e) => {
            const width = el.clientWidth || window.innerWidth;
            const height = el.clientHeight || window.innerHeight;
            
            const mouseX = (e.clientX / width) * 2 - 1;
            const mouseY = (e.clientY / height) * 2 - 1;
            
            if (bgDiv) {
                gsap.to(bgDiv, {
                    x: mouseX * -20,
                    y: mouseY * -20,
                    duration: 0.8,
                    ease: "power1.out"
                });
            }
            
            if (charsDiv) {
                gsap.to(charsDiv, {
                    x: mouseX * 15,
                    y: mouseY * 10,
                    rotationY: mouseX * 12,
                    rotationX: mouseY * -8,
                    transformPerspective: 1000,
                    transformOrigin: "bottom center",
                    duration: 0.8,
                    ease: "power1.out"
                });
            }
        };
        el.addEventListener('mousemove', mouseMoveHandler);
    }

    function showBubble(side, text, duration = 3500) {
        const bubble = el.querySelector(`#vd-bubble-${side}`);
        if (!bubble) return;
        bubble.textContent = text;
        bubble.classList.add('visible');
        const char = el.querySelector(`#vd-char-${side}`);
        if (char) char.classList.add('speaking');
        
        speakingSide = side;

        setTimeout(() => {
            bubble.classList.remove('visible');
            if (char) char.classList.remove('speaking');
            if (speakingSide === side) {
                speakingSide = 'none';
            }
        }, duration);
    }

    function updateScore(delta) {
        dateScore = Math.max(0, Math.min(100, dateScore + delta));
        const fill = el.querySelector('#vd-score-fill');
        const num = el.querySelector('#vd-score-num');
        if (fill) fill.style.width = dateScore + '%';
        if (num) num.textContent = dateScore + '%';
        updateAvatarMoods();
    }

    function updateMeshMood(avatarMesh, mood) {
        if (avatarMesh && avatarMesh.userData && avatarMesh.userData.head) {
            const mat = avatarMesh.userData.head.material;
            if (mat) {
                if (mood === 'Excited') {
                    mat.emissive.setHex(0xec4899); // Pink
                    mat.emissiveIntensity = 0.8;
                } else if (mood === 'Smiling' || mood === 'Fascinated') {
                    mat.emissive.setHex(0x06b6d4); // Cyan
                    mat.emissiveIntensity = 0.6;
                } else if (mood === 'Calm') {
                    mat.emissive.setHex(0x10b981); // Green
                    mat.emissiveIntensity = 0.4;
                } else if (mood === 'Thoughtful' || mood === 'Pensive') {
                    mat.emissive.setHex(0x8b5cf6); // Purple
                    mat.emissiveIntensity = 0.35;
                } else { // Concerned/Distant
                    mat.emissive.setHex(0x6b7280); // Grey
                    mat.emissiveIntensity = 0.15;
                }
                mat.needsUpdate = true;
            }
        }
    }

    function updateAvatarMoods() {
        const userMoodEl = el.querySelector('#vd-avatar-mood-user');
        const partnerMoodEl = el.querySelector('#vd-avatar-mood-partner');
        if (!userMoodEl || !partnerMoodEl) return;

        let userMood = 'Calm';
        let partnerMood = 'Calm';

        if (dateScore >= 80) {
            userMood = 'Excited';
            partnerMood = 'Excited';
        } else if (dateScore >= 60) {
            userMood = 'Smiling';
            partnerMood = 'Fascinated';
        } else if (dateScore >= 40) {
            userMood = 'Calm';
            partnerMood = 'Calm';
        } else if (dateScore >= 20) {
            userMood = 'Thoughtful';
            partnerMood = 'Pensive';
        } else {
            userMood = 'Concerned';
            partnerMood = 'Distant';
        }

        userMoodEl.textContent = userMood;
        partnerMoodEl.textContent = partnerMood;

        const rings = el.querySelectorAll('.vd-avatar-ring');
        rings.forEach(ring => {
            if (dateScore >= 80) {
                ring.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.6)';
            } else {
                ring.style.boxShadow = '';
            }
        });

        // Update 3D holographic avatar material emissive color based on mood
        updateMeshMood(avatarA, userMood);
        updateMeshMood(avatarB, partnerMood);
    }

    function selectScenario(scenarioId) {
        const scenario = VirtualDateScenarios.find(s => s.id === scenarioId);
        if (!scenario) return;
        activeScenarioId = scenarioId;

        renderActiveScenarioBox(scenario);
        populateScenarioList();

        showBubble('partner', `[${scenario.npc}] ${scenario.intro}`, 4500);
        const preview = el.querySelector('#vd-response-preview');
        if (preview) {
            animateTextTypewriter(preview, `💬 ${scenario.npc}: "${scenario.intro}"`, 18);
        }

        renderNeuralPrompts(scenario);
    }

    function renderActiveScenarioBox(scenario) {
        const box = el.querySelector('#vd-scenario-active-box');
        if (!box) return;

        const completedIdx = completedScenarios[scenario.id];
        const isCompleted = completedIdx !== undefined;

        if (isCompleted) {
            const choice = scenario.choices[completedIdx];
            box.innerHTML = `
                <div class="vd-scenario-npc-tag">${scenario.npc}</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.5rem;line-height:1.35;">
                    <strong>Q:</strong> ${scenario.intro}
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted);border-left:2px solid var(--accent-amber);padding-left:0.5rem;margin-bottom:0.75rem;line-height:1.35;">
                    <strong>Selected:</strong> ${choice.text}
                </div>
                <div class="vd-scenario-insight-box">
                    <div class="vd-scenario-insight-title">Observable Outcome</div>
                    <div style="font-size:0.75rem;color:var(--text-primary);line-height:1.4;margin-bottom:0.5rem;">
                        ${choice.outcome}
                    </div>
                    <div class="vd-scenario-insight-title" style="color:var(--accent-indigo);">Compatibility Insight</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.4;">
                        ${choice.insight}
                    </div>
                </div>
            `;
        } else {
            box.innerHTML = `
                <div class="vd-scenario-npc-tag">${scenario.npc}</div>
                <div style="font-size:0.78rem;color:var(--text-primary);line-height:1.4;margin-bottom:0.75rem;">
                    ${scenario.intro}
                </div>
                <div style="display:flex;flex-direction:column;gap:0.4rem;">
                    ${scenario.choices.map((c, idx) => `
                        <button class="vd-scenario-choice-btn" data-choice-idx="${idx}">${c.text}</button>
                    `).join('')}
                </div>
            `;
        }
    }

    function populateScenarioList() {
        const listContainer = el.querySelector('#vd-scenario-list');
        if (!listContainer) return;

        listContainer.innerHTML = VirtualDateScenarios.map(s => {
            const isDone = completedScenarios[s.id] !== undefined;
            const statusIcon = isDone ? '✅' : '🧠';
            const isActive = s.id === activeScenarioId;
            return `
                <button class="vd-scenario-item-btn ${isActive ? 'active' : ''}" data-id="${s.id}">
                    <span>${statusIcon} ${s.name}</span>
                </button>
            `;
        }).join('');
    }

    function renderNeuralPrompts(scenario) {
        const container = el.querySelector('#vd-neural-prompts');
        if (!container) return;

        if (!scenario || !scenario.neuralPrompts) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="vd-neural-prompt-title">Neural Prompts</div>
            <div style="display:flex; gap:0.4rem; overflow-x:auto; padding-bottom:0.25rem; scrollbar-width:none;">
                ${scenario.neuralPrompts.map(p => `
                    <button class="vd-neural-prompt-pill" data-prompt="${p}" style="white-space:nowrap;">${p}</button>
                `).join('')}
            </div>
        `;
    }

    // Greet player
    setTimeout(() => {
        const greet = DateResponses.greetings[Math.floor(Math.random() * DateResponses.greetings.length)];
        showBubble('partner', greet, 4000);
        const preview = el.querySelector('#vd-response-preview');
        if (preview) animateTextTypewriter(preview, '💬 ' + greet, 22);
    }, 800);

    el.addEventListener('click', (e) => {
        // Close
        if (e.target.id === 'vd-close') {
            el.style.opacity = '0';
            setTimeout(() => {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (currentResizeHandler) window.removeEventListener('resize', currentResizeHandler);
                if (mouseMoveHandler) el.removeEventListener('mousemove', mouseMoveHandler);

                // Safe AudioContext closure
                if (audioCtx) {
                    try {
                        audioCtx.close();
                    } catch (err) {}
                    audioCtx = null;
                }

                // Recursively dispose Three.js scene components to prevent WebGL context leakage
                function cleanScene(obj) {
                    if (obj.geometry) {
                        obj.geometry.dispose();
                    }
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => {
                                if (m.map) m.map.dispose();
                                m.dispose();
                            });
                        } else {
                            if (obj.material.map) obj.material.map.dispose();
                            obj.material.dispose();
                        }
                    }
                    if (obj.children) {
                        obj.children.forEach(child => cleanScene(child));
                    }
                }
                cleanScene(scene);

                // Dispose WebGL renderer
                if (window.vdRenderer) {
                    try {
                        window.vdRenderer.dispose();
                    } catch (err) {}
                    window.vdRenderer = null;
                }

                el.remove();
            }, 500);
            return;
        }

        // Toggle Scenario Drawer
        if (e.target.id === 'btn-toggle-scenario-drawer') {
            const drawer = el.querySelector('#vd-scenario-panel');
            if (drawer) drawer.classList.toggle('active');
            return;
        }

        // Close Scenario Drawer
        if (e.target.id === 'btn-close-scenario') {
            const drawer = el.querySelector('#vd-scenario-panel');
            if (drawer) drawer.classList.remove('active');
            return;
        }

        // Select Scenario Item
        const itemBtn = e.target.closest('.vd-scenario-item-btn');
        if (itemBtn) {
            const id = itemBtn.dataset.id;
            selectScenario(id);
            return;
        }

        // Make Scenario Choice
        const choiceBtn = e.target.closest('.vd-scenario-choice-btn');
        if (choiceBtn && activeScenarioId) {
            const choiceIdx = parseInt(choiceBtn.dataset.choiceIdx);
            if (!isNaN(choiceIdx)) {
                const scenario = VirtualDateScenarios.find(s => s.id === activeScenarioId);
                const choice = scenario.choices[choiceIdx];
                completedScenarios[activeScenarioId] = choiceIdx;
                
                updateScore(choice.delta || 10);
                renderActiveScenarioBox(scenario);
                populateScenarioList();

                showBubble('partner', `That fits perfectly! ${choice.outcome}`, 4500);
                const preview = el.querySelector('#vd-response-preview');
                if (preview) {
                    animateTextTypewriter(preview, `⚡ Outcome: ${choice.outcome} | Insight: ${choice.insight}`, 15);
                }

                // Append notification/chat entry
                KonvoToast.show(`Unlocked Compatibility Insight: ${choice.insight}`, 'success');
            }
            return;
        }

        // Neural Prompt Pill Click
        const promptPill = e.target.closest('.vd-neural-prompt-pill');
        if (promptPill) {
            const text = promptPill.dataset.prompt;
            const input = el.querySelector('#vd-input');
            if (input) {
                animateTextTypewriter(input, text, 8, true);
                input.focus();
            }
            return;
        }

        // Location change
        const locBtn = e.target.closest('.vd-loc-btn:not(.coming-soon)');
        if (locBtn && e.target.id !== 'btn-toggle-scenario-drawer') {
            const idx = parseInt(locBtn.dataset.idx);
            if (!isNaN(idx) && idx !== currentLocIdx) {
                currentLocIdx = idx;
                const newBg = VirtualDateLocations[idx].bg;
                
                const bgDiv = el.querySelector('.vd-bg');
                if (bgDiv) {
                    bgDiv.style.opacity = '0';
                    setTimeout(() => {
                        bgDiv.className = `vd-bg ${newBg}`;
                        bgDiv.style.opacity = '1';
                        
                        const hud = el.querySelector('.vd-location-name');
                        if (hud) hud.textContent = VirtualDateLocations[idx].emoji + ' ' + VirtualDateLocations[idx].name;
                        
                        el.querySelectorAll('.vd-loc-btn').forEach((b, i) => {
                            if (b.id !== 'btn-toggle-scenario-drawer') {
                                b.classList.toggle('active', i === idx);
                            }
                        });
                        initVdParticles(VirtualDateLocations[idx].id);
                    }, 400);
                }
                showBubble('partner', `Oh wow, ${VirtualDateLocations[idx].name}? Great choice!`, 3000);
            }
            return;
        }

        // Send message via send btn
        if (e.target.id === 'vd-send') {
            const input = el.querySelector('#vd-input');
            if (input && input.value.trim()) sendMessage(input.value.trim());
        }
    });

    // Enter key
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const input = el.querySelector('#vd-input');
            if (input && input.value.trim()) sendMessage(input.value.trim());
        }
    });

    function initVdParticles(locationId) {
        const canvas = el.querySelector('#vd-canvas');
        if (!canvas) return;

        // Clean up any existing Three.js renderer & variables
        if (window.vdRenderer) {
            try {
                window.vdRenderer.dispose();
            } catch (e) {}
            window.vdRenderer = null;
        }
        window.threeScene = null;
        window.threeAmbientLight = null;
        window.threePlatformMat = null;
        window.threeTableMat = null;
        window.threeGridHelper = null;
        window.threeDirLight = null;
        window.currentVdLocationId = null;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (currentResizeHandler) {
            window.removeEventListener('resize', currentResizeHandler);
        }
        if (audioCtx) {
            try {
                audioCtx.close();
            } catch(e) {}
            audioCtx = null;
        }

        // Initialize Web Audio API Synthesizer (Cozy ambient soundscapes)
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let ambientSoundNode = null;
        if (AudioContext) {
            try {
                audioCtx = new AudioContext();
                const filter = audioCtx.createBiquadFilter();
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Soft volume

                const createNoiseNode = (ctx) => {
                    const bufferSize = 2 * ctx.sampleRate;
                    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const output = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                    const whiteNoise = ctx.createBufferSource();
                    whiteNoise.buffer = noiseBuffer;
                    whiteNoise.loop = true;
                    return whiteNoise;
                };

                if (locationId === 'cafe') {
                    // Cafe hum: low frequency murmurs + soft pitch chime nodes
                    const noise = createNoiseNode(audioCtx);
                    filter.type = 'bandpass';
                    filter.frequency.value = 350;
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start();
                } else if (locationId === 'beach') {
                    // Ocean waves: modulated white noise
                    const noise = createNoiseNode(audioCtx);
                    filter.type = 'lowpass';
                    filter.frequency.value = 200;

                    const lfo = audioCtx.createOscillator();
                    lfo.frequency.value = 0.16; // 6 seconds period
                    const lfoGain = audioCtx.createGain();
                    lfoGain.gain.value = 0.02;

                    const waveGain = audioCtx.createGain();
                    waveGain.gain.value = 0.015;

                    lfo.connect(lfoGain);
                    lfoGain.connect(waveGain.gain);

                    noise.connect(filter);
                    filter.connect(waveGain);
                    waveGain.connect(gain);

                    noise.start();
                    lfo.start();
                } else if (locationId === 'mountain') {
                    // Campfire crackling: lowpass hum + periodic crackle nodes
                    const noise = createNoiseNode(audioCtx);
                    filter.type = 'lowpass';
                    filter.frequency.value = 120;
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start();

                    setInterval(() => {
                        if (audioCtx && audioCtx.state === 'running' && Math.random() > 0.4) {
                            const osc = audioCtx.createOscillator();
                            const cGain = audioCtx.createGain();
                            osc.type = 'triangle';
                            osc.frequency.setValueAtTime(800 + Math.random() * 1200, audioCtx.currentTime);
                            cGain.gain.setValueAtTime(0.007, audioCtx.currentTime);
                            cGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.04);
                            osc.connect(cGain);
                            cGain.connect(gain);
                            osc.start();
                            osc.stop(audioCtx.currentTime + 0.05);
                        }
                    }, 300);
                } else if (locationId === 'music') {
                    // Soft synthetic bass/chords pad hum
                    const osc1 = audioCtx.createOscillator();
                    const osc2 = audioCtx.createOscillator();
                    osc1.type = 'sawtooth';
                    osc2.type = 'sine';
                    osc1.frequency.value = 82.4; // E2
                    osc2.frequency.value = 130.8; // C3
                    filter.type = 'lowpass';
                    filter.frequency.value = 100;
                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    osc1.start();
                    osc2.start();
                } else {
                    // Observatory / Rooftop / Future: soft drone
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.value = 110.0; // A2
                    filter.type = 'lowpass';
                    filter.frequency.value = 180;
                    osc.connect(filter);
                    filter.connect(gain);
                    osc.start();
                }

                // Spatial Panning
                const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
                if (panner) {
                    gain.connect(panner);
                    panner.connect(audioCtx.destination);
                    ambientSoundNode = panner;
                } else {
                    gain.connect(audioCtx.destination);
                }

                // Resume suspended Audio Context upon click (browser security policy)
                canvas.addEventListener('click', () => {
                    if (audioCtx && audioCtx.state === 'suspended') {
                        audioCtx.resume();
                    }
                }, { once: true });
            } catch (e) {
                console.error("Web Audio Synthesizer init failed:", e);
            }
        }

        const currentTheme = window.ThemeManager ? window.ThemeManager.getTheme() : 'dark';
        const initialColors = getThreeJSThemeColors(locationId, currentTheme);

        // Initialize Three.js Scene, Camera, and WebGL Renderer
        const scene = new THREE.Scene();
        window.threeScene = scene;
        window.currentVdLocationId = locationId;

        // Reduce fog density on mobile to ease GPU fill rate
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
        scene.fog = new THREE.FogExp2(initialColors.fog, isMobile ? 0.006 : 0.0035);

        const width = el.clientWidth || window.innerWidth;
        const height = el.clientHeight || window.innerHeight;
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 5, 23);
        camera.lookAt(0, 2.5, 0);

        // Mobile: disable antialias + cap pixel ratio to preserve battery/RAM
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: !isMobile,
            powerPreference: isMobile ? 'default' : 'high-performance'
        });
        renderer.setSize(width, height);
        // Cap pixel ratio: 1.5 on mobile, 2 elsewhere — prevents oversized framebuffers
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        window.vdRenderer = renderer;

        // Responsive Resizer
        function resize() {
            const w = el.clientWidth || window.innerWidth;
            const h = el.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener('resize', resize);
        currentResizeHandler = resize;

        const envGroup = new THREE.Group();
        scene.add(envGroup);

        // Core lighting
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight.position.set(12, 24, 12);
        scene.add(dirLight);
        window.threeDirLight = dirLight;

        const ambientLight = new THREE.AmbientLight(initialColors.ambient, currentTheme === 'dark' ? 0.5 : 0.85);
        scene.add(ambientLight);
        window.threeAmbientLight = ambientLight;

        // Grid platform boundary helper
        const gridHelper = new THREE.GridHelper(50, 40, 0x14b8a6, 0x1f1f2e);
        gridHelper.position.y = 0;
        gridHelper.material.opacity = 0.18;
        gridHelper.material.transparent = true;
        envGroup.add(gridHelper);
        window.threeGridHelper = gridHelper;

        // Base cylindrical glass/metal platform
        const platformGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: initialColors.platformColor,
            roughness: 0.2,
            metalness: 0.9,
            emissive: initialColors.platformEmissive
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, -0.2, 0);
        envGroup.add(platform);
        window.threePlatformMat = platformMat;

        // Central interactive 3D table
        const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 24);
        const tableMat = new THREE.MeshStandardMaterial({
            color: initialColors.tableColor,
            roughness: 0.25,
            metalness: 0.7,
            emissive: initialColors.tableEmissive
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1.1, 0);
        envGroup.add(table);
        window.threeTableMat = tableMat;

        // Custom GLSL Shader Material for Holographic Effects
        const hologramShaderMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vNormal = normalize(normalMatrix * normal);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform float time;
                uniform vec3 color;
                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 viewDir = normalize(vViewPosition);
                    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
                    float pulse = sin(time * 6.0 + gl_FragCoord.y * 0.1) * 0.4 + 0.6;
                    float glow = pow(rim, 3.0) * pulse * 1.5;
                    gl_FragColor = vec4(color * (pulse * 0.7 + 0.3) + vec3(glow), 0.75);
                }
            `,
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x06b6d4) }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 3D Composite Avatar Builder function
        function create3DAvatar(roleType, baseColor, emissiveColor, twinAvatarHtml) {
            const group = new THREE.Group();

            // 1. Torso/Body (Glassmorphic capsule)
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.6, 16);
            const bodyMat = new THREE.MeshPhysicalMaterial({
                color: baseColor,
                roughness: 0.1,
                metalness: 0.1,
                transmission: 0.75,
                thickness: 0.5,
                transparent: true,
                opacity: 0.9,
                depthWrite: false
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(0, 0.8, 0);
            group.add(body);

            // 2. Head (Floating Sphere)
            const headGeo = new THREE.SphereGeometry(0.7, 32, 32);
            const headMat = new THREE.MeshStandardMaterial({
                color: baseColor,
                roughness: 0.15,
                metalness: 0.8,
                emissive: emissiveColor,
                emissiveIntensity: 0.4
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(0, 2.1, 0);
            group.add(head);

            // Attempt to load dynamically generated avatar image texture
            if (twinAvatarHtml) {
                const srcMatch = twinAvatarHtml.match(/src="([^"]+)"/);
                if (srcMatch && srcMatch[1]) {
                    const url = srcMatch[1];
                    const texLoader = new THREE.TextureLoader();
                    texLoader.load(url, (tex) => {
                        headMat.map = tex;
                        headMat.color.setHex(0xffffff); // clear solid tint for photo texture
                        headMat.emissive.setHex(0x1a1a1a);
                        headMat.needsUpdate = true;
                    }, undefined, (err) => console.log("Failed to load avatar image texture decal, falling back to glass shader.", err));
                }
            }

            // 3. Eyes (Blinking mechanics)
            const eyeGeo = new THREE.SphereGeometry(0.09, 16, 16);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x060608 });
            
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(-0.2, 2.2, 0.58);
            group.add(eyeL);

            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(0.2, 2.2, 0.58);
            group.add(eyeR);

            // 4. Hands (Floating sphere structures for micro gestures)
            const handGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const handMat = new THREE.MeshPhysicalMaterial({ color: baseColor, roughness: 0.1, transmission: 0.8 });
            
            const handL = new THREE.Mesh(handGeo, handMat);
            handL.position.set(-1.0, 0.6, 0.2);
            group.add(handL);

            const handR = new THREE.Mesh(handGeo, handMat);
            handR.position.set(1.0, 0.6, 0.2);
            group.add(handR);

            // Save references for animation
            group.userData = {
                role: roleType,
                head: head,
                eyes: [eyeL, eyeR],
                hands: [handL, handR],
                isBlinking: false,
                blinkTimer: 0
            };

            return group;
        }

        // Extract Twin Avatars for Dynamic Textures
        const userTwinAvatar = currentUser?.agent_twin?.avatar || '';
        const partnerTwinAvatar = userData?.partnerAvatar || '';

        // Create 3D Holographic User Avatar
        const avatarA = create3DAvatar('user', 0x06b6d4, 0x0891b2, userTwinAvatar);
        avatarA.position.set(-4.5, 2.4, 0);
        envGroup.add(avatarA);

        // Create 3D Holographic Partner Avatar
        const avatarB = create3DAvatar('partner', 0xec4899, 0xdb2777, partnerTwinAvatar);
        avatarB.position.set(4.5, 2.4, 0);
        envGroup.add(avatarB);

        // NPC avatar structure (Ambient environment support)
        let npcModel = null;
        let npcId = null;

        // Map locationId to NPC definitions
        const npcMap = {
            'rooftop': { name: 'Mixologist', color: 0xfacc15, emissive: 0xd97706 },
            'cafe': { name: 'Barista', color: 0xd97706, emissive: 0x92400e },
            'beach': { name: 'Local Surfer', color: 0xf43f5e, emissive: 0xbe123c },
            'bookstore': { name: 'Bookseller', color: 0xf59e0b, emissive: 0xb45309 },
            'lantern': { name: 'Tea Artist', color: 0xf97316, emissive: 0xc2410c },
            'gallery': { name: 'Museum Guide', color: 0x0ea5e9, emissive: 0x0369a1 },
            'mountain': { name: 'Trail Guide', color: 0x38bdf8, emissive: 0x0284c7 },
            'music': { name: 'Musician', color: 0xa855f7, emissive: 0x7e22ce },
            'futurecity': { name: 'AI Advisor', color: 0x10b981, emissive: 0x047857 },
            'observatory': { name: 'Astronomer', color: 0x6366f1, emissive: 0x4338ca }
        };

        const currentNpc = npcMap[locationId];
        if (currentNpc) {
            npcId = currentNpc.name;
            npcModel = create3DAvatar(npcId, currentNpc.color, currentNpc.emissive, null);
            npcModel.position.set(0, 2.4, -4.5); // Placed triangularly behind table
            npcModel.rotation.y = 0;
            // Mark as interactive Raycast target
            npcModel.children.forEach(c => {
                c.userData = { interactiveId: 'npc', name: npcId };
            });
            envGroup.add(npcModel);
        }

        // Interactive Furniture / Coffee Cup elements
        let coffeeCup = null;
        const cupGroup = new THREE.Group();
        cupGroup.position.set(0, 2.2, 0); // Spawn on table center

        const cupBodyGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12);
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.1, metalness: 0.5 });
        const cupBody = new THREE.Mesh(cupBodyGeo, cupMat);
        cupBody.userData = { interactiveId: 'coffee_cup' };
        cupGroup.add(cupBody);

        const handleGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 12, Math.PI);
        const handle = new THREE.Mesh(handleGeo, cupMat);
        handle.position.set(0.24, 0, 0);
        handle.rotation.z = -Math.PI/2;
        handle.userData = { interactiveId: 'coffee_cup' };
        cupGroup.add(handle);

        envGroup.add(cupGroup);

        const animatedObjects = [];
        let locationColor = 0xffffff;

        // Custom GLSL shader uniform reference
        let customShaderTime = 0;

        // Build 10 Distinct Premium Virtual Date WebGL Environments
        if (locationId === 'rooftop') {
            locationColor = 0xfacc15;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xfeb08b);

            // Tall glass high-rise towers
            const bldgCount = 35;
            for (let i = 0; i < bldgCount; i++) {
                const bldgW = 2.5 + Math.random() * 3.5;
                const bldgH = 12 + Math.random() * 26;
                const bldgD = 2.5 + Math.random() * 3.5;
                const bldgGeo = new THREE.BoxGeometry(bldgW, bldgH, bldgD);
                const bldgMat = new THREE.MeshStandardMaterial({
                    color: 0x020208,
                    roughness: 0.4,
                    metalness: 0.9,
                    emissive: Math.random() > 0.6 ? 0x0f172a : 0x312e81,
                    emissiveIntensity: 0.2
                });
                const bldg = new THREE.Mesh(bldgGeo, bldgMat);
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 22;
                bldg.position.set(Math.cos(angle) * dist, bldgH / 2 - 5, Math.sin(angle) * dist);
                envGroup.add(bldg);
            }

            // Starfield
            const starGeo = new THREE.BufferGeometry();
            const starCount = 100;
            const starPos = new Float32Array(starCount * 3);
            for (let i = 0; i < starCount * 3; i += 3) {
                starPos[i] = (Math.random() - 0.5) * 75;
                starPos[i+1] = 8 + Math.random() * 25;
                starPos[i+2] = (Math.random() - 0.5) * 75;
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            const starMat = new THREE.PointsMaterial({ color: 0xfacc15, size: 0.15, transparent: true, opacity: 0.6 });
            const stars = new THREE.Points(starGeo, starMat);
            envGroup.add(stars);
            animatedObjects.push({ mesh: stars, type: 'rotateY', speed: 0.0003 });

        } else if (locationId === 'cafe') {
            locationColor = 0xd97706;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xfbbf24);

            const spotLight = new THREE.SpotLight(0xfff7ed, 4.5, 20, Math.PI / 4, 0.6, 1);
            spotLight.position.set(0, 11, 0);
            spotLight.target = table;
            scene.add(spotLight);

            // Rising coffee steam particles
            const steamGeo = new THREE.BufferGeometry();
            const steamCount = 30;
            const steamPos = new Float32Array(steamCount * 3);
            for (let i = 0; i < steamCount * 3; i += 3) {
                steamPos[i] = (Math.random() - 0.5) * 0.6;
                steamPos[i+1] = 2.2 + Math.random() * 2.5;
                steamPos[i+2] = (Math.random() - 0.5) * 0.6;
            }
            steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
            const steamMat = new THREE.PointsMaterial({ color: 0xffedd5, size: 0.12, transparent: true, opacity: 0.35 });
            const steam = new THREE.Points(steamGeo, steamMat);
            envGroup.add(steam);
            animatedObjects.push({ mesh: steam, type: 'steam', speed: 0.018, count: steamCount });

        } else if (locationId === 'beach') {
            locationColor = 0xf43f5e;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xf43f5e);
            dirLight.position.set(-8, 7, -8);

            // Wave mesh deformed dynamically
            const seaGeo = new THREE.PlaneGeometry(80, 80, 24, 24);
            const seaMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.15,
                metalness: 0.85,
                wireframe: true
            });
            const sea = new THREE.Mesh(seaGeo, seaMat);
            sea.rotation.x = -Math.PI / 2;
            sea.position.set(0, -0.4, -28);
            envGroup.add(sea);
            animatedObjects.push({ mesh: sea, type: 'ocean_waves', time: 0 });

            // Coastal spray particles
            const sprayGeo = new THREE.BufferGeometry();
            const sprayCount = 120;
            const sprayPos = new Float32Array(sprayCount * 3);
            for (let i = 0; i < sprayCount * 3; i += 3) {
                sprayPos[i] = (Math.random() - 0.5) * 60;
                sprayPos[i+1] = Math.random() * 8;
                sprayPos[i+2] = -5 - Math.random() * 25;
            }
            sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
            const sprayMat = new THREE.PointsMaterial({ color: 0xfecdd3, size: 0.09, transparent: true, opacity: 0.45 });
            const spray = new THREE.Points(sprayGeo, sprayMat);
            envGroup.add(spray);

        } else if (locationId === 'bookstore') {
            locationColor = 0xf59e0b;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xfef08a);

            // Library bookshelves
            for (let i = -1.8; i <= 1.8; i += 1.2) {
                if (Math.abs(i) < 0.5) continue;
                const shelfGeo = new THREE.BoxGeometry(1.6, 9.5, 3.2);
                const shelfMat = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.8 });
                const shelf = new THREE.Mesh(shelfGeo, shelfMat);
                shelf.position.set(i * 5.2, 4.5, -7.5);
                envGroup.add(shelf);
            }

            // Floating books bobbing
            const bookCount = 15;
            const books = [];
            for (let i = 0; i < bookCount; i++) {
                const bookGeo = new THREE.BoxGeometry(0.65, 0.1, 0.95);
                const bookMat = new THREE.MeshStandardMaterial({
                    color: i % 3 === 0 ? 0x065f46 : (i % 3 === 1 ? 0x9f1239 : 0x1e3a8a),
                    roughness: 0.3,
                    metalness: 0.15,
                    emissive: 0xfef08a,
                    emissiveIntensity: 0.06
                });
                const book = new THREE.Mesh(bookGeo, bookMat);
                book.position.set(
                    (Math.random() - 0.5) * 9,
                    2.0 + Math.random() * 4.5,
                    (Math.random() - 0.5) * 9
                );
                envGroup.add(book);
                books.push(book);
            }
            animatedObjects.push({ mesh: books, type: 'floating_books', time: 0 });

        } else if (locationId === 'lantern') {
            locationColor = 0xf97316;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xf97316);

            // Chinese lanterns bobbing in garden
            const lanternCount = 20;
            const lanterns = [];
            for (let i = 0; i < lanternCount; i++) {
                const lanternGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8);
                const lanternMat = new THREE.MeshStandardMaterial({
                    color: 0xf97316,
                    emissive: 0xf97316,
                    emissiveIntensity: 1.1,
                    transparent: true,
                    opacity: 0.85
                });
                const lat = new THREE.Mesh(lanternGeo, lanternMat);
                lat.position.set(
                    (Math.random() - 0.5) * 16,
                    2.2 + Math.random() * 7.5,
                    (Math.random() - 0.5) * 16
                );
                const pl = new THREE.PointLight(0xf97316, 0.35, 4.5);
                lat.add(pl);
                envGroup.add(lat);
                lanterns.push(lat);
            }
            animatedObjects.push({ mesh: lanterns, type: 'lanterns_bobbing', time: 0 });

        } else if (locationId === 'gallery') {
            locationColor = 0x0ea5e9;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0x0ea5e9);

            // Floating artwork canvas frames
            const panelCount = 4;
            for (let i = 0; i < panelCount; i++) {
                const artGeo = new THREE.BoxGeometry(4.5, 3.2, 0.1);
                const artMat = new THREE.MeshStandardMaterial({
                    color: 0x020617,
                    roughness: 0.15,
                    metalness: 0.8,
                    emissive: 0x0ea5e9,
                    emissiveIntensity: 0.18
                });
                const art = new THREE.Mesh(artGeo, artMat);
                art.position.set((i - 1.5) * 7.0, 4.8, -8.5);
                envGroup.add(art);

                const frameLight = new THREE.SpotLight(0x0ea5e9, 1.6, 11, Math.PI / 8);
                frameLight.position.set((i - 1.5) * 7.0, 9.5, -6.5);
                frameLight.target = art;
                scene.add(frameLight);
            }

        } else if (locationId === 'mountain') {
            locationColor = 0x38bdf8;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xe0f2fe);

            // Wireframe mountain range cones
            const mountainGeo = new THREE.ConeGeometry(28, 16, 4);
            const mountainMat = new THREE.MeshStandardMaterial({
                color: 0x0284c7,
                roughness: 0.9,
                metalness: 0.1,
                wireframe: true
            });
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(0, 3.5, -17);
            envGroup.add(mountain);

            // Campfire logs
            const log1Geo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
            const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
            
            const log1 = new THREE.Mesh(log1Geo, logMat);
            log1.rotation.z = Math.PI / 4;
            log1.position.set(0, 0.1, -1.8);
            envGroup.add(log1);

            const log2 = new THREE.Mesh(log1Geo, logMat);
            log2.rotation.z = -Math.PI / 4;
            log2.position.set(0, 0.1, -1.8);
            envGroup.add(log2);

            // Falling snow particles
            const snowGeo = new THREE.BufferGeometry();
            const snowCount = 150;
            const snowPos = new Float32Array(snowCount * 3);
            for (let i = 0; i < snowCount * 3; i += 3) {
                snowPos[i] = (Math.random() - 0.5) * 32;
                snowPos[i+1] = Math.random() * 18;
                snowPos[i+2] = (Math.random() - 0.5) * 32;
            }
            snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
            const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 });
            const snow = new THREE.Points(snowGeo, snowMat);
            envGroup.add(snow);
            animatedObjects.push({ mesh: snow, type: 'snow', speed: 0.035, count: snowCount });

        } else if (locationId === 'music') {
            locationColor = 0xa855f7;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xf472b6);

            // Dynamic music visualizer bars
            const barCount = 12;
            const bars = [];
            const barGroup = new THREE.Group();
            barGroup.position.set(0, 0, -7.5);
            envGroup.add(barGroup);

            for (let i = 0; i < barCount; i++) {
                const barGeo = new THREE.BoxGeometry(0.65, 4.0, 0.65);
                const barMat = new THREE.MeshStandardMaterial({
                    color: 0x6366f1,
                    emissive: 0xa855f7,
                    emissiveIntensity: 0.8,
                    roughness: 0.1
                });
                const bar = new THREE.Mesh(barGeo, barMat);
                bar.position.set((i - barCount / 2) * 1.2, 0, 0);
                barGroup.add(bar);
                bars.push(bar);
            }
            animatedObjects.push({ mesh: bars, type: 'music_bars', time: 0 });

        } else if (locationId === 'futurecity') {
            locationColor = 0x10b981;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0x34d399);

            // Cylinders with custom Holographic GLSL Shader
            const towerCount = 6;
            for (let i = 0; i < towerCount; i++) {
                const towerGeo = new THREE.CylinderGeometry(1.0, 2.0, 24, 6);
                const tower = new THREE.Mesh(towerGeo, hologramShaderMat);
                tower.position.set((i - towerCount / 2) * 8.5 + 3, 7.5, -20);
                envGroup.add(tower);
            }

            // Cyberpunk light trails
            const trailGeo = new THREE.BufferGeometry();
            const trailCount = 55;
            const trailPos = new Float32Array(trailCount * 3);
            for (let i = 0; i < trailCount * 3; i += 3) {
                trailPos[i] = (Math.random() - 0.5) * 40;
                trailPos[i+1] = Math.random() * 16;
                trailPos[i+2] = (Math.random() - 0.5) * 32;
            }
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
            const trailMat = new THREE.PointsMaterial({ color: 0x34d399, size: 0.16, transparent: true, opacity: 0.65 });
            const trails = new THREE.Points(trailGeo, trailMat);
            envGroup.add(trails);
            animatedObjects.push({ mesh: trails, type: 'light_trails', speed: 0.08, count: trailCount });

        } else if (locationId === 'observatory') {
            locationColor = 0x6366f1;
            scene.fog.color.setHex(initialColors.fog);
            ambientLight.color.setHex(initialColors.ambient);
            dirLight.color.setHex(0xa5b4fc);

            // Observatory celestial star dome particles
            const starfieldGeo = new THREE.BufferGeometry();
            const starfieldCount = 400;
            const starfieldPos = new Float32Array(starfieldCount * 3);
            for (let i = 0; i < starfieldCount * 3; i += 3) {
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI;
                const radius = 70 + Math.random() * 8;
                starfieldPos[i] = Math.cos(angle1) * Math.sin(angle2) * radius;
                starfieldPos[i+1] = Math.abs(Math.sin(angle1) * Math.sin(angle2) * radius);
                starfieldPos[i+2] = Math.cos(angle2) * radius;
            }
            starfieldGeo.setAttribute('position', new THREE.BufferAttribute(starfieldPos, 3));
            const starfieldMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.85 });
            const starfield = new THREE.Points(starfieldGeo, starfieldMat);
            envGroup.add(starfield);
            animatedObjects.push({ mesh: starfield, type: 'rotateY', speed: 0.00015 });

            // Wireframe dome structure
            const domeGeo = new THREE.SphereGeometry(60, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({
                color: 0x312e81,
                wireframe: true,
                transparent: true,
                opacity: 0.1
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            envGroup.add(dome);

            // Telescope model on table
            const scopeGroup = new THREE.Group();
            scopeGroup.position.set(0, 2.2, 0);

            const scopeGeo = new THREE.CylinderGeometry(0.08, 0.06, 1.4, 8);
            const scopeMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.1 });
            const scope = new THREE.Mesh(scopeGeo, scopeMat);
            scope.rotation.x = Math.PI / 3;
            scope.position.set(0, 0.4, 0);
            scope.userData = { interactiveId: 'telescope' };
            scopeGroup.add(scope);

            const standGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
            const stand = new THREE.Mesh(standGeo, scopeMat);
            stand.position.set(0, 0.15, 0);
            stand.userData = { interactiveId: 'telescope' };
            scopeGroup.add(stand);

            envGroup.add(scopeGroup);
        }

        const vibeLight = new THREE.PointLight(locationColor, 1.6, 11);
        vibeLight.position.set(0, 3.2, 0);
        scene.add(vibeLight);

        // Interactive Click Detection (Raycasting on 3D Objects)
        const raycaster = new THREE.Raycaster();
        const clickMouse = new THREE.Vector2();

        function handle3DClick(object) {
            if (interactionCooldown) return;
            const targetId = object.userData.interactiveId;
            if (!targetId) return;

            interactionCooldown = true;
            setTimeout(() => { interactionCooldown = false; }, 2000);

            if (targetId === 'coffee_cup') {
                // Micro-interaction: Coffee Cheers!
                cheersActive = true;
                
                // Play synthesized Web Audio Clink
                if (audioCtx) {
                    try {
                        const osc1 = audioCtx.createOscillator();
                        const osc2 = audioCtx.createOscillator();
                        const cGain = audioCtx.createGain();
                        osc1.type = 'sine';
                        osc2.type = 'sine';
                        osc1.frequency.setValueAtTime(1400, audioCtx.currentTime);
                        osc2.frequency.setValueAtTime(2100, audioCtx.currentTime);
                        cGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                        cGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);
                        
                        osc1.connect(cGain);
                        osc2.connect(cGain);
                        cGain.connect(audioCtx.destination);
                        osc1.start();
                        osc2.start();
                        osc1.stop(audioCtx.currentTime + 0.7);
                        osc2.stop(audioCtx.currentTime + 0.7);
                    } catch(e) {}
                }

                // GSAP cheers movement
                if (typeof gsap !== 'undefined') {
                    gsap.to(avatarA.position, { x: -1.8, y: 2.2, duration: 0.6, yoyo: true, repeat: 1, ease: "power2.out" });
                    gsap.to(avatarB.position, { x: 1.8, y: 2.2, duration: 0.6, yoyo: true, repeat: 1, ease: "power2.out", onComplete: () => { cheersActive = false; } });
                    gsap.to(avatarA.rotation, { z: -0.25, duration: 0.6, yoyo: true, repeat: 1 });
                    gsap.to(avatarB.rotation, { z: 0.25, duration: 0.6, yoyo: true, repeat: 1 });
                } else {
                    setTimeout(() => { cheersActive = false; }, 1200);
                }

                showBubble('user', `*Clinks coffee cup with you* Cheers! ☕`, 3000);
                setTimeout(() => {
                    showBubble('partner', `Aww, cheers! I love the vibe here, honestly. 💖`, 3500);
                }, 1200);
                updateScore(6);
                KonvoToast.show("Micro Interaction Unlocked: Coffee Cheers! ☕", "success", 3000);

            } else if (targetId === 'npc') {
                // NPC Activity: Introduces dates/topics
                const npcName = object.userData.name || 'Barista';
                npcSpeaking = true;
                speakingSide = 'npc';

                const lines = {
                    'Mixologist': "Hey! Can I interest you guys in our signature Skyline Mocktails? It usually gets people talking about travel plans or future lifestyles.",
                    'Barista': "Cozy spot, isn't it? Let me know if you want to run the Weekend Simulator scenario to see how your Saturday mornings align.",
                    'Local Surfer': "Sunset beach wave coordinates check out! Ready to talk about freedom, growth, or wild adventures?",
                    'Bookseller': "Welcome to the bookstore sandbox. Select a topic like books, movies, or philosophy from the scenario menu, or click a book model to begin.",
                    'Tea Artist': "Tea ceremonies are built on trust and bounds. Let's explore Lantern Garden trust and value structures.",
                    'Museum Guide': "Art is expression. What traits do you appreciate in a partner's creative communication styles?",
                    'Trail Guide': "Mountains test resilience. Let's discuss personal challenges or career ambitions.",
                    'Musician': "Music connects us emotionally. What songs speak to your inner feelings, or define your personality?",
                    'AI Advisor': "Welcome to the Future City simulation dashboard. Start building your Startup or dream life design scenario.",
                    'Astronomer': "Telescopes resolve long-term stellar visions. Click on the scope to discuss deep visions and life meaning."
                };
                const introText = lines[npcName] || "Hello! Ready to unlock some compatibility insights? Select a scenario to begin.";
                
                const npcBubble = el.querySelector('#vd-bubble-npc');
                if (npcBubble) {
                    npcBubble.textContent = `[${npcName}] ${introText}`;
                    npcBubble.style.opacity = '1';
                    npcBubble.style.transform = 'translateX(-50%) scale(1)';
                    setTimeout(() => {
                        npcBubble.style.opacity = '0';
                        npcBubble.style.transform = 'translateX(-50%) scale(0.9)';
                        npcSpeaking = false;
                        speakingSide = 'none';
                    }, 5000);
                } else {
                    npcSpeaking = false;
                    speakingSide = 'none';
                }
                
                // Toggle scenario panel drawer automatically
                const drawer = el.querySelector('#vd-scenario-panel');
                if (drawer && !drawer.classList.contains('active')) {
                    drawer.classList.add('active');
                }

            } else if (targetId === 'telescope') {
                showBubble('partner', "Resolution calibrated! Ngl stargazing here makes me feel so small. What is your long term vision? 🌌", 4500);
                updateScore(5);
            }
        }

        // Raycast Event Listeners
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            clickMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            clickMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(clickMouse, camera);

            const intersects = raycaster.intersectObjects(envGroup.children, true);
            if (intersects.length > 0 && intersects[0].object.userData && intersects[0].object.userData.interactiveId) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            clickMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            clickMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(clickMouse, camera);

            const intersects = raycaster.intersectObjects(envGroup.children, true);
            if (intersects.length > 0) {
                handle3DClick(intersects[0].object);
            }
        });

        let targetCamX = 0;
        let targetCamY = 5;

        // Custom pointer-events mousemove listener (Responsive Camera Parallax Tilt)
        mouseMoveHandler = (e) => {
            const w = el.clientWidth || window.innerWidth;
            const h = el.clientHeight || window.innerHeight;
            const normX = (e.clientX / w) * 2 - 1;
            const normY = (e.clientY / h) * 2 - 1;
            targetCamX = normX * 3.8;
            targetCamY = 5 - normY * 2.0;
        };
        el.addEventListener('mousemove', mouseMoveHandler);

        let animationTime = 0;

        // Render Tick Loop
        function tick() {
            animationFrameId = requestAnimationFrame(tick);
            animationTime += 0.01;
            customShaderTime += 0.01;

            if (hologramShaderMat.uniforms.time) {
                hologramShaderMat.uniforms.time.value = customShaderTime;
            }

            // Web Audio spatial panner shift based on camera position
            if (ambientSoundNode && ambientSoundNode.pan) {
                ambientSoundNode.pan.value = Math.max(-1.0, Math.min(1.0, camera.position.x / 4.0));
            }

            // Smooth camera movements
            camera.position.x += (targetCamX - camera.position.x) * 0.05;
            camera.position.y += (targetCamY - camera.position.y) * 0.05;
            camera.lookAt(0, 2.3, 0);

            // 1. Avatar A Animation (Head tracking + speaking bob)
            if (speakingSide === 'user') {
                avatarA.position.y = 2.4 + Math.sin(animationTime * 10) * 0.15;
                avatarA.userData.hands[0].position.y = 0.6 + Math.sin(animationTime * 12) * 0.2;
                avatarA.userData.hands[1].position.y = 0.6 + Math.cos(animationTime * 12) * 0.2;
            } else {
                avatarA.position.y = 2.4 + Math.sin(animationTime * 1.5) * 0.05; // Gentle float
                avatarA.userData.hands[0].position.y = 0.6 + Math.sin(animationTime * 1.5) * 0.04;
                avatarA.userData.hands[1].position.y = 0.6 + Math.cos(animationTime * 1.5) * 0.04;
            }

            // Head rotation tracks cursor
            const headARotY = targetCamX * 0.18;
            const headARotX = -targetCamY * 0.1;
            avatarA.userData.head.rotation.y += (headARotY - avatarA.userData.head.rotation.y) * 0.08;
            avatarA.userData.head.rotation.x += (headARotX - avatarA.userData.head.rotation.x) * 0.08;

            // 2. Avatar B Animation (Head tracking + speaking bob)
            if (cheersActive) {
                // cheers override
            } else if (isThinking || speakingSide === 'partner') {
                avatarB.position.y = 2.4 + Math.sin(animationTime * 9) * 0.15;
                avatarB.userData.hands[0].position.y = 0.6 + Math.sin(animationTime * 12) * 0.18;
                avatarB.userData.hands[1].position.y = 0.6 + Math.cos(animationTime * 12) * 0.18;
            } else {
                avatarB.position.y = 2.4 + Math.cos(animationTime * 1.5) * 0.05; // Gentle float
                avatarB.userData.hands[0].position.y = 0.6 + Math.cos(animationTime * 1.5) * 0.04;
                avatarB.userData.hands[1].position.y = 0.6 + Math.sin(animationTime * 1.5) * 0.04;
            }

            // Partner looks towards user A
            const headBRotY = -0.58; // slightly rotated left to face User A
            avatarB.userData.head.rotation.y += (headBRotY - avatarB.userData.head.rotation.y) * 0.08;

            // 3. NPC Avatar Animation (Calm idle bob)
            if (npcModel) {
                if (npcSpeaking) {
                    npcModel.position.y = 2.4 + Math.sin(animationTime * 8) * 0.12;
                    npcModel.userData.hands[0].position.y = 0.6 + Math.sin(animationTime * 10) * 0.15;
                    npcModel.userData.hands[1].position.y = 0.6 + Math.cos(animationTime * 10) * 0.15;
                } else {
                    npcModel.position.y = 2.4 + Math.sin(animationTime * 1.2) * 0.04;
                    npcModel.userData.hands[0].position.y = 0.6 + Math.sin(animationTime * 1.2) * 0.02;
                    npcModel.userData.hands[1].position.y = 0.6 + Math.cos(animationTime * 1.2) * 0.02;
                }
            }

            // 4. Blinking systems
            [avatarA, avatarB].forEach(av => {
                if (!av.userData.isBlinking && Math.random() < 0.007) {
                    av.userData.isBlinking = true;
                    av.userData.blinkTimer = 0;
                }
                if (av.userData.isBlinking) {
                    av.userData.blinkTimer += 0.2;
                    const scaleY = Math.abs(Math.sin(av.userData.blinkTimer));
                    av.userData.eyes.forEach(eye => {
                        eye.scale.y = scaleY;
                    });
                    if (av.userData.blinkTimer >= Math.PI) {
                        av.userData.isBlinking = false;
                        av.userData.eyes.forEach(eye => eye.scale.y = 1.0);
                    }
                }
            });

            // 5. Update environment geometries
            animatedObjects.forEach(obj => {
                if (obj.type === 'rotateY') {
                    obj.mesh.rotation.y += obj.speed;
                } else if (obj.type === 'steam') {
                    const posAttr = obj.mesh.geometry.attributes.position;
                    for (let i = 0; i < obj.count; i++) {
                        let y = posAttr.getY(i);
                        y += obj.speed;
                        if (y > 4.8) {
                            y = 2.2 + Math.random() * 0.8;
                        }
                        posAttr.setY(i, y);
                    }
                    posAttr.needsUpdate = true;
                } else if (obj.type === 'ocean_waves') {
                    obj.time += 0.014;
                    const posAttr = obj.mesh.geometry.attributes.position;
                    const len = posAttr.count;
                    for (let i = 0; i < len; i++) {
                        const x = posAttr.getX(i);
                        const y = posAttr.getY(i);
                        const z = Math.sin(x * 0.20 + obj.time) * 0.4 + Math.cos(y * 0.20 + obj.time) * 0.4;
                        posAttr.setZ(i, z);
                    }
                    posAttr.needsUpdate = true;
                } else if (obj.type === 'floating_books') {
                    obj.time += 0.015;
                    obj.mesh.forEach((b, idx) => {
                        b.position.y += Math.sin(obj.time + idx) * 0.0045;
                        b.rotation.y += 0.0025;
                        b.rotation.x += 0.001;
                    });
                } else if (obj.type === 'lanterns_bobbing') {
                    obj.time += 0.01;
                    obj.mesh.forEach((l, idx) => {
                        l.position.y += Math.sin(obj.time + idx) * 0.0055;
                        l.rotation.y += 0.0012;
                    });
                } else if (obj.type === 'snow') {
                    const posAttr = obj.mesh.geometry.attributes.position;
                    for (let i = 0; i < obj.count; i++) {
                        let y = posAttr.getY(i);
                        y -= obj.speed;
                        if (y < 0) {
                            y = 16.0;
                        }
                        posAttr.setY(i, y);
                    }
                    posAttr.needsUpdate = true;
                } else if (obj.type === 'music_bars') {
                    obj.time += 0.06;
                    obj.mesh.forEach((bar, idx) => {
                        const scaleH = 1 + Math.sin(obj.time + idx) * 1.4 + Math.cos(obj.time * 0.35 + idx) * 0.45;
                        bar.scale.y = Math.max(0.12, scaleH);
                        bar.position.y = bar.scale.y * 2.0;
                    });
                } else if (obj.type === 'light_trails') {
                    const posAttr = obj.mesh.geometry.attributes.position;
                    for (let i = 0; i < obj.count; i++) {
                        let y = posAttr.getY(i);
                        y -= obj.speed;
                        if (y < 0) {
                            y = 16.0;
                        }
                        posAttr.setY(i, y);
                    }
                    posAttr.needsUpdate = true;
                }
            });

            // Pulsing point light at table center
            vibeLight.intensity = 1.2 + Math.sin(animationTime * 2.2) * 0.3;
            renderer.render(scene, camera);
        }

        tick();
    }

    function analyzeMessage(text) {
        const t = text.toLowerCase();
        let detectedSlang = null;
        let greenFlag = null;
        let redFlag = null;

        // Gen Z slang words
        const slangMap = {
            'no cap': 'no cap',
            'rizz': 'rizz',
            'bet': 'bet',
            'fr': 'fr',
            'slay': 'slay',
            'cooked': 'cooked',
            'simp': 'simp',
            'yapping': 'yapping',
            'valid': 'valid',
            'sus': 'sus',
            'mid': 'mid',
            'glow up': 'glow up',
            'delulu': 'delulu',
            'lowkey': 'lowkey',
            'highkey': 'highkey',
            'bruh': 'bruh',
            'ate': 'ate',
            'tea': 'tea',
            'cap': 'cap'
        };

        for (const [key, val] of Object.entries(slangMap)) {
            if (t.includes(key)) {
                detectedSlang = val;
                break;
            }
        }

        // Green flags
        const greenFlags = [
            { type: 'Active Listening', keywords: ['what do you think', 'how about you', 'tell me more', 'elaborate', 'interest'] },
            { type: 'Empathy', keywords: ['understand', 'sorry to hear', 'i feel you', 'empathy', 'supportive'] },
            { type: 'Respect', keywords: ['respect', 'boundary', 'comfortable', 'safe', 'consent'] },
            { type: 'Growth Mindset', keywords: ['learn', 'grow', 'improve', 'goals', 'mindset', 'future'] }
        ];

        for (const gf of greenFlags) {
            if (gf.keywords.some(kw => t.includes(kw))) {
                greenFlag = gf.type;
                break;
            }
        }

        // Red flags
        const redFlags = [
            { type: 'Aggression', keywords: ['shut up', 'stupid', 'hate you', 'trash', 'clown', 'bitch', 'fuck'] },
            { type: 'Boundary Violation', keywords: ['send pic', 'nude', 'sexy', 'hot', 'ass', 'cock'] },
            { type: 'Manipulation', keywords: ['manipulate', 'control', 'fake', 'liar', 'toxic'] }
        ];

        for (const rf of redFlags) {
            if (rf.keywords.some(kw => t.includes(kw))) {
                redFlag = rf.type;
                break;
            }
        }

        return { detectedSlang, greenFlag, redFlag };
    }

    function displayBadge(type, label, className) {
        const container = el.querySelector('#vd-badge-container');
        if (!container) return;

        const badge = document.createElement('div');
        badge.className = `vd-flag-badge ${className}`;
        
        let emoji = '';
        if (className === 'green') emoji = '🟢';
        else if (className === 'red') emoji = '🔴';
        else emoji = '✨';

        badge.innerHTML = `${emoji} ${type}: ${label}`;
        container.appendChild(badge);

        // Fade out and remove after 4 seconds
        setTimeout(() => {
            badge.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            badge.style.opacity = '0';
            badge.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                badge.remove();
            }, 500);
        }, 4000);
    }

    function sendMessage(text) {
        if (isThinking) return;
        isThinking = true;
        const input = el.querySelector('#vd-input');
        if (input) input.value = '';

        showBubble('user', text, 3000);

        const analysis = analyzeMessage(text);
        let scoreDelta = scoreMessage(text);

        if (analysis.detectedSlang) {
            displayBadge('SLANG', analysis.detectedSlang.toUpperCase(), 'slang');
            scoreDelta += 3;
        }
        if (analysis.greenFlag) {
            displayBadge('GREEN FLAG', analysis.greenFlag, 'green');
            scoreDelta += 10;
            if (window.KonvoToast) {
                KonvoToast.show(`Green Flag: ${analysis.greenFlag}! Compatibility boosted.`, 'success', 3000);
            }
        }
        if (analysis.redFlag) {
            displayBadge('RED FLAG', analysis.redFlag, 'red');
            scoreDelta -= 15;
            if (window.KonvoToast) {
                KonvoToast.show(`Boundary Check: Red Flag detected (${analysis.redFlag}). Moderation alert logged.`, 'warning', 3000);
            }
            Telemetry.logEvent('red_flag_moderation', { user_message: text, flag_type: analysis.redFlag });
        }

        updateScore(scoreDelta);

        const preview = el.querySelector('#vd-response-preview');
        if (preview) {
            preview.textContent = '...';
            let dots = 0;
            const dotInterval = setInterval(() => {
                dots = (dots + 1) % 4;
                preview.textContent = '.'.repeat(dots + 1);
            }, 300);

            setTimeout(() => {
                clearInterval(dotInterval);
                const response = getResponse(scoreDelta, analysis.detectedSlang);
                showBubble('partner', response, 4000);
                animateTextTypewriter(preview, '💬 ' + response, 20);
                isThinking = false;
            }, 1200 + Math.random() * 800);
        } else {
            setTimeout(() => { isThinking = false; }, 1500);
        }
    }
}
window.openVirtualDate = openVirtualDate;


function initRatingPopup() {
    const lastRated = localStorage.getItem('konvo_last_rated');
    if (lastRated) {
        const daysSince = (Date.now() - parseInt(lastRated)) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) return; // Suppress for 30 days
    }

    const SESSION_TRIGGER_MS = 2 * 60 * 60 * 1000; // 2 hours
    const DEV_TRIGGER_MS = 2 * 60 * 60 * 1000; // 2 hours

    setTimeout(() => {
        const popup = document.createElement('div');
        popup.className = 'rating-popup';
        popup.id = 'konvo-rating-popup';
        let selectedStars = 0;

        popup.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <div class="rating-popup-title">Enjoying Konvo? ✨</div>
            <button onclick="document.getElementById('konvo-rating-popup').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;">✕</button>
        </div>
        <div class="rating-popup-sub">You've been here a while! How's your experience so far?</div>
        <div class="star-rating-row" id="popup-star-row">
            <button class="star-btn" data-val="1">⭐</button>
            <button class="star-btn" data-val="2">⭐</button>
            <button class="star-btn" data-val="3">⭐</button>
            <button class="star-btn" data-val="4">⭐</button>
            <button class="star-btn" data-val="5">⭐</button>
        </div>
        <div class="rating-actions">
            <button onclick="document.getElementById('konvo-rating-popup').remove()" style="padding:0.4rem 0.75rem;border-radius:5px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-family:var(--font-mono);font-size:0.75rem;cursor:pointer;">Later</button>
            <button id="popup-submit-rating" style="padding:0.4rem 0.75rem;border-radius:5px;background:linear-gradient(135deg,#4F46E5,#0D9488);color:white;border:none;font-family:var(--font-mono);font-size:0.75rem;cursor:pointer;">Submit</button>
        </div>`;

        document.body.appendChild(popup);

        popup.querySelector('#popup-star-row').addEventListener('click', (e) => {
            const btn = e.target.closest('.star-btn');
            if (!btn) return;
            selectedStars = parseInt(btn.dataset.val);
            popup.querySelectorAll('.star-btn').forEach((b, i) => {
                b.classList.toggle('active', i < selectedStars);
            });
        });

        popup.querySelector('#popup-submit-rating').addEventListener('click', () => {
            if (!selectedStars) { KonvoToast.show('Please select a star rating!', 'warning'); return; }
            localStorage.setItem('konvo_last_rated', Date.now().toString());
            localStorage.setItem('konvo_rating', selectedStars.toString());
            try {
                fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('konvo_token') || '') },
                    body: JSON.stringify({ type: 'rating', rating: selectedStars })
                }).catch(() => {});
            } catch (e) {}
            popup.remove();
            KonvoToast.show(`Thank you for rating Konvo ${selectedStars}⭐ — you're the best!`, 'success', 4000);
            Telemetry.logEvent('user_rating_submitted', { stars: selectedStars });
        });
    }, DEV_TRIGGER_MS);
}

// ═══════════════════════════════════════════════════════
// ANIMATED STATS COUNTERS
// ═══════════════════════════════════════════════════════
function animateStatCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    counters.forEach(el => {
        const target = parseInt(el.dataset.countTo);
        const duration = parseInt(el.dataset.countDuration) || 2000;
        const suffix = el.dataset.countSuffix || '';
        const prefix = el.dataset.countPrefix || '';
        let start = null;
        const startVal = 0;

        function step(ts) {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.floor(startVal + (target - startVal) * eased);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }

        // Use IntersectionObserver to trigger when visible
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(step);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.3 });
        obs.observe(el);
    });
}

// Expose functions globally for backward compatibility
window.openVirtualDate = openVirtualDate;
window.initRatingPopup = initRatingPopup;
window.animateStatCounters = animateStatCounters;

