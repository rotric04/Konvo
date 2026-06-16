/**
 * KONVO™ LANDING PAGE FEATURE
 * src/features/landing/landing.js
 *
 * Handles all public, unauthenticated landing page interactivity.
 */

// ─── Module State ──────────────────────────────────────────────────────────────
let landingSugRating = 0;
let _demoInterval = null;

// ─── Scroll-driven Reveal Animation ──────────────────────────────────────────────
export function initScrollReveal() {
    const targets = document.querySelectorAll('.card, .landing-section, .problem-card, .pipeline-step, .faq-item');
    targets.forEach(t => t.classList.add('reveal-on-scroll'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

// ─── Animated Stats Counters ────────────────────────────────────────────────────
export function animateStatCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    counters.forEach(el => {
        const target = parseInt(el.dataset.countTo);
        const duration = parseInt(el.dataset.countDuration) || 2000;
        const suffix = el.dataset.countSuffix || '';
        const prefix = el.dataset.countPrefix || '';
        let start = null;

        function step(ts) {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.floor(0 + (target - 0) * eased);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }

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

// ─── Agent Live Preview (Landing Auto-Animation) ───────────────────────────────
export function initAgentLivePreview() {
    const body = document.getElementById('agent-preview-body');
    if (!body) return;

    const conversation = [
        { role: 'a', text: 'Hey! Your profile caught my eye — specifically the love for jazz and late-night bookstores.' },
        { role: 'b', text: 'Oh nice, your twin has good taste! What else does my profile say about me?' },
        { role: 'a', text: 'That you value depth over small talk, you\'re an INFP, and Thursdays are your favorite day.' },
        { role: 'b', text: 'Okay that\'s scarily accurate. What\'s the compatibility score saying?' },
        { role: 'a', text: 'Currently at 87% and climbing. The resonance on creative pursuits is off the charts.' },
        { role: 'b', text: 'I\'m going to let my human know. This one might be worth a real conversation.' },
        { role: 'a', text: 'Agreed. Initiating mutual approval request... ✨' },
    ];

    let idx = 0;
    function addMessage() {
        if (!document.getElementById('agent-preview-body')) return; // Exit if navigated away
        if (idx >= conversation.length) { idx = 0; body.innerHTML = ''; }
        const msg = conversation[idx++];
        const div = document.createElement('div');
        div.className = `agent-msg agent-${msg.role}`;
        div.innerHTML = `<div class="agent-msg-dot ${msg.role}">${msg.role.toUpperCase()}</div><div class="agent-msg-text">${msg.text}</div>`;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
        setTimeout(addMessage, 2000 + Math.random() * 1000);
    }
    setTimeout(addMessage, 800);
}

// ─── Cookie Consent Banner & Preferences ────────────────────────────────────────
export function initCookieConsent() {
    const banner = document.getElementById('cookie-consent-banner');
    const btnAcceptAll = document.getElementById('btn-cookie-accept-all');
    const btnPreferences = document.getElementById('btn-cookie-preferences');
    const btnSavePrefs = document.getElementById('btn-cookie-save-prefs');

    if (!banner) return;

    // Show banner if user hasn't accepted yet
    if (!localStorage.getItem('konvo_cookies_accepted')) {
        setTimeout(() => { banner.classList.add('active'); }, 1500);
    }

    if (btnAcceptAll) {
        btnAcceptAll.addEventListener('click', () => {
            localStorage.setItem('konvo_cookies_accepted', 'all');
            localStorage.setItem('konvo_cookies_analytics', 'true');
            localStorage.setItem('konvo_cookies_functional', 'true');
            banner.classList.remove('active');
        });
    }

    if (btnPreferences) {
        btnPreferences.addEventListener('click', () => {
            window.konvoOpenModal?.('cookie-preferences-modal');
        });
    }

    if (btnSavePrefs) {
        btnSavePrefs.addEventListener('click', () => {
            const analytics = document.getElementById('cookie-pref-analytics')?.checked ? 'true' : 'false';
            const functional = document.getElementById('cookie-pref-functional')?.checked ? 'true' : 'false';
            localStorage.setItem('konvo_cookies_accepted', 'custom');
            localStorage.setItem('konvo_cookies_analytics', analytics);
            localStorage.setItem('konvo_cookies_functional', functional);
            window.konvoCloseModal?.('cookie-preferences-modal');
            banner.classList.remove('active');
        });
    }
}

// ─── Interactive User Guide ──────────────────────────────────────────────────────
export function initUserGuideTabs() {
    const tabButtons = document.querySelectorAll('.guide-tabs button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.guide-content-pane').forEach(pane => {
                pane.classList.add('hidden');
                pane.style.display = 'none';
            });

            const targetId = btn.dataset.guideTab;
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.style.display = 'block';
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(targetPane, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
                }
            }
        });
    });
}

