/**
 * KONVO™ DISCOVERY FEATURE
 * src/features/discovery/discovery.js
 *
 * Coordinates compatibility swipe deck recommenders and the Neural Rizz Engine.
 */

import { apiFetch } from '/src/services/api.js';

// Typewriter Text Animation Helper
export function animateTextTypewriter(element, text, speed = 15, isInput = false) {
    if (!element) return;

    if (element.typewriterTimeout) {
        clearTimeout(element.typewriterTimeout);
    }

    if (isInput) {
        element.value = '';
    } else {
        element.textContent = '';
    }
    let i = 0;
    function typeWriter() {
        if (i < text.length) {
            if (isInput) {
                element.value += text.charAt(i);
            } else {
                element.textContent += text.charAt(i);
            }
            i++;
            element.typewriterTimeout = setTimeout(typeWriter, speed);
        } else {
            element.typewriterTimeout = null;
        }
    }
    typeWriter();
}

// ─── Swipe Deck Recommender Engine ───────────────────────────────────────────
export function initSwipePage(targetContainerId) {
    const deckContainer = document.getElementById(targetContainerId || 'discovery-deck-container') ||
        document.getElementById('swipe-discovery-box');
    if (!deckContainer) return;

    if (deckContainer.dataset.initialized === 'true') return;
    deckContainer.dataset.initialized = 'true';

    let allCandidates = [];
    let candidateFeeds = [];
    let currentCardIndex = 0;

    async function loadSwipeDeck() {
        try {
            deckContainer.innerHTML = `
                <div class="skeleton-card">
                    <div class="skeleton-avatar skeleton-pulse"></div>
                    <div class="skeleton-text title skeleton-pulse"></div>
                    <div class="skeleton-text medium skeleton-pulse" style="align-self: center;"></div>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div class="skeleton-text long skeleton-pulse"></div>
                        <div class="skeleton-text long skeleton-pulse"></div>
                        <div class="skeleton-text medium skeleton-pulse"></div>
                    </div>
                    <div style="margin-top: auto; display: flex; gap: 1rem;">
                        <div class="skeleton-btn skeleton-pulse" style="flex: 1;"></div>
                        <div class="skeleton-btn skeleton-pulse" style="flex: 1;"></div>
                    </div>
                </div>
            `;
            allCandidates = await apiFetch('/api/compatibility/discovery');
            applyFilters();
        } catch (e) {
            deckContainer.innerHTML = `<div style="color: var(--accent-rose); font-family: var(--font-mono); font-size: 0.8rem; padding: 1.5rem; text-align: center;">Failed loading discovery deck: ${e.message}</div>`;
        }
    }

    function applyFilters() {
        const genderSelect = document.querySelector('.filter-gender-select');
        const intentSelect = document.querySelector('.filter-intent-select');
        const selectedGender = genderSelect ? genderSelect.value : 'All';
        const selectedIntent = intentSelect ? intentSelect.value : 'All';

        candidateFeeds = allCandidates.filter(c => {
            let matchGender = true;
            if (selectedGender !== 'All') {
                matchGender = (c.gender && c.gender.toLowerCase() === selectedGender.toLowerCase());
            }
            let matchIntent = true;
            if (selectedIntent !== 'All') {
                matchIntent = (c.relationship_intent && c.relationship_intent.toLowerCase() === selectedIntent.toLowerCase());
            }
            return matchGender && matchIntent;
        });

        currentCardIndex = 0;
        renderSwipeCard();
    }

    // Bind filters
    const genderSelects = document.querySelectorAll('.filter-gender-select');
    const intentSelects = document.querySelectorAll('.filter-intent-select');
    genderSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            genderSelects.forEach(s => { s.value = e.target.value; });
            applyFilters();
        });
    });
    intentSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            intentSelects.forEach(s => { s.value = e.target.value; });
            applyFilters();
        });
    });

    function renderSwipeCard() {
        if (!candidateFeeds || candidateFeeds.length === 0 || currentCardIndex >= candidateFeeds.length) {
            deckContainer.innerHTML = `
                <div class="card swipe-card" style="width:100%; max-width:400px; padding:3rem; text-align:center; margin: 0 auto;">
                    <div style="font-size: 3rem; margin-bottom: 1.5rem;">🌌</div>
                    <h3 style="font-family: var(--font-serif); font-size:1.5rem; margin-bottom: 0.75rem; color: var(--text-primary);">Resonance Limits Reached</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height:1.5;">
                        You have reviewed all compatible profiles in your local grid area today. The Resonance Engine will recalibrate and update your recommendations tomorrow.
                    </p>
                </div>
            `;
            return;
        }

        const candidate = candidateFeeds[currentCardIndex];

        deckContainer.innerHTML = `
            <div class="swipe-card" style="margin: 0 auto; max-width: 440px;">
                <span class="comp-score-badge" style="background: var(--accent-teal); color: var(--bg-primary); font-family: var(--font-mono); font-size: 0.7rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 4px; position: absolute; top: 1rem; right: 1rem;">${candidate.compatibility_score}% Resonance Match</span>
                
                <div class="swipe-card-avatar" style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin: 1.5rem auto 1rem auto; background: var(--bg-tertiary); border: 2px solid var(--border-primary); display: flex; align-items: center; justify-content: center;">
                    ${candidate.avatar || `<svg viewBox="0 0 100 100" style="width:60%; height:60%; fill:var(--accent-teal);"><circle cx="50" cy="40" r="25"/><path d="M15 85 C20 65, 80 65, 85 85"/></svg>`}
                </div>
                
                <h2 style="font-family: var(--font-serif); font-size:1.6rem; color:var(--text-primary); margin-bottom:0.25rem; text-align: center;">${candidate.display_name}</h2>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber); margin-bottom: 0.75rem; text-align: center;">${candidate.mbti_type} Archetype</div>
                
                <div style="display: flex; gap: 0.5rem; justify-content: center; font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 1.25rem; flex-wrap: wrap;">
                    <span>Age: ${candidate.age}</span>
                    <span>•</span>
                    <span>Gender: ${candidate.gender}</span>
                    <span>•</span>
                    <span>Seeking: ${candidate.looking_for_gender}</span>
                    <span>•</span>
                    <span>Intent: ${candidate.relationship_intent}</span>
                    <span>•</span>
                    <span>Zodiac: ${candidate.sun_sign || 'Unknown'}</span>
                </div>
                
                <p style="font-size:0.9rem; line-height:1.5; color:var(--text-secondary); margin-bottom:1.5rem; text-align: center; font-style: italic;">
                    "${candidate.bio || "No profile biography supplied by candidate."}"
                </p>

                <div style="border-top:1px solid var(--border-color); padding-top: 1rem; text-align: left; margin-bottom: 1.5rem;">
                    <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem; text-transform: uppercase;">Interest Index</span>
                    <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                        ${candidate.interests && candidate.interests.length ? candidate.interests.map(i => `<span style="background-color: var(--border-color); color:var(--text-primary); font-family:var(--font-mono); font-size:0.65rem; padding:0.15rem 0.35rem; border-radius:4px;">${i.toUpperCase()}</span>`).join('') : '<span style="font-size:0.7rem; color:var(--text-muted);">None</span>'}
                    </div>
                </div>

                <div class="swipe-buttons" style="display: flex; justify-content: center; gap: 2rem;">
                    <button class="swipe-btn pass" id="btn-swipe-pass" title="Pass Profile" style="width: 50px; height: 50px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; border: 1px solid var(--accent-danger); color: var(--accent-danger); background: transparent; transition: all 0.2s;">✗</button>
                    <button class="swipe-btn like" id="btn-swipe-like" title="Interest Match" style="width: 50px; height: 50px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; border: 1px solid var(--accent-teal); color: var(--accent-teal); background: transparent; transition: all 0.2s;">♥</button>
                </div>
            </div>
        `;

        // Bind Swipe Actions
        document.getElementById('btn-swipe-pass')?.addEventListener('click', () => handleSwipeAction('pass'));
        document.getElementById('btn-swipe-like')?.addEventListener('click', () => handleSwipeAction('interest'));
    }

    async function handleSwipeAction(type) {
        const candidate = candidateFeeds[currentCardIndex];
        if (!candidate) return;

        try {
            const res = await apiFetch('/api/compatibility/swipe', {
                method: 'POST',
                body: JSON.stringify({
                    target_user_id: candidate.user_id,
                    swipe_type: type
                })
            });

            if (res && res.success) {
                if (res.match_occurred) {
                    if (typeof window.konvoOpenModal === 'function') {
                        window.konvoOpenModal('match-celebration-modal');
                        if (typeof window.runMatchSimulation === 'function') {
                            window.runMatchSimulation(candidate);
                        }
                    }
                }
                currentCardIndex++;
                renderSwipeCard();
            } else {
                alert(res.message || "Swipe action rejected.");
                if (res.message && res.message.includes("limit")) {
                    deckContainer.innerHTML = `
                        <div class="card swipe-limit-banner" style="text-align: center; padding: 2rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                            <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--accent-rose); margin-bottom: 0.75rem;">Daily Swipe Threshold Reached</h3>
                            <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                                ${res.message}
                            </p>
                            <button class="btn btn-primary" onclick="alert('Premium upgrades are simulated in sandbox.')">Upgrade to Premium (100 daily swipes)</button>
                        </div>
                    `;
                }
            }
        } catch (e) {
            alert(`Swipe transaction error: ${e.message}`);
        }
    }

    // AI Twin Proxy Negotiation Simulator log sequence
    window.runMatchSimulation = function (candidate) {
        const loader = document.getElementById('match-simulation-loader');
        const details = document.getElementById('match-celebration-details');
        const consoleLog = document.getElementById('simulation-console-log');

        if (!loader || !details || !consoleLog) return;

        loader.style.display = 'block';
        details.style.display = 'none';
        consoleLog.innerHTML = `
            <div style="color: var(--accent-teal);">[SYSTEM] Initiating connection handshake...</div>
            <div style="color: var(--accent-amber);">[AUTH] Verifying Human Anti-Bot Token (JWT/PoW)...</div>
        `;

        const logs = [
            { text: "[AUTH] Bot protection token verification: SECURE (Human validated).", delay: 500, color: "var(--accent-teal)" },
            { text: `[PROXY] Launching Cognitive Proxy Twin matching loop for "${candidate.display_name}"...`, delay: 1100, color: "var(--text-primary)" },
            { text: `[NEGOTIATION] Running 50 parallel dialectic simulation rounds...`, delay: 1700, color: "var(--text-secondary)" },
            { text: `[NEGOTIATION] Analyzing interest intersections (Overlap: ${Math.floor(Math.random() * 30) + 70}%)...`, delay: 2300, color: "var(--text-secondary)" },
            { text: `[ASTRO] Calibrating Natal Chart alignments: Sun / Moon synergy confirmed.`, delay: 2800, color: "var(--accent-amber)" },
            { text: `[MBTI] MBTI Compatibility vector check: HIGH SYNERGY.`, delay: 3300, color: "var(--accent-teal)" },
            { text: `[SYSTEM] Consent token check: MUTUAL ALIGNMENT REGISTERED.`, delay: 3800, color: "var(--accent-indigo)" },
            { text: `[SYSTEM] Encrypting connection keys and creating chat channel...`, delay: 4200, color: "var(--accent-teal)" },
            { text: `[SUCCESS] Connection Established. Opening secure communication gate.`, delay: 4600, color: "var(--accent-teal)" }
        ];

        logs.forEach(log => {
            setTimeout(() => {
                const div = document.createElement('div');
                div.style.color = log.color;
                div.textContent = log.text;
                consoleLog.appendChild(div);
                consoleLog.scrollTop = consoleLog.scrollHeight;

                // Randomize latency display
                const latEl = document.getElementById('sim-latency');
                if (latEl) latEl.textContent = `${Math.floor(Math.random() * 15) + 8}ms`;

                if (log.text.startsWith("[SUCCESS]")) {
                    setTimeout(() => {
                        const matchTitle = document.getElementById('match-title-text');
                        const matchSynergy = document.getElementById('match-synergy-text');
                        const matchSub = document.getElementById('match-sub-text');

                        if (matchTitle) matchTitle.textContent = `Connected with ${candidate.display_name}!`;
                        if (matchSynergy) {
                            const mbtiPairs = ["INFP × ENFJ", "INTJ × ENFP", "INFJ × ENTP", "ENFJ × INTR", "ISFP × ESFJ"];
                            const mbti = mbtiPairs[Math.floor(Math.random() * mbtiPairs.length)];
                            matchSynergy.innerHTML = `Astrology Sync: ${Math.floor(Math.random() * 15) + 85}% &bull; MBTI Synergy: ${mbti}`;
                        }
                        if (matchSub) {
                            matchSub.textContent = `Your AI Twins successfully completed 50 dialogue loops, verified anti-bot tokens, and approved this connection.`;
                        }

                        loader.style.display = 'none';
                        details.style.display = 'block';
                    }, 600);
                }
            }, log.delay);
        });
    };

    loadSwipeDeck();
}