// ─── Landing Page Interactive Setup ──────────────────────────────────────────────
export function initLandingPage() {
    // 1. Mobile Menu Drawer Toggle
    const header = document.querySelector('.landing-header');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const drawerLinks = document.querySelectorAll('.mobile-menu-drawer .landing-tab-btn');

    if (menuToggle && header) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            header.classList.toggle('menu-open');
        });

        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                header.classList.remove('menu-open');
            });
        });

        document.addEventListener('click', (e) => {
            if (header.classList.contains('menu-open') && !header.contains(e.target)) {
                header.classList.remove('menu-open');
            }
        });
    }

    // 2. Global Anchor Scroll & Tab Routing Helper
    function navigateToLandingSection(hash) {
        if (!hash) return;
        const targetId = hash.replace('#', '');
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;

        const tabContent = targetElement.closest('.landing-tab-content');
        if (tabContent) {
            const tabId = tabContent.id;

            const tabBtns = document.querySelectorAll('.landing-tab-btn');
            tabBtns.forEach(el => {
                if (el.dataset.tab === tabId) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });

            document.querySelectorAll('.landing-tab-content').forEach(content => {
                if (content.id === tabId) {
                    content.classList.remove('hidden');
                    content.style.display = 'block';
                } else {
                    content.classList.add('hidden');
                    content.style.display = 'none';
                }
            });

            if (window.location.hash !== hash) {
                window.history.replaceState(null, null, hash);
            }

            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }

    // 3. Tab Button Click Listeners
    const tabBtns = document.querySelectorAll('.landing-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;

            tabBtns.forEach(el => el.classList.remove('active'));
            document.querySelectorAll(`.landing-tab-btn[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));

            document.querySelectorAll('.landing-tab-content').forEach(content => {
                if (content.id === tabId) {
                    content.classList.remove('hidden');
                    content.style.display = 'block';
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo(content, { opacity: 0, scale: 0.98, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' });
                    }
                } else {
                    content.classList.add('hidden');
                    content.style.display = 'none';
                }
            });

            const hashName = `#${tabId.replace('landing-', '')}`;
            window.history.replaceState(null, null, hashName);
        });
    });

    // 3.5. Feedback Sub-tab switcher
    const feedbackTabsContainer = document.getElementById('landing-feedback-tabs');
    if (feedbackTabsContainer) {
        feedbackTabsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const subtab = btn.dataset.subtab;
            feedbackTabsContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.landing-feedback-form-pane').forEach(p => {
                p.style.display = 'none';
            });
            const activePane = document.getElementById('landing-form-' + subtab);
            if (activePane) {
                activePane.style.display = 'block';
            }
        });
    }

    // Severity Button Listeners
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.severity-btns button');
        if (!btn) return;
        const parent = btn.closest('.severity-btns');
        if (parent && parent.id && parent.id.startsWith('landing-')) {
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });

    // 4. Intercept clicks on links pointing to hashes
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target) {
            const href = target.getAttribute('href');
            if (href && href.includes('#')) {
                const unauthLayout = document.getElementById('unauth-landing-layout');
                if (unauthLayout && !unauthLayout.classList.contains('hidden')) {
                    const hash = href.substring(href.indexOf('#'));
                    e.preventDefault();
                    navigateToLandingSection(hash);
                }
            }
        }
    });

    // 5. Initial Routing from page load
    const hash = window.location.hash;
    if (hash) {
        navigateToLandingSection(hash);
    }
}

// ─── Feedback Submission Helpers ──────────────────────────────────────────────────
export function toggleLandingTag(btn) {
    btn.classList.toggle('active');
    btn.classList.toggle('btn-primary');
    btn.classList.toggle('btn-secondary');
}

export function setLandingSugRating(val) {
    landingSugRating = val;
    document.querySelectorAll('#landing-sug-rating-row .star-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i < val);
        btn.classList.toggle('btn-primary', i < val);
        btn.classList.toggle('btn-secondary', !(i < val));
    });
}

export function submitLandingFeedback(type) {
    const data = { type, timestamp: new Date().toISOString() };
    if (type === 'bug') {
        data.title = document.getElementById('landing-bug-title').value;
        data.severity = document.querySelector('#landing-severity-group .active')?.dataset.severity || 'major';
        data.description = document.getElementById('landing-bug-desc').value;
        data.steps = document.getElementById('landing-bug-steps').value;
        data.page = document.getElementById('landing-bug-page').value;
        data.browser = document.getElementById('landing-bug-browser').value;
        data.email = document.getElementById('landing-bug-email').value;
        if (!data.title || !data.description) { alert('Please fill in the title and description.'); return; }
    } else if (type === 'feature') {
        data.title = document.getElementById('landing-feat-title').value;
        data.priority = document.querySelector('#landing-priority-group .active')?.dataset.priority || 'medium';
        data.description = document.getElementById('landing-feat-desc').value;
        data.usecase = document.getElementById('landing-feat-usecase').value;
        data.category = document.getElementById('landing-feat-category').value;
        data.email = document.getElementById('landing-feat-email').value;
        if (!data.title || !data.description) { alert('Please fill in the title and description.'); return; }
    } else {
        data.title = document.getElementById('landing-sug-title').value;
        data.tags = Array.from(document.querySelectorAll('#landing-sug-tags button.active')).map(b => b.dataset.tag);
        data.message = document.getElementById('landing-sug-message').value;
        data.rating = landingSugRating;
        data.email = document.getElementById('landing-sug-email').value;
        if (!data.message) { alert('Please write your suggestion.'); return; }
    }

    // Submit to anonymous backend API
    try {
        fetch('/api/feedback/anonymous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(() => { });
    } catch (e) { }

    // Submit to FormSubmit.co via AJAX
    try {
        fetch('https://formsubmit.co/ajax/mohit.info.83@gmail.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `Konvo Landing Feedback [${type.toUpperCase()}] - ${data.title || 'General Suggestion'}`,
                ...data
            })
        }).catch(() => { });
    } catch (e) { }

    // Show success state
    document.querySelectorAll('.landing-feedback-form-pane').forEach(f => f.style.display = 'none');
    document.getElementById('landing-feedback-tabs').style.display = 'none';
    const successEl = document.getElementById('landing-feedback-success');
    successEl.style.display = 'block';
    successEl.scrollIntoView({ behavior: 'smooth' });
}