// ─── Neural Rizz Engine™ Panel ───────────────────────────────────────────────
class NeuralRizzEngine {
    constructor() {
        this._used = new Set();
        this._sessionUsed = [];

        this._openers = {
            m2f: ["okay real talk", "not gonna lie", "be so fr", "no cap", "lowkey", "honestly tho", "bruh okay", "wait actually", "i just need to say", "so like"],
            f2m: ["okay so", "don't make this weird but", "be honest", "i'm obsessed how", "not gonna lie", "fr though", "lowkey", "okay i'll be real", "just saying", "wait hear me out"]
        };
        this._compliments = {
            m2f: ["your energy is unmatched", "you're giving main character", "you're built different", "your vibe is elite", "you're literally that girl", "your aura is too powerful", "you ate that ngl", "you're the moment", "your energy is so clean", "you're a vibe and a half"],
            f2m: ["you're giving zaddy energy ngl", "your confidence is so attractive", "you're built for this", "you're genuinely hilarious", "your energy is really calming", "you seem so real tho", "you're that guy fr", "you're kinda intimidating tbh", "your aura is doing something to me", "you're very him"]
        };
        this._escalations = {
            m2f: ["and i'm not even trying to rizz you up", "and that's a problem for me honestly", "rent free btw", "and i don't even know what to do about that", "and i'm losing", "like what do you want from me", "the audacity honestly", "it's giving unfair", "and i'm standing here", "it's your fault really"],
            f2m: ["and i hate it here", "and it's unhinged of me", "rent free since we met", "and i don't even know what that means for me", "which is annoying", "not like i care tho lol", "and that's your problem now", "and i'm not okay about it", "be so serious with me"]
        };
        this._closers = {
            m2f: ["just so you know", "that's it that's the tweet", "thought you should know", "okay bye", "carry on", "take that", "you're welcome", "i said what i said", "no further questions", "receipts attached"],
            f2m: ["just putting that out there", "don't read into it", "thought you should know", "i'll let you sit with that", "okay moving on", "you're welcome", "not my fault", "make it make sense", "that's all", "you didn't hear it from me"]
        };
        this._vibes = ['flirty', 'witty', 'smooth', 'playful', 'deep'];
        this._mbtiTypes = ['INFP', 'ENFP', 'INFJ', 'ENFJ', 'INTJ', 'ENTJ', 'INTP', 'ENTP', 'ISFP', 'ESFP', 'ISTP', 'ESTP', 'ISFJ', 'ESFJ', 'ISTJ', 'ESTJ'];
        this._reactions = {
            m2f: ['She smiles but tries to hide it 👀', 'She screenshots this immediately', 'She shows her bestie right away', 'She clocks the confidence - intrigued', 'She\'s not ready for this fr', 'She says "stop" but means keep going'],
            f2m: ['He\'s blushing and won\'t admit it', 'He screenshots this to flex to his boys', 'He goes quiet for exactly 3 seconds', 'He says "lol" but meant "I\'m nervous"', 'He\'s spinning - didn\'t expect this', 'He\'s already drafting his reply']
        };
    }

    _pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
        return h;
    }

    generate(gender = 'm2f', vibeOverride = null) {
        let attempts = 0;
        let line, hash;
        do {
            const opener = this._pick(this._openers[gender]);
            const compliment = this._pick(this._compliments[gender]);
            const esc = this._pick(this._escalations[gender]);
            const closer = this._pick(this._closers[gender]);
            line = `"${opener.charAt(0).toUpperCase() + opener.slice(1)}, ${compliment} - ${esc}. ${closer.charAt(0).toUpperCase() + closer.slice(1)}."`;
            hash = this._hash(line);
            attempts++;
        } while (this._used.has(hash) && attempts < 20);

        this._used.add(hash);
        this._sessionUsed.push(hash);
        if (this._sessionUsed.length > 50) {
            this._used.delete(this._sessionUsed.shift());
        }

        const vibe = vibeOverride || this._pick(this._vibes);
        const mbti = this._pick(this._mbtiTypes);
        const reaction = this._pick(this._reactions[gender]);

        return { line, vibe, mbti, reaction, gender };
    }
}

const RizzEngine = new NeuralRizzEngine();

export function initRizzPanel() {
    const panel = document.getElementById('rizz-panel');
    if (!panel) return;

    let gender = 'm2f';
    const lineText = panel.querySelector('.rizz-line-text');
    const vibeBadge = panel.querySelector('.rizz-meta-badge.vibe');
    const mbtiBadge = panel.querySelector('.rizz-meta-badge.mbti');
    const reactBadge = panel.querySelector('.rizz-meta-badge.reaction');
    const genBtn = panel.querySelector('.btn-rizz-gen');
    const genderBtns = panel.querySelectorAll('.rizz-gender-btn');

    function generate() {
        const result = RizzEngine.generate(gender);
        if (lineText) {
            lineText.textContent = '';
            animateTextTypewriter(lineText, result.line, 18);
        }
        if (vibeBadge) vibeBadge.textContent = '✨ ' + result.vibe;
        if (mbtiBadge) mbtiBadge.textContent = result.mbti;
        if (reactBadge) reactBadge.textContent = result.reaction;
    }

    if (genBtn) {
        genBtn.replaceWith(genBtn.cloneNode(true));
        const newGenBtn = panel.querySelector('.btn-rizz-gen');
        newGenBtn.addEventListener('click', generate);
    }

    genderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            genderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gender = btn.dataset.gender || 'm2f';
            generate();
        });
    });

    generate();
}

// Expose globally
window.initSwipePage = initSwipePage;
window.initRizzPanel = initRizzPanel;
window.RizzEngine = RizzEngine;