export function resetLandingFeedback() {
    document.getElementById('landing-feedback-success').style.display = 'none';
    document.getElementById('landing-feedback-tabs').style.display = 'flex';
    document.getElementById('landing-form-bug').style.display = 'block';

    // Reset inputs
    document.getElementById('landing-bug-title').value = '';
    document.getElementById('landing-bug-desc').value = '';
    document.getElementById('landing-bug-steps').value = '';
    document.getElementById('landing-bug-page').selectedIndex = 0;
    document.getElementById('landing-bug-browser').value = '';
    document.getElementById('landing-bug-email').value = '';

    document.getElementById('landing-feat-title').value = '';
    document.getElementById('landing-feat-desc').value = '';
    document.getElementById('landing-feat-usecase').value = '';
    document.getElementById('landing-feat-category').selectedIndex = 0;
    document.getElementById('landing-feat-email').value = '';

    document.getElementById('landing-sug-title').value = '';
    document.getElementById('landing-sug-message').value = '';
    document.getElementById('landing-sug-email').value = '';
    landingSugRating = 0;
    document.querySelectorAll('#landing-sug-rating-row .star-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#landing-sug-tags button').forEach(b => {
        if (b.dataset.tag === 'matching') {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    document.querySelectorAll('#landing-feedback-tabs button').forEach((b, i) => {
        b.classList.toggle('active', i === 0);
    });
}

// ─── Demo Modal Twin Conversation Simulator ──────────────────────────────────────
export function initDemoModal() {
    const demoConversation = [
        { role: 'a', name: 'Aria (Twin-A)', text: 'Initiating compatibility scan… Behavioral profile Alpha loaded.' },
        { role: 'b', name: 'Orion (Twin-B)', text: 'Profile Beta confirmed. Running resonance calibration across 14 dimensions.' },
        { role: 'a', name: 'Aria (Twin-A)', text: 'Detected shared affinity: jazz, late-night bookstores, and deep conversation. Synergy index rising…' },
        { role: 'b', name: 'Orion (Twin-B)', text: 'Confirmed. Creative output index: 94%. Emotional availability score: 87%. This is a strong signal.' },
        { role: 'a', name: 'Aria (Twin-A)', text: 'Running conflict-resolution simulation… Result: both nodes default to calm dialogue. No friction detected.' },
        { role: 'b', name: 'Orion (Twin-B)', text: 'Values alignment - honesty, growth, and humor. Compatible MBTI pairing: INFP × ENFJ. Rare resonance.' },
        { role: 'a', name: 'Aria (Twin-A)', text: 'Compatibility score now at 91% and climbing. Initiating dual-approval handshake protocol…' },
        { role: 'b', name: 'Orion (Twin-B)', text: 'Approval request transmitted to human node Beta. Awaiting confirmation.' },
        { role: 'a', name: 'Aria (Twin-A)', text: '✅ Both nodes have approved. Secure human-to-human chat tunnel is now unlocked. ✨' },
    ];

    function startDemoAnimation(historyEl) {
        if (!historyEl) return;
        historyEl.innerHTML = '';
        if (_demoInterval) clearInterval(_demoInterval);
        let idx = 0;

        function appendMessage() {
            if (idx >= demoConversation.length) {
                // Pause then restart loop
                setTimeout(() => {
                    if (document.getElementById('demo-chat-history')) startDemoAnimation(historyEl);
                }, 3500);
                return;
            }
            const msg = demoConversation[idx++];
            const div = document.createElement('div');
            const isA = msg.role === 'a';
            div.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: ${isA ? 'flex-start' : 'flex-end'};
                margin-bottom: 1rem;
                animation: fadeInUp 0.4s ease both;
            `;
            div.innerHTML = `
                <div style="font-size:0.7rem;color:${isA ? 'var(--accent-teal)' : 'var(--accent-indigo)'};font-family:var(--font-mono);margin-bottom:0.2rem;">
                    ${isA ? '🤖' : '🤖'} ${msg.name}
                </div>
                <div style="
                    background: ${isA ? 'rgba(13,148,136,0.12)' : 'rgba(79,70,229,0.12)'};
                    border: 1px solid ${isA ? 'rgba(13,148,136,0.3)' : 'rgba(79,70,229,0.3)'};
                    border-radius: ${isA ? '4px 16px 16px 16px' : '16px 4px 16px 16px'};
                    padding: 0.6rem 0.9rem;
                    font-size: 0.82rem;
                    line-height: 1.5;
                    color: var(--text-primary);
                    max-width: 85%;
                    word-break: break-word;
                ">${msg.text}</div>
            `;
            historyEl.appendChild(div);
            historyEl.scrollTop = historyEl.scrollHeight;

            setTimeout(appendMessage, 1800 + Math.random() * 700);
        }

        // Typing indicator then first message
        const typingDiv = document.createElement('div');
        typingDiv.style.cssText = 'display:flex;align-items:center;gap:0.3rem;padding:0.4rem 0.6rem;font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);';
        typingDiv.innerHTML = '<span style="animation:pulse 1s infinite;">●</span><span style="animation:pulse 1s 0.3s infinite;">●</span><span style="animation:pulse 1s 0.6s infinite;">●</span>&nbsp;Agents initializing…';
        historyEl.appendChild(typingDiv);
        setTimeout(() => {
            typingDiv.remove();
            appendMessage();
        }, 1200);
    }

    // Watch for the demo modal opening
    const demoModal = document.getElementById('demo-modal');
    if (!demoModal) return;

    const observer = new MutationObserver(() => {
        if (demoModal.classList.contains('active')) {
            const historyEl = document.getElementById('demo-chat-history');
            if (historyEl && historyEl.childElementCount === 0) {
                startDemoAnimation(historyEl);
            }
        } else {
            // Stop when modal closes
            if (_demoInterval) { clearInterval(_demoInterval); _demoInterval = null; }
        }
    });
    observer.observe(demoModal, { attributes: true, attributeFilter: ['class'] });

    // Also support direct open
    const watchBtn = document.getElementById('btn-watch-demo');
    if (watchBtn) {
        watchBtn.addEventListener('click', () => {
            setTimeout(() => {
                const historyEl = document.getElementById('demo-chat-history');
                if (historyEl) startDemoAnimation(historyEl);
            }, 200);
        });
    }
}

// Make functions available globally for HTML event handlers
window.toggleLandingTag = toggleLandingTag;
window.setLandingSugRating = setLandingSugRating;
window.submitLandingFeedback = submitLandingFeedback;
window.resetLandingFeedback = resetLandingFeedback;
window.initLandingPage = initLandingPage;
window.initAgentLivePreview = initAgentLivePreview;
window.initDemoModal = initDemoModal;
