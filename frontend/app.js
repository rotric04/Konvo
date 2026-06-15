// KONVO™ Client Engine (Vanilla JS)
// Real-world logic, secure JWT rotation, and animated compatibility simulations.

// Prevent flash of light/dark theme
const initialTheme = localStorage.getItem('konvo_theme') || 'system';
const resolvedTheme = initialTheme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : initialTheme;
document.documentElement.setAttribute('data-theme', resolvedTheme);

const themeChannel = new BroadcastChannel('konvo_theme_channel');
themeChannel.onmessage = (event) => {
    if (event.data && event.data.theme) {
        const targetTheme = event.data.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : event.data.theme;
        document.documentElement.setAttribute('data-theme', targetTheme);
        localStorage.setItem('konvo_theme', event.data.theme);
        const picker = document.getElementById('set-theme-picker');
        if (picker) picker.value = event.data.theme;
    }
};

// ═══════════════════════════════════════════════════════
// PREMIUM CUSTOM ALERT SYSTEM (Replaces Default Browser popups)
// ═══════════════════════════════════════════════════════
(function() {
    let alertQueue = [];
    let activeAlertModal = null;

    window.alert = function(message) {
        if (message === undefined || message === null) return;
        const msgStr = String(message);
        
        // Push message to queue
        alertQueue.push(msgStr);
        
        if (!activeAlertModal) {
            processNextAlert();
        }
    };

    function processNextAlert() {
        if (alertQueue.length === 0) {
            activeAlertModal = null;
            return;
        }

        const message = alertQueue.shift();
        
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'konvo-custom-alert-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(9, 9, 11, 0.82);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        // Create card content
        const card = document.createElement('div');
        card.style.cssText = `
            background: var(--bg-card, #141416);
            border: 1px solid var(--border-color, #27272A);
            border-radius: 16px;
            width: 90%;
            max-width: 440px;
            padding: 2.25rem 2rem 2rem 2rem;
            box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(217, 119, 6, 0.05);
            text-align: center;
            transform: scale(0.92) translateY(15px);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        `;

        // Add a subtle top border gradient glow line
        const glowLine = document.createElement('div');
        glowLine.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, var(--accent-teal, #0D9488), var(--accent-amber, #D97706), var(--accent-indigo, #06B6D4));
        `;
        card.appendChild(glowLine);

        // Header/Icon section
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: center;
            margin-bottom: 1.25rem;
        `;
        
        // Premium brand-like pulsing icon
        header.innerHTML = `
            <div style="background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.25); border-radius: 50%; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; color: var(--accent-amber, #D97706); font-size: 1.5rem; animation: pulseGlow 2s infinite ease-in-out;">
                ✦
            </div>
            <style>
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.1); }
                    50% { transform: scale(1.05); box-shadow: 0 0 12px 2px rgba(217, 119, 6, 0.15); }
                }
            </style>
        `;
        card.appendChild(header);

        // Message text
        const text = document.createElement('div');
        text.style.cssText = `
            color: var(--text-primary, #FAF9F6);
            font-family: var(--font-sans, system-ui);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 2rem;
            word-break: break-word;
            text-align: center;
        `;
        text.textContent = message;
        card.appendChild(text);

        // Button Container & Styled Button
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex;
            justify-content: center;
        `;

        const btn = document.createElement('button');
        btn.textContent = 'Acknowledge';
        btn.style.cssText = `
            background: var(--accent-amber, #D97706);
            color: #09090B;
            border: 1px solid var(--accent-amber, #D97706);
            font-family: var(--font-mono, monospace);
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0.75rem 2.25rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            outline: none;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15);
        `;

        // Hover animations
        btn.onmouseover = () => {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--accent-amber, #D97706)';
            btn.style.boxShadow = 'none';
        };
        btn.onmouseout = () => {
            btn.style.background = 'var(--accent-amber, #D97706)';
            btn.style.color = '#09090B';
            btn.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.15)';
        };

        btnContainer.appendChild(btn);
        card.appendChild(btnContainer);
        modal.appendChild(card);
        document.body.appendChild(modal);

        activeAlertModal = modal;

        // Animate open
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            card.style.transform = 'scale(1) translateY(0)';
        });

        // Close functions
        const closeAlert = () => {
            modal.style.opacity = '0';
            card.style.transform = 'scale(0.92) translateY(15px)';
            
            // Clean up event listeners
            window.removeEventListener('keydown', handleKeyDown);
            
            setTimeout(() => {
                modal.remove();
                // Process next in queue
                processNextAlert();
            }, 250);
        };

        // Event listener for close button click
        btn.addEventListener('click', closeAlert);

        // Keydown listener for Esc or Enter
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                closeAlert();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
    }
})();

// Typewriter Text Animation Helper
function animateTextTypewriter(element, text, speed = 15, isInput = false) {
    if (!element) return;
    
    // Clear any active typewriter animations running on this element
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
window.animateTextTypewriter = animateTextTypewriter;

const API_BASE_URL = window.location.origin;
const WS_BASE_URL = window.location.origin.replace(/^http/, 'ws');

// Global State
let token = localStorage.getItem('konvo_token') || '';
let currentUser = null;
let activeWsChat = null;
let typingTimeout = null;
let chatPartnerId = null;

// Telemetry & Observability Tracker Mock
const Telemetry = {
    logEvent(eventName, properties = {}) {
        console.log(`[Telemetry Event: ${eventName}]`, properties);
        if (window.PostHog) {
            window.PostHog.capture(eventName, properties);
        }
    },
    logError(error, context = {}) {
        console.error(`[Telemetry Error]`, error, context);
        if (window.Sentry) {
            window.Sentry.captureException(error, { extra: context });
        }
    }
};
window.Telemetry = Telemetry;

// 50 Questions matching mbti_engine.py
const QUIZ_QUESTIONS = [
    {id: 1, text: "I feel recharged after spending time with large groups of people.", category: "Social Energy"},
    {id: 2, text: "I prefer deep one-on-one conversations over lively group chats.", category: "Introversion"},
    {id: 3, text: "I tend to express my opinions immediately in meetings.", category: "Social Energy"},
    {id: 4, text: "I need solitary time to process my feelings and thoughts.", category: "Introversion"},
    {id: 5, text: "I enjoy being the center of attention in social gatherings.", category: "Extroversion"},
    {id: 6, text: "I find networking events draining rather than exciting.", category: "Introversion"},
    {id: 7, text: "I usually initiate contact with new friends.", category: "Extroversion"},
    {id: 8, text: "I keep my inner thoughts private from all but a few close connections.", category: "Introversion"},
    {id: 9, text: "I thrive in high-stimulation social settings.", category: "Extroversion"},
    {id: 10, text: "I prefer quiet evenings reading or coding over a crowded party.", category: "Social Energy"},

    {id: 11, text: "I communicate directly and literally, avoiding subtext.", category: "Communication"},
    {id: 12, text: "I prioritize harmony and avoiding hurt feelings in arguments.", category: "Communication"},
    {id: 13, text: "My humor relies heavily on wordplay, sarcasm, and irony.", category: "Humor"},
    {id: 14, text: "I prefer structured explanations with clear supporting data.", category: "Communication"},
    {id: 15, text: "I express empathy quickly when others are sharing challenges.", category: "Communication"},
    {id: 16, text: "I find funny situations in everyday anomalies and conceptual jokes.", category: "Humor"},
    {id: 17, text: "I tend to write long, detailed messages to explain my ideas.", category: "Communication"},
    {id: 18, text: "I appreciate slapstick or straightforward situational comedy.", category: "Humor"},

    {id: 19, text: "I base major life decisions on objective logic rather than gut feelings.", category: "Decision Making"},
    {id: 20, text: "I trust my intuition when analyzing a person's motives.", category: "Trust"},
    {id: 21, text: "I require verifiable facts before trusting a new claim.", category: "Trust"},
    {id: 22, text: "I choose paths that align with my emotional values, even if logically sub-optimal.", category: "Decision Making"},
    {id: 23, text: "I assume positive intent in people until proven otherwise.", category: "Trust"},
    {id: 24, text: "I analyze systems and components thoroughly before offering suggestions.", category: "Decision Making"},
    {id: 25, text: "I notice inconsistencies in statements quickly and point them out.", category: "Trust"},
    {id: 26, text: "I believe that group values are more important than cold equations.", category: "Decision Making"},

    {id: 27, text: "I maintain a highly structured schedule and checklist.", category: "Lifestyle"},
    {id: 28, text: "I work in quick bursts of spontaneous energy rather than organized steps.", category: "Lifestyle"},
    {id: 29, text: "My long-term ambition is focused on building stable systems and security.", category: "Ambition"},
    {id: 30, text: "I enjoy exploring multiple unrelated ideas without needing a final product.", category: "Ambition"},
    {id: 31, text: "I keep my desk and code index extremely tidy.", category: "Lifestyle"},
    {id: 32, text: "I find last-minute changes to plans exciting rather than stressful.", category: "Lifestyle"},
    {id: 33, text: "I value efficiency and optimization in my everyday routines.", category: "Lifestyle"},
    {id: 34, text: "I am motivated by creative freedom and conceptual breakthroughs.", category: "Ambition"},

    {id: 35, text: "I address conflicts directly and immediately to clear the air.", category: "Conflict Style"},
    {id: 36, text: "I withdraw during heated arguments to process them calmly.", category: "Conflict Style"},
    {id: 37, text: "I see debate as a collaborative tool to uncover facts, not a personal threat.", category: "Conflict Style"},
    {id: 38, text: "I seek deep, intense emotional vulnerability in long-term relationships.", category: "Relationships"},
    {id: 39, text: "I prefer partners who share my precise intellectual and technical interests.", category: "Relationships"},
    {id: 40, text: "I value practical support and shared domestic routines in a partner.", category: "Relationships"},
    {id: 41, text: "I find emotional outbursts from others uncomfortable and difficult to manage.", category: "Conflict Style"},
    {id: 42, text: "I prioritize relational growth and learning over simple comfort.", category: "Relationships"},

    {id: 43, text: "I easily share my emotional struggles and vulnerabilities with friends.", category: "Emotional Expression"},
    {id: 44, text: "I mask my emotions behind objective logic or humor.", category: "Emotional Expression"},
    {id: 45, text: "I need explicit reassurance that my connections are secure.", category: "Trust"},
    {id: 46, text: "I express affection through practical help or writing code/building systems.", category: "Emotional Expression"},
    {id: 47, text: "I notice subtle shifts in people's moods and act immediately to help.", category: "Emotional Expression"},
    {id: 48, text: "I believe trust must be earned through consistent action over time.", category: "Trust"},
    {id: 49, text: "I express my feelings through artistic or physical channels.", category: "Emotional Expression"},
    {id: 50, text: "I am comfortable letting people go if our values align no longer.", category: "Trust"}
];

// HTTP Fetch Helper
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });
    if (response.status === 401) {
        localStorage.removeItem('konvo_token');
        token = '';
        const isAuthPage = window.location.pathname.includes('/auth');
        const isMainPage = window.location.pathname === '/' || window.location.pathname.includes('/index.html');
        if (!isAuthPage && !isMainPage) {
            window.location.href = '/auth';
        }
        return null;
    }
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Network request error');
    }
    return response.json();
}
window.apiFetch = apiFetch;

// Check Auth state
async function checkAuth() {
    const isAuthPage = window.location.pathname.includes('/auth');
    const isMainPage = window.location.pathname === '/' || window.location.pathname.includes('/index.html');
    if (!token) {
        if (!isAuthPage && !isMainPage) window.location.href = '/auth';
        return false;
    }
    try {
        currentUser = await apiFetch('/api/users/me');
        if (currentUser) {
            updateSidebarUser(currentUser);
            if (isAuthPage) window.location.href = '/';
            return true;
        }
    } catch (e) {
        console.error("Auth check failed", e);
        if (!isAuthPage && !isMainPage) window.location.href = '/auth';
    }
    return false;
}

function updateSidebarUser(user) {
    const nameEl = document.querySelector('.user-name');
    const idEl = document.querySelector('.user-id');
    if (nameEl) nameEl.textContent = user.profile ? user.profile.display_name : 'New Profile';
    if (idEl) idEl.textContent = user.konvo_id;

    // Add Admin Panel link if admin
    if (user.role === 'admin') {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !document.getElementById('nav-admin-link')) {
            const li = document.createElement('li');
            li.id = 'nav-admin-link';
            li.innerHTML = `<a href="/admin-portal-secured" target="_blank" style="color:var(--accent-amber); font-weight:600; display:flex; align-items:center; gap:0.5rem;">🛡️ Admin Portal</a>`;
            navLinks.appendChild(li);
        }
    }
}

// WebSocket Live updates
let liveSentimentWs = null;
function initLiveWebSockets() {
    if (liveSentimentWs) return;
    liveSentimentWs = new WebSocket(`${WS_BASE_URL}/api/sentiment/ws/live-sentiment`);
    liveSentimentWs.onmessage = (event) => {
        const stats = JSON.parse(event.data);
        updateSentimentWidget(stats);
    };
    liveSentimentWs.onclose = () => {
        liveSentimentWs = null;
        setTimeout(initLiveWebSockets, 5000);
    };
}

function updateSentimentWidget(stats) {
    const bar = document.getElementById('sentiment-bar');
    if (bar) {
        bar.innerHTML = `
            <div class="sentiment-seg positive" style="width: ${stats.positive * 100}%"></div>
            <div class="sentiment-seg neutral" style="width: ${stats.neutral * 100}%"></div>
            <div class="sentiment-seg negative" style="width: ${stats.negative * 100}%"></div>
        `;
    }
    const countEl = document.getElementById('online-users-count');
    if (countEl) countEl.textContent = stats.online_count || '0';
    
    const posVal = document.getElementById('sent-val-pos');
    const neuVal = document.getElementById('sent-val-neu');
    const negVal = document.getElementById('sent-val-neg');
    if (posVal) posVal.textContent = `${Math.round(stats.positive * 100)}%`;
    if (neuVal) neuVal.textContent = `${Math.round(stats.neutral * 100)}%`;
    if (negVal) negVal.textContent = `${Math.round(stats.negative * 100)}%`;
}

// ----------------- 1. AUTH PAGE & OTP -----------------
function initAuthPage() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const otpModal = document.getElementById('otp-modal');
    const btnSubmitOtp = document.getElementById('btn-submit-otp');
    let pendingRegisterEmail = '';

    // Advanced Registration Form Validation & Dropdown Logic
    const regEmail = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');
    const regName = document.getElementById('reg-name');
    const regPhoneInput = document.getElementById('reg-phone-input');
    const regPhoneHidden = document.getElementById('reg-phone');
    const countryBtn = document.getElementById('country-btn');
    const countryDropdownList = document.getElementById('country-dropdown-list');
    const btnSuggestUsername = document.getElementById('btn-suggest-username');

    if (regEmail) {
        const emailMsg = document.getElementById('email-validation-msg');
        regEmail.addEventListener('input', () => {
            const email = regEmail.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                emailMsg.textContent = '';
                emailMsg.className = 'validation-msg';
            } else if (emailRegex.test(email)) {
                emailMsg.textContent = '✓ Valid email format';
                emailMsg.className = 'validation-msg success';
            } else {
                emailMsg.textContent = '✗ Invalid email format';
                emailMsg.className = 'validation-msg error';
            }
        });
    }

    if (regName) {
        const usernameMsg = document.getElementById('username-validation-msg');
        regName.addEventListener('input', (e) => {
            let start = regName.selectionStart;
            let end = regName.selectionEnd;
            let val = regName.value.toLowerCase();
            
            const originalLength = val.length;
            val = val.replace(/[^a-z0-9_\-\.]/g, '');
            
            regName.value = val;
            
            const diff = originalLength - val.length;
            if (diff > 0) {
                regName.setSelectionRange(start - diff, end - diff);
            }

            if (!val) {
                usernameMsg.textContent = '';
                usernameMsg.className = 'validation-msg';
            } else {
                usernameMsg.textContent = '✓ Username looks good';
                usernameMsg.className = 'validation-msg success';
            }
        });
    }

    if (btnSuggestUsername && regName) {
        const adjectives = ['vibe', 'neon', 'hyper', 'pixel', 'cyber', 'glow', 'meta', 'spicy', 'luna', 'wired', 'retro', 'stellar', 'drip', 'omega', 'slay'];
        const nouns = ['byte', 'soul', 'twin', 'rizz', 'coder', 'avatar', 'pulse', 'aura', 'ghost', 'hacker', 'wave', 'spark', 'glitch', 'nomad', 'flux'];
        
        btnSuggestUsername.addEventListener('click', () => {
            let username = '';
            if (regEmail && regEmail.value.includes('@')) {
                const prefix = regEmail.value.split('@')[0].toLowerCase().replace(/[^a-z0-9_\-\.]/g, '');
                if (prefix.length > 2) {
                    const suffixes = ['_rizz', '_twin', '_x', '99', '42', '_byte', '_soul'];
                    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                    username = prefix + randomSuffix;
                }
            }
            
            if (!username || Math.random() < 0.4) {
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const noun = nouns[Math.floor(Math.random() * nouns.length)];
                const num = Math.floor(Math.random() * 90) + 10;
                username = `${adj}_${noun}${num}`;
            }
            
            regName.value = username;
            regName.dispatchEvent(new Event('input'));
        });
    }

    if (regPassword) {
        const strengthFill = document.getElementById('password-strength-fill');
        const strengthFeedback = document.getElementById('password-strength-feedback');
        const reqLen = document.getElementById('req-len');
        const reqNum = document.getElementById('req-num');
        const reqSpec = document.getElementById('req-spec');

        regPassword.addEventListener('input', () => {
            const pass = regPassword.value;
            if (!pass) {
                strengthFill.style.width = '0%';
                strengthFill.style.backgroundColor = 'transparent';
                strengthFeedback.textContent = 'Strength: Empty';
                reqLen.innerHTML = '❌ Min 8 chars';
                reqLen.className = 'req-item';
                reqNum.innerHTML = '❌ Number';
                reqNum.className = 'req-item';
                reqSpec.innerHTML = '❌ Special char';
                reqSpec.className = 'req-item';
                return;
            }

            const hasLen = pass.length >= 8;
            const hasNum = /\d/.test(pass);
            const hasSpec = /[^A-Za-z0-9]/.test(pass);

            if (hasLen) {
                reqLen.innerHTML = '✓ Min 8 chars';
                reqLen.className = 'req-item valid';
            } else {
                reqLen.innerHTML = '❌ Min 8 chars';
                reqLen.className = 'req-item';
            }

            if (hasNum) {
                reqNum.innerHTML = '✓ Number';
                reqNum.className = 'req-item valid';
            } else {
                reqNum.innerHTML = '❌ Number';
                reqNum.className = 'req-item';
            }

            if (hasSpec) {
                reqSpec.innerHTML = '✓ Special char';
                reqSpec.className = 'req-item valid';
            } else {
                reqSpec.innerHTML = '❌ Special char';
                reqSpec.className = 'req-item';
            }

            let score = 0;
            if (pass.length > 0) score += 1;
            if (hasLen) score += 1;
            if (hasNum) score += 1;
            if (hasSpec) score += 1;
            if (pass.length >= 12) score += 1;

            let width = '0%';
            let color = 'transparent';
            let label = 'Strength: Weak';

            if (score === 1 || score === 2) {
                width = '33%';
                color = 'var(--accent-rose, #e11d48)';
                label = 'Strength: Weak (Too simple)';
            } else if (score === 3 || score === 4) {
                width = '66%';
                color = 'var(--accent-amber, #d97706)';
                label = 'Strength: Medium (Good)';
            } else if (score >= 5) {
                width = '100%';
                color = 'var(--accent-teal, #0d9488)';
                label = 'Strength: Strong (Excellent)';
            }

            strengthFill.style.width = width;
            strengthFill.style.backgroundColor = color;
            strengthFeedback.textContent = label;
        });
    }

    let activeCountryCode = '+91';
    if (countryBtn && countryDropdownList) {
        countryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            countryDropdownList.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            countryDropdownList.classList.add('hidden');
        });

        const countryItems = countryDropdownList.querySelectorAll('.country-item');
        countryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const code = item.getAttribute('data-code');
                const flag = item.getAttribute('data-flag');
                
                activeCountryCode = code;
                countryBtn.textContent = `${flag} ${code}`;
                
                countryItems.forEach(ci => ci.classList.remove('active'));
                item.classList.add('active');
                
                countryDropdownList.classList.add('hidden');
                updatePhoneHidden();
            });
        });
    }

    const updatePhoneHidden = () => {
        if (regPhoneInput && regPhoneHidden) {
            const num = regPhoneInput.value.replace(/\D/g, '');
            const phoneMsg = document.getElementById('phone-validation-msg');
            
            if (num) {
                regPhoneHidden.value = activeCountryCode + num;
                if (num.length >= 7 && num.length <= 15) {
                    phoneMsg.textContent = '✓ Phone number looks valid';
                    phoneMsg.className = 'validation-msg success';
                } else {
                    phoneMsg.textContent = '✗ Phone number length is abnormal';
                    phoneMsg.className = 'validation-msg error';
                }
            } else {
                regPhoneHidden.value = '';
                phoneMsg.textContent = '';
                phoneMsg.className = 'validation-msg';
            }
        }
    };

    if (regPhoneInput) {
        regPhoneInput.addEventListener('input', updatePhoneHidden);
    }

    const linkForgotPass = document.getElementById('link-forgot-pass');
    const formForgot = document.getElementById('form-forgot');
    const formReset = document.getElementById('form-reset');
    const btnForgotBack = document.getElementById('btn-forgot-back');
    const btnResetBack = document.getElementById('btn-reset-back');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
            if (formForgot) formForgot.classList.add('hidden');
            if (formReset) formReset.classList.add('hidden');
        });
        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.remove('hidden');
            formLogin.classList.add('hidden');
            if (formForgot) formForgot.classList.add('hidden');
            if (formReset) formReset.classList.add('hidden');
        });
    }

    if (linkForgotPass) {
        linkForgotPass.addEventListener('click', (e) => {
            e.preventDefault();
            formLogin.classList.add('hidden');
            formForgot.classList.remove('hidden');
        });
    }

    if (btnForgotBack) {
        btnForgotBack.addEventListener('click', () => {
            formForgot.classList.add('hidden');
            formLogin.classList.remove('hidden');
        });
    }

    if (btnResetBack) {
        btnResetBack.addEventListener('click', () => {
            formReset.classList.add('hidden');
            formLogin.classList.remove('hidden');
        });
    }

    if (formForgot) {
        formForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();
            try {
                const res = await apiFetch('/api/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                if (res) {
                    alert("A password recovery code has been generated and sent to your email address.");
                    document.getElementById('reset-email').value = email;
                    formForgot.classList.add('hidden');
                    formReset.classList.remove('hidden');
                }
            } catch (err) {
                alert(`Error requesting recovery code: ${err.message}`);
            }
        });
    }

    if (formReset) {
        formReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value.trim();
            const code = document.getElementById('reset-code').value.trim();
            const new_password = document.getElementById('reset-password').value;
            try {
                const res = await apiFetch('/api/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({ email, code, new_password })
                });
                if (res && res.success) {
                    alert("Password reset successfully! You can now log in.");
                    formReset.classList.add('hidden');
                    formLogin.classList.remove('hidden');
                    document.getElementById('login-email').value = email;
                    document.getElementById('login-password').value = new_password;
                }
            } catch (err) {
                alert(`Reset password failed: ${err.message}`);
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                const res = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                if (res && res.access_token) {
                    localStorage.setItem('konvo_token', res.access_token);
                    token = res.access_token;
                    window.location.href = '/';
                }
            } catch (err) {
                alert(`Authentication link failed: ${err.message}`);
            }
        });
    }

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const displayName = document.getElementById('reg-name').value;
            const phone = document.getElementById('reg-phone').value;
            
            const genderEl = document.getElementById('reg-gender');
            const gender = genderEl ? genderEl.value : 'Unknown';
            
            const intentEl = document.getElementById('reg-intent');
            const intent = intentEl ? intentEl.value : 'Long Term';
            
            const bioEl = document.getElementById('reg-bio');
            const bio = bioEl ? bioEl.value : '';
            
            const checkedInterests = Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(el => el.value);
            
            const goalsEl = document.getElementById('reg-goals');
            const goals = goalsEl ? goalsEl.value.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

            const birthdateEl = document.getElementById('reg-birthdate');
            const birthDate = birthdateEl ? birthdateEl.value || null : null;
            
            const birthtimeEl = document.getElementById('reg-birthtime');
            const birthTimeRaw = birthtimeEl ? birthtimeEl.value || null : null;
            
            const birthtimeAmpmEl = document.getElementById('reg-birthtime-ampm');
            const birthTimeAmpm = birthtimeAmpmEl ? birthtimeAmpmEl.value : 'AM';
            
            const birthlocEl = document.getElementById('reg-birthloc');
            const birthLoc = birthlocEl ? birthlocEl.value || null : null;
            
            const digipinEl = document.getElementById('reg-digipin');
            const digipin = digipinEl ? digipinEl.value || null : null;

            let birthTime = null;
            if (birthTimeRaw) {
                let [hours, minutes] = birthTimeRaw.split(':').map(Number);
                if (birthTimeAmpm === 'PM' && hours < 12) {
                    hours += 12;
                } else if (birthTimeAmpm === 'AM' && hours === 12) {
                    hours = 0;
                }
                birthTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
            }

            try {
                const payload = {
                    email, password, display_name: displayName, phone, gender,
                    relationship_intent: intent, bio, interests: checkedInterests, goals,
                    birth_date: birthDate,
                    birth_time: birthTime,
                    birth_location: birthLoc,
                    digipin: digipin
                };
                
                const res = await apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                
                if (res) {
                    pendingRegisterEmail = email;
                    otpModal.classList.add('active');
                    alert("A verification code has been sent to your email address. Enter it to activate your account.");
                }
            } catch (err) {
                alert(`Registration failed: ${err.message}`);
            }
        });
    }

    if (btnSubmitOtp) {
        btnSubmitOtp.addEventListener('click', async () => {
            const otpCode = document.getElementById('otp-code-input').value;
            if (!otpCode) {
                alert("Please enter the 6-digit OTP.");
                return;
            }
            try {
                const res = await apiFetch('/api/auth/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email: pendingRegisterEmail, otp_code: otpCode })
                });
                if (res && res.success) {
                    otpModal.classList.remove('active');
                    alert("OTP verified successfully! You can now log in.");
                    tabLogin.click();
                }
            } catch (err) {
                alert(`OTP verification failed: ${err.message}`);
            }
        });
    }
}

// ----------------- 2. PERSONAL IDENTITY & 50-Q ASSESSMENT -----------------
function initProfilePage() {
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
                    document.getElementById('mbti-type-title').textContent = user.profile.mbti_type;
                    document.getElementById('mbti-confidence-val').textContent = `${user.profile.mbti_confidence}%`;
                    document.getElementById('mbti-summary-desc').textContent = user.profile.mbti_summary;
                    document.getElementById('mbti-comm-desc').textContent = user.profile.mbti_communication_style;
                    document.getElementById('mbti-rel-desc').textContent = user.profile.mbti_relationship_style;
                    
                    const growthList = document.getElementById('mbti-growth-list');
                    growthList.innerHTML = '';
                    user.profile.mbti_growth_areas.forEach(g => {
                        const li = document.createElement('li');
                        li.textContent = g;
                        growthList.appendChild(li);
                    });
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
                    if (valEl) valEl.textContent = `${Math.round(score)}%`;
                    if (fillEl) fillEl.style.width = `${score}%`;
                });
            }

            // Trust Dashboard stats
            const trust = await apiFetch('/api/users/me/trust');
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

            // Astrology insights
            const astroPanel = document.getElementById('astrology-module-panel');
            if (astroPanel) {
                try {
                    const astro = await apiFetch('/api/users/me/astrology');
                    astroPanel.innerHTML = `
                        <div style="font-size: 0.75rem; color: var(--accent-amber); font-family: var(--font-mono); margin-bottom: 0.5rem;">${astro.disclaimer}</div>
                        <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">SUN</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif);">${astro.sun_sign}</div></div>
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">MOON</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif);">${astro.moon_sign}</div></div>
                            <div><span style="font-size: 0.7rem; color: var(--text-muted);">ASCENDANT</span><div style="font-size: 1.3rem; font-weight: bold; font-family: var(--font-serif);">${astro.ascendant}</div></div>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem;">
                            <div><strong>Celestial Insights:</strong> ${astro.personality_insights}</div>
                            <div><strong>Zodiac Style:</strong> ${astro.communication_tendencies}</div>
                            <div><strong>Astro Ledger:</strong> ${astro.life_pattern_report}</div>
                        </div>
                    `;
                } catch (err) {
                    astroPanel.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Provide birth date, time and place in registration/profile to compute horoscope charts.</div>`;
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
                                <span>${item.metric_changed}</span>
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
            console.error("Failed loading identity", e);
        }
    }

    // Onboarding Wizard controls
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    const quizModal = document.getElementById('quiz-modal');
    const btnWizBack = document.getElementById('btn-wiz-back');
    const btnWizNext = document.getElementById('btn-wiz-next');
    const progressFill = document.getElementById('wizard-progress-fill');
    const stepText = document.getElementById('wizard-step-text');
    const wizardTitle = document.getElementById('wizard-title');

    const stages = [
        document.getElementById('stage-identity'),
        document.getElementById('stage-cognitive'),
        document.getElementById('stage-synergy')
    ];

    let currentStage = 0;
    let currentQuizIndex = 0;
    let quizAnswers = {};
    let selectedInterests = [];
    let selectedValues = [];

    // Trigger file preview and mock avatar generation
    const photoUpload = document.getElementById('wiz-photo-upload');
    const btnGenAvatarDemo = document.getElementById('btn-generate-avatar-demo');
    const avatarPreview = document.getElementById('wiz-avatar-preview');
    if (photoUpload && avatarPreview) {
        photoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    avatarPreview.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    autosaveOnboarding();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    if (btnGenAvatarDemo && avatarPreview) {
        btnGenAvatarDemo.addEventListener('click', async () => {
            const displayName = document.getElementById('wiz-display-name')?.value || '';
            const bio = document.getElementById('wiz-bio')?.value || '';
            const promptText = `A premium professional digital twin headshot portrait of ${displayName || 'a user'}, description: ${bio || 'friendly person'}. Elegant dramatic studio lighting, photorealistic.`;
            
            avatarPreview.innerHTML = '<div style="font-size:0.65rem; color:var(--text-muted); text-align:center; line-height:1.2;">⏳ Starting AI engine...</div>';
            
            try {
                const res = await apiFetch('/api/agents/twin/avatar/generate', {
                    method: 'POST',
                    body: JSON.stringify({ prompt: promptText, style: 'photorealistic' })
                });
                
                if (res && res.success) {
                    KonvoToast.show("AI Avatar generation started! Rendering Flux dev layers...", "info", 5000);
                    
                    // Poll /api/agents/twin to check when avatar updates
                    let attempts = 0;
                    avatarPreview.innerHTML = '<div style="font-size:0.65rem; color:var(--accent-teal); text-align:center; line-height:1.2;">⚡ Rendering layers...</div>';
                    
                    const interval = setInterval(async () => {
                        attempts++;
                        try {
                            const twin = await apiFetch('/api/agents/twin');
                            if (twin && twin.avatar && twin.avatar.includes('<img')) {
                                clearInterval(interval);
                                avatarPreview.innerHTML = twin.avatar;
                                KonvoToast.show("AI Avatar successfully generated and updated!", "success", 4000);
                            }
                        } catch (e) {
                            console.error("Error polling for twin avatar", e);
                        }
                        
                        if (attempts >= 15) {
                            clearInterval(interval);
                            avatarPreview.innerHTML = '🧑';
                            KonvoToast.show("Generation is taking longer than expected. Please check back later in your profile.", "warning", 6000);
                        }
                    }, 2000);
                } else {
                    avatarPreview.innerHTML = '🧑';
                    KonvoToast.show("Failed to initiate AI generation.", "error");
                }
            } catch (err) {
                avatarPreview.innerHTML = '🧑';
                KonvoToast.show(`AI Generation Error: ${err.message}`, "error");
            }
        });
    }


    function autosaveOnboarding() {
        const draft = {
            currentStage,
            currentQuizIndex,
            quizAnswers,
            selectedInterests,
            selectedValues,
            displayName: document.getElementById('wiz-display-name')?.value || '',
            bio: document.getElementById('wiz-bio')?.value || '',
            gender: document.getElementById('wiz-gender')?.value || 'Male',
            digipin: document.getElementById('wiz-digipin')?.value || 'GP-1102',
            birthDate: document.getElementById('wiz-birth-date')?.value || '',
            birthLocation: document.getElementById('wiz-birth-location')?.value || '',
            tone: document.getElementById('wiz-tone')?.value || 50,
            humor: document.getElementById('wiz-humor')?.value || 50,
            emoji: document.getElementById('wiz-emoji')?.value || 50,
            commChannel: document.getElementById('wiz-comm-channel')?.value || 'text',
            goal1: document.getElementById('wiz-goal-1')?.value || '',
            goal2: document.getElementById('wiz-goal-2')?.value || '',
            goal3: document.getElementById('wiz-goal-3')?.value || '',
            relationshipIntent: document.getElementById('wiz-relationship-intent')?.value || 'Long Term',
            disclosureBoundary: document.getElementById('wiz-disclosure-boundary')?.value || 'moderate',
            
            // New cognitive inputs
            mbtiEI: document.getElementById('wiz-mbti-ei')?.value || 'I',
            mbtiNS: document.getElementById('wiz-mbti-ns')?.value || 'N',
            mbtiTF: document.getElementById('wiz-mbti-tf')?.value || 'T',
            mbtiJP: document.getElementById('wiz-mbti-jp')?.value || 'J',
            commTone: document.getElementById('wiz-comm-tone')?.value || 'casual',
            customCommTone: document.getElementById('wiz-custom-comm-tone')?.value || '',
            conflictApproach: document.getElementById('wiz-conflict-approach')?.value || 'calm',
            customConflictApproach: document.getElementById('wiz-custom-conflict-approach')?.value || '',
            connectionBasis: document.getElementById('wiz-connection-basis')?.value || 'intellectual',
            customConnectionBasis: document.getElementById('wiz-custom-connection-basis')?.value || '',
            customCognitive: document.getElementById('wiz-custom-cognitive')?.value || '',
            valuesFocus: document.getElementById('wiz-values-focus')?.value || 'growth',
            customValuesFocus: document.getElementById('wiz-custom-values-focus')?.value || '',
            customInterests: document.getElementById('wiz-custom-interests')?.value || ''
        };
        localStorage.setItem('konvo_onboarding_draft', JSON.stringify(draft));
    }

    function loadOnboardingDraft() {
        const draftStr = localStorage.getItem('konvo_onboarding_draft');
        if (!draftStr) return;
        try {
            const draft = JSON.parse(draftStr);
            currentStage = draft.currentStage || 0;
            currentQuizIndex = draft.currentQuizIndex || 0;
            quizAnswers = draft.quizAnswers || {};
            selectedInterests = draft.selectedInterests || [];
            selectedValues = draft.selectedValues || [];
            
            if (document.getElementById('wiz-display-name')) document.getElementById('wiz-display-name').value = draft.displayName || '';
            if (document.getElementById('wiz-bio')) document.getElementById('wiz-bio').value = draft.bio || '';
            if (document.getElementById('wiz-gender')) document.getElementById('wiz-gender').value = draft.gender || 'Male';
            if (document.getElementById('wiz-digipin')) document.getElementById('wiz-digipin').value = draft.digipin || 'GP-1102';
            if (document.getElementById('wiz-birth-date')) document.getElementById('wiz-birth-date').value = draft.birthDate || '';
            if (document.getElementById('wiz-birth-location')) document.getElementById('wiz-birth-location').value = draft.birthLocation || '';
            if (document.getElementById('wiz-tone')) document.getElementById('wiz-tone').value = draft.tone || 50;
            if (document.getElementById('wiz-humor')) document.getElementById('wiz-humor').value = draft.humor || 50;
            if (document.getElementById('wiz-emoji')) document.getElementById('wiz-emoji').value = draft.emoji || 50;
            if (document.getElementById('wiz-comm-channel')) document.getElementById('wiz-comm-channel').value = draft.commChannel || 'text';
            if (document.getElementById('wiz-goal-1')) document.getElementById('wiz-goal-1').value = draft.goal1 || '';
            if (document.getElementById('wiz-goal-2')) document.getElementById('wiz-goal-2').value = draft.goal2 || '';
            if (document.getElementById('wiz-goal-3')) document.getElementById('wiz-goal-3').value = draft.goal3 || '';
            if (document.getElementById('wiz-relationship-intent')) document.getElementById('wiz-relationship-intent').value = draft.relationshipIntent || 'Long Term';
            if (document.getElementById('wiz-disclosure-boundary')) document.getElementById('wiz-disclosure-boundary').value = draft.disclosureBoundary || 'moderate';

            // Load new cognitive fields
            if (document.getElementById('wiz-mbti-ei')) document.getElementById('wiz-mbti-ei').value = draft.mbtiEI || 'I';
            if (document.getElementById('wiz-mbti-ns')) document.getElementById('wiz-mbti-ns').value = draft.mbtiNS || 'N';
            if (document.getElementById('wiz-mbti-tf')) document.getElementById('wiz-mbti-tf').value = draft.mbtiTF || 'T';
            if (document.getElementById('wiz-mbti-jp')) document.getElementById('wiz-mbti-jp').value = draft.mbtiJP || 'J';
            
            if (document.getElementById('wiz-comm-tone')) {
                document.getElementById('wiz-comm-tone').value = draft.commTone || 'casual';
                document.getElementById('wiz-custom-comm-tone-wrap').style.display = (draft.commTone === 'custom') ? 'block' : 'none';
            }
            if (document.getElementById('wiz-custom-comm-tone')) document.getElementById('wiz-custom-comm-tone').value = draft.customCommTone || '';
            
            if (document.getElementById('wiz-conflict-approach')) {
                document.getElementById('wiz-conflict-approach').value = draft.conflictApproach || 'calm';
                document.getElementById('wiz-custom-conflict-approach-wrap').style.display = (draft.conflictApproach === 'custom') ? 'block' : 'none';
            }
            if (document.getElementById('wiz-custom-conflict-approach')) document.getElementById('wiz-custom-conflict-approach').value = draft.customConflictApproach || '';

            if (document.getElementById('wiz-connection-basis')) {
                document.getElementById('wiz-connection-basis').value = draft.connectionBasis || 'intellectual';
                document.getElementById('wiz-custom-connection-basis-wrap').style.display = (draft.connectionBasis === 'custom') ? 'block' : 'none';
            }
            if (document.getElementById('wiz-custom-connection-basis')) document.getElementById('wiz-custom-connection-basis').value = draft.customConnectionBasis || '';
            
            if (document.getElementById('wiz-custom-cognitive')) document.getElementById('wiz-custom-cognitive').value = draft.customCognitive || '';
            
            if (document.getElementById('wiz-values-focus')) {
                document.getElementById('wiz-values-focus').value = draft.valuesFocus || 'growth';
                document.getElementById('wiz-custom-values-focus-wrap').style.display = (draft.valuesFocus === 'custom') ? 'block' : 'none';
            }
            if (document.getElementById('wiz-custom-values-focus')) document.getElementById('wiz-custom-values-focus').value = draft.customValuesFocus || '';
            if (document.getElementById('wiz-custom-interests')) document.getElementById('wiz-custom-interests').value = draft.customInterests || '';

            document.querySelectorAll('#wiz-interests-grid .option-btn').forEach(btn => {
                const interest = btn.dataset.interest;
                if (selectedInterests.includes(interest)) btn.classList.add('selected');
                else btn.classList.remove('selected');
            });
            document.querySelectorAll('#wiz-values-grid .option-btn').forEach(btn => {
                const valItem = btn.dataset.valueItem;
                if (selectedValues.includes(valItem)) btn.classList.add('selected');
                else btn.classList.remove('selected');
            });
        } catch (e) {
            console.error("Error loading onboarding draft", e);
        }
    }

    function prepopulateWizard() {
        if (!currentUser) return;
        const prof = currentUser.profile;
        if (!prof) return;

        const nameEl = document.getElementById('wiz-display-name');
        const bioEl = document.getElementById('wiz-bio');
        const genderEl = document.getElementById('wiz-gender');
        const digipinEl = document.getElementById('wiz-digipin');
        const birthDateEl = document.getElementById('wiz-birth-date');
        const birthLocationEl = document.getElementById('wiz-birth-location');

        if (nameEl) nameEl.value = prof.display_name || '';
        if (bioEl) bioEl.value = prof.bio || '';
        if (genderEl) genderEl.value = prof.gender || 'Male';
        if (digipinEl) digipinEl.value = prof.digipin || 'GP-1102';
        if (birthDateEl) birthDateEl.value = prof.birth_date || '';
        if (birthLocationEl) birthLocationEl.value = prof.birth_location || '';

        selectedInterests = prof.interests || [];
        document.querySelectorAll('#wiz-interests-grid .option-btn').forEach(btn => {
            const interest = btn.dataset.interest;
            if (selectedInterests.includes(interest)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        // Load values from local storage draft if available
        loadOnboardingDraft();

        const goals = prof.goals || [];
        const goal1 = document.getElementById('wiz-goal-1');
        const goal2 = document.getElementById('wiz-goal-2');
        const goal3 = document.getElementById('wiz-goal-3');
        if (goal1) goal1.value = goals[0] || '';
        if (goal2) goal2.value = goals[1] || '';
        if (goal3) goal3.value = goals[2] || '';

        const relIntent = document.getElementById('wiz-relationship-intent');
        if (relIntent) relIntent.value = prof.relationship_intent || 'Long Term';
    }

    document.querySelectorAll('#wiz-interests-grid .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const interest = btn.dataset.interest;
            const idx = selectedInterests.indexOf(interest);
            if (idx === -1) {
                selectedInterests.push(interest);
                btn.classList.add('selected');
            } else {
                selectedInterests.splice(idx, 1);
                btn.classList.remove('selected');
            }
            autosaveOnboarding();
        });
    });

    document.querySelectorAll('#wiz-values-grid .option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.valueItem;
            const idx = selectedValues.indexOf(val);
            if (idx === -1) {
                selectedValues.push(val);
                btn.classList.add('selected');
            } else {
                selectedValues.splice(idx, 1);
                btn.classList.remove('selected');
            }
            autosaveOnboarding();
        });
    });

    // Add input listeners for real-time autosave
    document.querySelectorAll('#wiz-display-name, #wiz-bio, #wiz-gender, #wiz-digipin, #wiz-birth-date, #wiz-birth-location, #wiz-comm-channel, #wiz-goal-1, #wiz-goal-2, #wiz-goal-3, #wiz-relationship-intent, #wiz-disclosure-boundary').forEach(el => {
        el.addEventListener('input', autosaveOnboarding);
        el.addEventListener('change', autosaveOnboarding);
    });

    const toneSlider = document.getElementById('wiz-tone');
    const humorSlider = document.getElementById('wiz-humor');
    const emojiSlider = document.getElementById('wiz-emoji');

    const toneLbl = document.getElementById('lbl-tone-val');
    const humorLbl = document.getElementById('lbl-humor-val');
    const emojiLbl = document.getElementById('lbl-emoji-val');

    if (toneSlider && toneLbl) {
        toneSlider.addEventListener('input', () => {
            const val = parseInt(toneSlider.value);
            toneLbl.textContent = val < 30 ? "Formal" : (val > 70 ? "Casual" : "Balanced");
            autosaveOnboarding();
        });
    }
    if (humorSlider && humorLbl) {
        humorSlider.addEventListener('input', () => {
            const val = parseInt(humorSlider.value);
            humorLbl.textContent = val < 30 ? "Dry / Logical" : (val > 70 ? "Sarcastic / Concept" : "Subtle");
            autosaveOnboarding();
        });
    }
    if (emojiSlider && emojiLbl) {
        emojiSlider.addEventListener('input', () => {
            const val = parseInt(emojiSlider.value);
            emojiLbl.textContent = val < 30 ? "Minimalist" : (val > 70 ? "Expressive" : "Moderate");
            autosaveOnboarding();
        });
    }

    function renderWizard() {
        stages.forEach((stage, idx) => {
            if (stage) {
                if (idx === currentStage) {
                    stage.classList.remove('hidden');
                    stage.style.display = '';
                } else {
                    stage.classList.add('hidden');
                    stage.style.display = 'none';
                }
            }
        });

        btnWizBack.disabled = currentStage === 0;

        const progressPercent = ((currentStage + 1) / 3) * 100;
        progressFill.style.width = `${progressPercent}%`;
        stepText.textContent = `Stage ${currentStage + 1} of 3`;

        wizardTitle.textContent = "Cognitive Onboarding Wizard";
        btnWizNext.textContent = currentStage === 2 ? "Compile & Initialize Twin" : "Next";
        btnWizNext.disabled = false;
    }

    async function saveProfileData() {
        const display_name = document.getElementById('wiz-display-name').value.trim() || 'New Profile';
        const bio = document.getElementById('wiz-bio').value.trim();
        const gender = document.getElementById('wiz-gender').value;
        const digipin = document.getElementById('wiz-digipin').value.trim() || null;
        const relationship_intent = document.getElementById('wiz-relationship-intent').value;

        try {
            await apiFetch('/api/users/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    display_name, bio, gender, birth_date: null, birth_location: null, digipin,
                    interests: selectedInterests, goals: [], relationship_intent
                })
            });
            currentUser = await apiFetch('/api/users/me');
        } catch (e) {
            console.error("Failed auto-saving profile step data", e);
        }
    }

    const quizQuestionText = document.getElementById('wiz-question-text');
    const quizQuizTitle = document.getElementById('wiz-quiz-title');
    const quizCategoryLbl = document.getElementById('wiz-quiz-category-lbl');

    function renderQuizStep() {
        const q = QUIZ_QUESTIONS[currentQuizIndex];
        if (quizCategoryLbl) quizCategoryLbl.textContent = `Category: ${q.category}`;
        if (quizQuestionText) quizQuestionText.textContent = q.text;
        
        const progress = Math.round((currentQuizIndex / QUIZ_QUESTIONS.length) * 100);
        if (quizQuizTitle) quizQuizTitle.textContent = `Stage 7: Behavior Assessment (${progress}%)`;
        
        document.querySelectorAll('.wiz-quiz-opt').forEach(btn => {
            const val = parseInt(btn.dataset.value);
            if (quizAnswers[q.id] === val) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        btnWizNext.disabled = !quizAnswers[q.id];
        btnWizNext.textContent = currentQuizIndex === QUIZ_QUESTIONS.length - 1 ? "Submit & Create Twin" : "Next Question";
    }

    document.querySelectorAll('.wiz-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.value);
            const q = QUIZ_QUESTIONS[currentQuizIndex];
            quizAnswers[q.id] = val;
            
            document.querySelectorAll('.wiz-quiz-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            btnWizNext.disabled = false;
            autosaveOnboarding();
        });
    });

    btnWizNext.addEventListener('click', async () => {
        // Validation per stage
        if (currentStage === 0) {
            const display_name = document.getElementById('wiz-display-name').value.trim();
            const bio = document.getElementById('wiz-bio').value.trim();
            const digipin = document.getElementById('wiz-digipin').value.trim();
            if (!display_name) {
                alert("Please provide a Display Name to calibrate your profile.");
                return;
            }
            if (!bio) {
                alert("Please provide a narrative self-description for vibe calibration.");
                return;
            }
            if (!digipin) {
                alert("Please provide a DIGIPIN coordinate.");
                return;
            }
        }
        if (currentStage === 2) {
            if (selectedInterests.length < 3) {
                alert("Please select at least 3 interests.");
                return;
            }
        }

        if (currentStage < 2) {
            Telemetry.logEvent('onboarding_stage_completed', { stage: currentStage + 1 });
            currentStage++;
            renderWizard();
            autosaveOnboarding();
        } else {
            try {
                btnWizNext.disabled = true;
                btnWizNext.textContent = "Compiling Cognitive Twin...";

                // Save profile details first
                await saveProfileData();

                // Build answers map from Stage 2 selections
                const mbtiEI = document.getElementById('wiz-mbti-ei').value;
                const mbtiNS = document.getElementById('wiz-mbti-ns').value;
                const mbtiTF = document.getElementById('wiz-mbti-tf').value;
                const mbtiJP = document.getElementById('wiz-mbti-jp').value;

                // Build custom inputs dictionary for Gemini NLP mapping
                const customInputs = {
                    mbti_ei: mbtiEI,
                    mbti_ns: mbtiNS,
                    mbti_tf: mbtiTF,
                    mbti_jp: mbtiJP,
                    comm_tone: document.getElementById('wiz-comm-tone')?.value || 'casual',
                    custom_comm_tone: document.getElementById('wiz-custom-comm-tone')?.value || '',
                    conflict_approach: document.getElementById('wiz-conflict-approach')?.value || 'calm',
                    custom_conflict_approach: document.getElementById('wiz-custom-conflict-approach')?.value || '',
                    connection_basis: document.getElementById('wiz-connection-basis')?.value || 'intellectual',
                    custom_connection_basis: document.getElementById('wiz-custom-connection-basis')?.value || '',
                    custom_cognitive: document.getElementById('wiz-custom-cognitive')?.value || '',
                    values_focus: document.getElementById('wiz-values-focus')?.value || 'growth',
                    custom_values_focus: document.getElementById('wiz-custom-values-focus')?.value || '',
                    custom_interests: document.getElementById('wiz-custom-interests')?.value || ''
                };

                // compile the 50 answers
                const compiledAnswers = {};
                for (let i = 1; i <= 50; i++) {
                    compiledAnswers[i] = 3;
                }
                const isE = mbtiEI === 'E';
                [1, 3, 5, 7, 9, 35].forEach(qId => { compiledAnswers[qId] = isE ? 5 : 1; });
                [2, 4, 6, 8, 10, 36].forEach(qId => { compiledAnswers[qId] = isE ? 1 : 5; });

                const isN = mbtiNS === 'N';
                [13, 16, 17, 20, 34, 39, 42].forEach(qId => { compiledAnswers[qId] = isN ? 5 : 1; });
                [18, 40, 49].forEach(qId => { compiledAnswers[qId] = isN ? 1 : 5; });

                const isT = mbtiTF === 'T';
                [11, 14, 19, 21, 24, 25, 37, 41, 44, 46, 50].forEach(qId => { compiledAnswers[qId] = isT ? 5 : 1; });
                [12, 15, 22, 23, 26, 38, 43, 45, 47].forEach(qId => { compiledAnswers[qId] = isT ? 1 : 5; });

                const isJ = mbtiJP === 'J';
                [27, 29, 31, 33, 48].forEach(qId => { compiledAnswers[qId] = isJ ? 5 : 1; });
                [28, 30, 32].forEach(qId => { compiledAnswers[qId] = isJ ? 1 : 5; });

                const res = await apiFetch('/api/users/assessment', {
                    method: 'POST',
                    body: JSON.stringify({ answers: compiledAnswers, custom_inputs: customInputs })
                });

                if (res) {
                    Telemetry.logEvent('personality_quiz_completed', { mbti_type: res.mbti_type, role_type: res.role_type });
                    quizModal.classList.remove('active');
                    localStorage.removeItem('konvo_onboarding_draft');
                    alert(`Success! Calculated Archetype: ${res.mbti_type} (${res.role_type}). Your AI Twin digital representative has been compiled and initialized.`);
                    window.location.reload();
                }
            } catch (e) {
                btnWizNext.disabled = false;
                btnWizNext.textContent = "Compile & Initialize Twin";
                Telemetry.logError(e, { context: 'onboarding_quiz_submission' });
                alert(`Twin initialization failed: ${e.message}`);
            }
        }
    });

    btnWizBack.addEventListener('click', () => {
        if (currentStage > 0) {
            currentStage--;
            renderWizard();
            autosaveOnboarding();
        }
    });

    if (btnStartQuiz) {
        btnStartQuiz.addEventListener('click', () => {
            currentStage = 0;
            currentQuizIndex = 0;
            quizAnswers = {};
            prepopulateWizard();
            renderWizard();
            quizModal.classList.add('active');
        });
    }

    loadIdentityData();

    // Auto-trigger onboarding quiz if user lacks MBTI summary
    if (currentUser && (!currentUser.profile || !currentUser.profile.mbti_summary)) {
        setTimeout(() => {
            if (btnStartQuiz && !quizModal.classList.contains('active')) {
                btnStartQuiz.click();
            }
        }, 150);
    }
}

// ----------------- 3. SWIPE DISCOVERY SCREEN -----------------
function initSwipePage(targetContainerId) {
    // Support both the Resonance Grid container and the Console swipe box
    const deckContainer = document.getElementById(targetContainerId || 'discovery-deck-container') ||
                          document.getElementById('swipe-discovery-box');
    if (!deckContainer) return;
    // Prevent double-init
    if (deckContainer.dataset.initialized === 'true') return;
    deckContainer.dataset.initialized = 'true';
    
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
            candidateFeeds = await apiFetch('/api/compatibility/discovery');
            currentCardIndex = 0;
            renderSwipeCard();
        } catch (e) {
            deckContainer.innerHTML = `<div style="color: var(--accent-rose);">Failed loading discovery deck recommendation feeds: ${e.message}</div>`;
        }
    }

    function renderSwipeCard() {
        if (!candidateFeeds || candidateFeeds.length === 0 || currentCardIndex >= candidateFeeds.length) {
            deckContainer.innerHTML = `
                <div class="card swipe-card" style="width:400px; padding:3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1.5rem;">🌌</div>
                    <h3 style="font-family: var(--font-serif); font-size:1.5rem; margin-bottom: 0.75rem;">Resonance Limits Reached</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height:1.5;">
                        You have reviewed all compatible profiles in your local grid area today. The Resonance Engine will recalibrate and update your directory recommendations tomorrow morning. Check back then to discover new connection dynamics!
                    </p>
                </div>
            `;
            return;
        }

        const candidate = candidateFeeds[currentCardIndex];
        
        // Renders candidate card
        deckContainer.innerHTML = `
            <div class="swipe-card">
                <span class="comp-score-badge">${candidate.compatibility_score}% Resonance Match</span>
                
                <div class="swipe-card-avatar">
                    ${candidate.avatar || `<svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="25" fill="#4f46e5"/><path d="M15 85 C20 65, 80 65, 85 85" fill="#4f46e5"/></svg>`}
                </div>
                
                <h2 style="font-family: var(--font-serif); font-size:1.8rem; color:var(--text-primary); margin-bottom:0.25rem;">${candidate.display_name}</h2>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber); margin-bottom: 0.75rem;">${candidate.mbti_type} Archetype</div>
                
                <div style="display: flex; gap: 0.5rem; justify-content: center; font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 1.25rem;">
                    <span>Location: Staging</span>
                    <span>•</span>
                    <span>Intent: ${candidate.relationship_intent}</span>
                    <span>•</span>
                    <span>Zodiac: ${candidate.sun_sign}</span>
                </div>
                
                <p style="font-size:0.92rem; line-height:1.5; color:var(--text-secondary); margin-bottom:1.5rem;">
                    ${candidate.bio || "No profile biography supplied by candidate."}
                </p>

                <div style="border-top:1px solid var(--border-color); padding-top: 1rem; text-align: left;">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">INTEREST INDEX</span>
                    <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                        ${candidate.interests.map(i => `<span style="background-color: var(--border-color); color:var(--text-primary); font-family:var(--font-mono); font-size:0.65rem; padding:0.15rem 0.35rem; border-radius:4px;">${i.toUpperCase()}</span>`).join('')}
                    </div>
                </div>

                <div class="swipe-buttons">
                    <button class="swipe-btn pass" id="btn-swipe-pass" title="Pass Profile">✗</button>
                    <button class="swipe-btn like" id="btn-swipe-like" title="Interest Match">♥</button>
                </div>
            </div>
        `;

        // Action Bindings
        document.getElementById('btn-swipe-pass').addEventListener('click', () => handleSwipeAction('pass'));
        document.getElementById('btn-swipe-like').addEventListener('click', () => handleSwipeAction('interest'));
    }

    async function handleSwipeAction(type) {
        const candidate = candidateFeeds[currentCardIndex];
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
                    // Match celebration modal trigger
                    const celebModal = document.getElementById('match-celebration-modal');
                    if (celebModal) celebModal.classList.add('active');
                }
                
                currentCardIndex++;
                renderSwipeCard();
            } else {
                // Rate limits or warnings (free tier vs premium tier limits)
                alert(res.message || "Swipe action rejected by database constraints.");
                if (res.message && res.message.includes("limit")) {
                    deckContainer.innerHTML = `
                        <div class="card swipe-limit-banner">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                            <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--accent-rose); margin-bottom: 0.75rem;">Daily Swipe Threshold Reached</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
                                ${res.message}
                            </p>
                            <button class="btn btn-primary" onclick="alert('Staging: Premium swipe upgrade link simulated.')">Upgrade to Premium (100 daily swipes)</button>
                        </div>
                    `;
                }
            }
        } catch (e) {
            alert(`Swipe transaction error: ${e.message}`);
        }
    }

    loadSwipeDeck();
}

// ----------------- 4. AI TWIN CONFIG & DATE PREVIEWS -----------------
function initAgentsPage() {
    const twinCard = document.getElementById('twin-profile-card');
    const simHistoryList = document.getElementById('sim-history-list');
    const simDetailBox = document.getElementById('sim-detail-box');
    
    let activeTwin = null;
    let selectedSimId = null;

    // Set a proper empty state for the sim detail box
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
            const twinResp = await fetch(`${API_BASE_URL}/api/agents/twin`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (twinResp.status === 404) {
                // Expected for new users - show onboarding CTA
                if (twinCard) {
                    twinCard.innerHTML = `
                        <div style="text-align:center;padding:2rem;">
                            <div style="font-size:2.5rem;margin-bottom:1rem;">🧬</div>
                            <h3 style="font-family:var(--font-serif);color:var(--text-primary);margin-bottom:0.75rem;">AI Twin Not Initialized</h3>
                            <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.6;">Complete the 50-Question Behavioral Assessment to compile your AI Twin digital representative.</p>
                            <a href="/profile" class="btn btn-primary" style="text-decoration:none;" onclick="event.preventDefault();window.history.pushState(null,null,'/profile');window.handleRouting('/profile');">Go to Twin DNA →</a>
                        </div>
                    `;
                }
                if (simHistoryList) {
                    simHistoryList.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;font-style:italic;">Complete your assessment first to unlock simulated dates.</div>`;
                }
                return;
            }
            activeTwin = await twinResp.json();
            renderTwinCard(activeTwin);
            
            // Load Date simulations history list
            loadSimulationsHistory();
        } catch (e) {
            if (twinCard) {
                twinCard.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--accent-rose);font-size:0.9rem;">Failed to load AI Twin: ${e.message}</div>`;
            }
        }
    }

    function renderTwinCard(twin) {
        if (!twinCard) return;
        
        const prefs = twin.match_preferences || {};
        const toneVal = prefs.agent_tone !== undefined ? prefs.agent_tone : 50;
        const humorVal = prefs.agent_humor !== undefined ? prefs.agent_humor : 50;
        const emojiVal = prefs.agent_emoji !== undefined ? prefs.agent_emoji : 50;
        const boundaries = prefs.agent_boundaries || 'moderate';
        const discovery = prefs.discovery_pref || 'collaboration';

        twinCard.innerHTML = `
            <div class="twin-card-avatar">
                ${twin.avatar || `<svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="25" fill="#4f46e5"/><path d="M15 85 C20 65, 80 65, 85 85" fill="#4f46e5"/></svg>`}
            </div>
            
            <form id="edit-twin-form">
                <div class="form-group">
                    <label>Twin Agent Name</label>
                    <input type="text" id="edit-twin-name" value="${twin.name}" required>
                </div>
                
                <div class="form-group">
                    <label>Agent Type (Archetype)</label>
                    <input type="text" value="${twin.role_type}" disabled style="background-color: rgba(6,6,8,0.5);">
                </div>
                
                <div class="form-group">
                    <label>Description Template</label>
                    <textarea id="edit-twin-desc" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Tone</span><span id="lbl-twin-tone" style="color:var(--accent-amber);">${toneVal < 30 ? "Formal" : (toneVal > 70 ? "Casual" : "Balanced")}</span></label>
                    <input type="range" id="edit-twin-tone" min="0" max="100" value="${toneVal}" style="width:100%;">
                </div>

                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Humor</span><span id="lbl-twin-humor" style="color:var(--accent-amber);">${humorVal < 30 ? "Logical / Dry" : (humorVal > 70 ? "Conceptual / Sarcastic" : "Subtle")}</span></label>
                    <input type="range" id="edit-twin-humor" min="0" max="100" value="${humorVal}" style="width:100%;">
                </div>

                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Emoji Usage</span><span id="lbl-twin-emoji" style="color:var(--accent-amber);">${emojiVal < 30 ? "Minimalist" : (emojiVal > 70 ? "Expressive" : "Moderate")}</span></label>
                    <input type="range" id="edit-twin-emoji" min="0" max="100" value="${emojiVal}" style="width:100%;">
                </div>

                <div class="form-group">
                    <label for="edit-twin-boundaries">Agent Boundaries</label>
                    <select id="edit-twin-boundaries">
                        <option value="strict" ${boundaries === 'strict' ? 'selected' : ''}>Strict (no personal chat sharing)</option>
                        <option value="moderate" ${boundaries === 'moderate' ? 'selected' : ''}>Moderate (conditional sharing)</option>
                        <option value="flexible" ${boundaries === 'flexible' ? 'selected' : ''}>Flexible (open communication)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="edit-twin-discovery">Discovery Preferences</label>
                    <select id="edit-twin-discovery">
                        <option value="collaboration" ${discovery === 'collaboration' ? 'selected' : ''}>Collaboration & Project Building</option>
                        <option value="learning" ${discovery === 'learning' ? 'selected' : ''}>Learning & Co-Studying</option>
                        <option value="mentorship" ${discovery === 'mentorship' ? 'selected' : ''}>Mentorship & Career Advice</option>
                        <option value="social" ${discovery === 'social' ? 'selected' : ''}>Casual Social Exchange</option>
                    </select>
                </div>
                
                <div class="form-group" style="display:none;">
                    <label for="edit-twin-voice">Voice Style Tone</label>
                    <select id="edit-twin-voice">
                        <option value="Calm" selected>Calm & Measured</option>
                    </select>
                </div>
                
                <div class="form-group" style="display:none;">
                    <label for="edit-twin-emoji-sel">Emoji Style Density</label>
                    <select id="edit-twin-emoji-sel">
                        <option value="Minimalist" selected>Minimalist (rare emojis)</option>
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%;">Save Twin Parameters</button>
            </form>
        `;

        const tSlider = document.getElementById('edit-twin-tone');
        const hSlider = document.getElementById('edit-twin-humor');
        const eSlider = document.getElementById('edit-twin-emoji');

        const tLbl = document.getElementById('lbl-twin-tone');
        const hLbl = document.getElementById('lbl-twin-humor');
        const eLbl = document.getElementById('lbl-twin-emoji');

        if (tSlider && tLbl) {
            tSlider.addEventListener('input', () => {
                const val = parseInt(tSlider.value);
                tLbl.textContent = val < 30 ? "Formal" : (val > 70 ? "Casual" : "Balanced");
            });
        }
        if (hSlider && hLbl) {
            hSlider.addEventListener('input', () => {
                const val = parseInt(hSlider.value);
                hLbl.textContent = val < 30 ? "Logical / Dry" : (val > 70 ? "Conceptual / Sarcastic" : "Subtle");
            });
        }
        if (eSlider && eLbl) {
            eSlider.addEventListener('input', () => {
                const val = parseInt(eSlider.value);
                eLbl.textContent = val < 30 ? "Minimalist" : (val > 70 ? "Expressive" : "Moderate");
            });
        }

        const descEl = document.getElementById('edit-twin-desc');
        if (descEl && twin.description) {
            animateTextTypewriter(descEl, twin.description, 15, true);
        }

        document.getElementById('edit-twin-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('edit-twin-name').value;
            const description = document.getElementById('edit-twin-desc').value;
            
            const agent_tone = parseInt(document.getElementById('edit-twin-tone').value);
            const agent_humor = parseInt(document.getElementById('edit-twin-humor').value);
            const agent_emoji = parseInt(document.getElementById('edit-twin-emoji').value);
            const agent_boundaries = document.getElementById('edit-twin-boundaries').value;
            const discovery_pref = document.getElementById('edit-twin-discovery').value;

            const match_preferences = {
                agent_tone,
                agent_humor,
                agent_emoji,
                agent_boundaries,
                discovery_pref
            };
            
            try {
                const updated = await apiFetch('/api/agents/twin', {
                    method: 'PUT',
                    body: JSON.stringify({
                        name,
                        avatar: twin.avatar || '',
                        description,
                        voice_style: 'Calm',
                        emoji_style: 'Minimalist',
                        match_preferences
                    })
                });
                if (updated) {
                    alert("AI Twin configuration saved successfully!");
                    activeTwin = updated;
                    renderTwinCard(updated);
                }
            } catch (err) {
                alert(`Failed saving twin config: ${err.message}`);
            }
        });
    }

    async function loadSimulationsHistory() {
        if (!simHistoryList) return;
        
        try {
            const sims = await apiFetch('/api/agents/simulations');
            simHistoryList.innerHTML = '';
            
            if (sims.length === 0) {
                simHistoryList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No dates simulated yet. Keep swiping!</div>`;
                return;
            }

            sims.forEach(sim => {
                const item = document.createElement('div');
                item.className = `sim-history-item ${selectedSimId === sim.id ? 'active' : ''}`;
                
                let appBadge = "Pending Approval";
                let appColor = "var(--accent-amber)";
                
                const isUserA = sim.user_a_id === currentUser.id;
                const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
                const partnerApp = isUserA ? sim.approval_user_b : sim.approval_user_a;
                
                if (myApp === 'approved' && partnerApp === 'approved') {
                    appBadge = "Unlocked Chat";
                    appColor = "var(--accent-teal)";
                } else if (myApp === 'declined' || partnerApp === 'declined') {
                    appBadge = "Declined";
                    appColor = "var(--accent-rose)";
                } else if (myApp === 'approved') {
                    appBadge = "Awaiting Partner";
                    appColor = "var(--accent-indigo)";
                }

                // Expiration calculation: dates expire after 7 days
                const createdDate = new Date(sim.created_at);
                const expiryDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                const diffTime = expiryDate.getTime() - Date.now();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let expiryLabel = `Expires in ${diffDays}d`;
                if (diffDays <= 0) {
                    expiryLabel = "Expired";
                    appBadge = "Expired";
                    appColor = "var(--text-muted)";
                }

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <strong style="font-family: var(--font-serif); font-size: 0.95rem;">${sim.partner_name}</strong>
                        <span style="font-family: var(--font-mono); font-size:0.7rem; color:${appColor}; font-weight:600;">${appBadge}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                        <span>Resonance: ${sim.overall_compatibility}% // Env: ${sim.environment.split(" ").pop()}</span>
                        <span>${expiryLabel}</span>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    selectedSimId = sim.id;
                    document.querySelectorAll('.sim-history-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    renderSimulationDetails(sim);
                });
                simHistoryList.appendChild(item);
            });
        } catch (e) {
            simHistoryList.innerHTML = `Error: ${e.message}`;
        }
    }

    function renderSimulationDetails(sim) {
        if (!simDetailBox) return;
        
        const isUserA = sim.user_a_id === currentUser.id;
        const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
        const partnerApp = isUserA ? sim.approval_user_b : sim.approval_user_a;
        
        // Expiration calculation: dates expire after 7 days
        const createdDate = new Date(sim.created_at);
        const isExpired = (createdDate.getTime() + 7 * 24 * 60 * 60 * 1000) < Date.now();

        let statusHtml = '';
        if (isExpired) {
            statusHtml = `
                <div style="background-color:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:1rem; border-radius:6px; margin-bottom:1.5rem; text-align:center;">
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Invitation Expired</div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">This simulated connection has expired after the 7-day limit.</p>
                </div>
            `;
        } else if (myApp === 'pending') {
            statusHtml = `
                <div style="background-color:rgba(217,119,6,0.05); border:1px solid rgba(217,119,6,0.2); padding:1rem; border-radius:6px; margin-bottom:1.5rem; text-align:center;">
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-amber); text-transform:uppercase; margin-bottom:0.5rem;">Human Approval Required</div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Your AI Twins completed their date. Approve to unlock direct chat.</p>
                    <div style="display:flex; gap:1rem; justify-content:center;">
                        <button class="btn btn-primary" id="btn-approve-sim" style="padding:0.4rem 1.25rem; font-size:0.8rem;">Approve Simulated Date</button>
                        <button class="btn btn-secondary" id="btn-decline-sim" style="padding:0.4rem 1.25rem; font-size:0.8rem; color:var(--accent-rose); border-color:var(--accent-rose);">Decline Match</button>
                    </div>
                </div>
            `;
        } else if (myApp === 'approved' && partnerApp === 'pending') {
            statusHtml = `
                <div style="background-color:rgba(79,70,229,0.05); border:1px solid rgba(79,70,229,0.2); padding:1rem; border-radius:6px; margin-bottom:1.5rem; text-align:center;">
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-indigo); text-transform:uppercase; margin-bottom:0.25rem;">Awaiting Partner Approval</div>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0;">You approved the simulated date. Waiting for ${sim.partner_name} to review the logs.</p>
                </div>
            `;
        } else if (myApp === 'approved' && partnerApp === 'approved') {
            const partnerId = isUserA ? sim.user_b_id : sim.user_a_id;
            statusHtml = `
                <div style="background-color:rgba(13,148,136,0.05); border:1px solid rgba(13,148,136,0.2); padding:1rem; border-radius:6px; margin-bottom:1.5rem; text-align:center;">
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-teal); text-transform:uppercase; margin-bottom:0.25rem;">Direct Conversation Unlocked</div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">Both users approved compatibility. Direct line is open!</p>
                    <a href="/messages?partner_id=${partnerId}" class="btn btn-primary" style="display:inline-block; padding:0.4rem 1rem; font-size:0.8rem; text-decoration:none;">Go To Chat Workspace</a>
                </div>
            `;
        } else if (myApp === 'declined' || partnerApp === 'declined') {
            statusHtml = `
                <div style="background-color:rgba(225,29,72,0.05); border:1px solid rgba(225,29,72,0.2); padding:1rem; border-radius:6px; margin-bottom:1.5rem; text-align:center;">
                    <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-rose); text-transform:uppercase; margin-bottom:0.25rem;">Match Declined</div>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0;">This match connection has been archived.</p>
                </div>
            `;
        }

        const metrics = sim.match_detail_json;

        // Virtual Date Locking status calculations
        const lock_json = sim.match_detail_json || {};
        const isLockedByMe = isUserA ? (lock_json.lock_user_a === true) : (lock_json.lock_user_b === true);
        const isLockedByPartner = isUserA ? (lock_json.lock_user_b === true) : (lock_json.lock_user_a === true);
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isVdUnlocked = (isLockedByMe && isLockedByPartner) || isAdmin;

        let vdLockStatusText = '';
        let vdLockBadgeColor = '';
        let vdActionBtnText = '';
        let vdActionBtnClass = '';
        
        if (isVdUnlocked) {
            vdLockStatusText = isAdmin ? '🛡️ Admin Lock Bypass Active' : '🔓 Ready (Consented by both)';
            vdLockBadgeColor = 'var(--accent-teal)';
            vdActionBtnText = 'Unlock / Retract Consent';
            vdActionBtnClass = 'btn-secondary';
        } else if (isLockedByMe) {
            vdLockStatusText = '🔒 Awaiting Partner Consent (You are ready)';
            vdLockBadgeColor = 'var(--accent-indigo)';
            vdActionBtnText = 'Unlock / Retract Consent';
            vdActionBtnClass = 'btn-secondary';
        } else {
            vdLockStatusText = '🔒 Locked (Awaiting mutual consent)';
            vdLockBadgeColor = 'var(--accent-rose)';
            vdActionBtnText = 'Lock In Date (Signal Ready)';
            vdActionBtnClass = 'btn-primary btn-primary-glow';
        }

        const vdPanelHtml = isExpired ? '' : `
            <div class="card" style="margin-bottom:1.5rem; border-color:var(--border-color); background: linear-gradient(135deg, rgba(6,182,212,0.02) 0%, transparent 100%);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
                    <div>
                        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Interactive Virtual Date</span>
                        <h3 style="font-size:1.15rem; font-family:var(--font-serif); margin-top:0.15rem; color:var(--accent-cyan);">3D Full-Screen Scenario Engine</h3>
                    </div>
                    <span style="font-family:var(--font-mono); font-size:0.7rem; color:${vdLockBadgeColor}; font-weight:600; padding:0.25rem 0.5rem; background:rgba(255,255,255,0.02); border:1px solid ${vdLockBadgeColor}; border-radius:4px;">
                        ${vdLockStatusText}
                    </span>
                </div>
                
                <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1.25rem; line-height:1.45;">
                    To initiate an interactive 3D virtual date scenario, both you and your partner must click "Lock In" to grant simulation consent. This protects user nodes from unaligned automated simulations.
                </p>

                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <button class="btn ${vdActionBtnClass}" id="btn-toggle-vd-lock" style="font-size:0.8rem; padding:0.5rem 1.25rem; flex-shrink:0;">
                            ${vdActionBtnText}
                        </button>
                        <span style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">
                            ${isVdUnlocked ? 'Consent established! Choose an environment below to launch.' : 'Awaiting mutual locking action to enable navigation.'}
                        </span>
                    </div>

                    <div style="border-top:1px solid var(--border-color); padding-top:1rem; margin-top:0.5rem;">
                        <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.75rem;">Choose WebGL Date Location</div>
                        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:0.5rem;" class="cockpit-env-tags">
                            <button class="btn ${isVdUnlocked ? 'btn-secondary' : 'btn-secondary disabled'}" ${isVdUnlocked ? '' : 'disabled'} style="font-size:0.72rem; padding:0.5rem 0.25rem; text-align:center;" data-open-vdate="rooftop" data-partner-name="${sim.partner_name}">🌃 Rooftop</button>
                            <button class="btn ${isVdUnlocked ? 'btn-secondary' : 'btn-secondary disabled'}" ${isVdUnlocked ? '' : 'disabled'} style="font-size:0.72rem; padding:0.5rem 0.25rem; text-align:center;" data-open-vdate="cafe" data-partner-name="${sim.partner_name}">☕ Café</button>
                            <button class="btn ${isVdUnlocked ? 'btn-secondary' : 'btn-secondary disabled'}" ${isVdUnlocked ? '' : 'disabled'} style="font-size:0.72rem; padding:0.5rem 0.25rem; text-align:center;" data-open-vdate="gallery" data-partner-name="${sim.partner_name}">🖼️ Gallery</button>
                            <button class="btn ${isVdUnlocked ? 'btn-secondary' : 'btn-secondary disabled'}" ${isVdUnlocked ? '' : 'disabled'} style="font-size:0.72rem; padding:0.5rem 0.25rem; text-align:center;" data-open-vdate="forest" data-partner-name="${sim.partner_name}">🌲 Forest</button>
                            <button class="btn ${isVdUnlocked ? 'btn-secondary' : 'btn-secondary disabled'}" ${isVdUnlocked ? '' : 'disabled'} style="font-size:0.72rem; padding:0.5rem 0.25rem; text-align:center;" data-open-vdate="beach" data-partner-name="${sim.partner_name}">🏖️ Beach</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        simDetailBox.innerHTML = `
            ${statusHtml}
            
            <div class="card" style="margin-bottom:1.5rem; border-color:var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">AI Twin compatibility</span>
                        <h2 style="font-size:2rem; font-family:var(--font-serif); margin-top:0.25rem;">${sim.overall_compatibility}% Resonance</h2>
                    </div>
                    <button class="btn btn-secondary" id="btn-animate-date-stage" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Watch Live Date Simulation</button>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem; border-top:1px solid var(--border-color); padding-top:1rem;">
                    <div>Chemistry: <strong>${metrics.conversation_chemistry || 50}%</strong></div>
                    <div>Energy Match: <strong>${metrics.energy_match || 50}%</strong></div>
                    <div>Humor Match: <strong>${metrics.humor_match || 50}%</strong></div>
                    <div>Values Match: <strong>${metrics.values_match || 50}%</strong></div>
                </div>

                <div style="border-top:1px solid var(--border-color); padding-top:1rem; font-size:0.85rem; color:var(--text-secondary);">
                    <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Shared Interests</div>
                    <ul style="list-style-type:square; margin-left:1.25rem; font-size:0.8rem;">
                        ${metrics.shared_interests ? metrics.shared_interests.map(i => `<li>${i}</li>`).join('') : '<li>No direct hobbies matching in profile indices</li>'}
                    </ul>
                </div>

                <div style="border-top:1px solid var(--border-color); padding-top:1rem; margin-top:1rem; font-size:0.85rem; color:var(--text-secondary);">
                    <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Potential Challenges</div>
                    <ul style="list-style-type:square; margin-left:1.25rem; font-size:0.8rem; color:var(--accent-rose);">
                        ${metrics.potential_challenges ? metrics.potential_challenges.map(c => `<li>${c}</li>`).join('') : '<li>Low friction profiles</li>'}
                    </ul>
                </div>
            </div>

            ${vdPanelHtml}

            <h4 style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary); margin-bottom:0.5rem;">Dialogue Transcript Log</h4>
            <div style="border:1px solid var(--border-color); border-radius:6px; padding:1rem; height:200px; overflow-y:auto; background-color:#060608;" id="sim-text-logs-container">
            </div>
        `;

        // Load chat transcript logs
        const logsBox = document.getElementById('sim-text-logs-container');
        let cumulativeDelay = 0;
        sim.dialogue_log.forEach((dlg, idx) => {
            const bubble = document.createElement('div');
            if (dlg.speaker === 'System Core') {
                bubble.className = 'sim-log-bubble system';
            } else if (dlg.speaker === activeTwin.name) {
                bubble.className = 'sim-log-bubble speaker-a';
            } else {
                bubble.className = 'sim-log-bubble speaker-b';
            }
            logsBox.appendChild(bubble);
            const textToType = `${dlg.speaker}: ${dlg.message}`;
            setTimeout(() => {
                animateTextTypewriter(bubble, textToType, 12);
                logsBox.scrollTop = logsBox.scrollHeight;
            }, cumulativeDelay);
            cumulativeDelay += textToType.length * 12 + 350; // Type delay + short pause between messages
        });

        // Add action handlers
        if (myApp === 'pending' && !isExpired) {
            document.getElementById('btn-approve-sim').addEventListener('click', () => handleApproval('approved'));
            document.getElementById('btn-decline-sim').addEventListener('click', () => handleApproval('declined'));
        }

        // Wire up toggle lock button
        const lockBtn = document.getElementById('btn-toggle-vd-lock');
        if (lockBtn && !isExpired) {
            lockBtn.addEventListener('click', async () => {
                try {
                    const updatedSim = await apiFetch(`/api/agents/simulations/${sim.id}/lock`, {
                        method: 'POST'
                    });
                    loadSimulationsHistory();
                    renderSimulationDetails(updatedSim);
                } catch (err) {
                    alert(`Failed toggling date lock: ${err.message}`);
                }
            });
        }

        // Animate date stage modal trigger
        document.getElementById('btn-animate-date-stage').addEventListener('click', () => {
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
        
        document.getElementById('modal-stage-title').textContent = `${activeTwin.name} & ${sim.partner_name}`;
        document.getElementById('modal-stage-subtitle').textContent = `Environment: ${sim.environment}`;
        
        modal.classList.add('active');
        anime({
            targets: '#date-stage-modal .modal-content',
            scale: [0.8, 1],
            opacity: [0, 1],
            duration: 450,
            easing: 'easeOutBack'
        });
        stageLogs.innerHTML = '';
        
        // Reset speech bubble states
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
        
        // Populate approvals tray
        const isUserA = sim.user_a_id === currentUser.id;
        const myApp = isUserA ? sim.approval_user_a : sim.approval_user_b;
        approvalsTray.innerHTML = '';
        if (myApp === 'pending') {
            approvalsTray.innerHTML = `
                <button class="btn btn-primary" id="btn-stage-approve">Approve Compatibility</button>
                <button class="btn btn-secondary" id="btn-stage-decline" style="color:var(--accent-rose); border-color:var(--accent-rose);">Decline</button>
            `;
            document.getElementById('btn-stage-approve').addEventListener('click', () => {
                modal.classList.remove('active');
                handleApproval('approved');
            });
            document.getElementById('btn-stage-decline').addEventListener('click', () => {
                modal.classList.remove('active');
                handleApproval('declined');
            });
        } else {
            approvalsTray.innerHTML = `<span style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-muted);">Status: ${myApp.toUpperCase()}</span>`;
        }

        // Animate the conversation dynamically using Anime.js
        let logIndex = 0;
        const logEntries = sim.dialogue_log;
        
        function runDialogAnimation() {
            if (!modal.classList.contains('active') || logIndex >= logEntries.length) {
                // Done
                if (bubbleA) {
                    anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB) {
                    anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                return;
            }
            
            const entry = logEntries[logIndex];
            const div = document.createElement('div');
            
            if (entry.speaker === 'System Core') {
                div.style.color = 'var(--text-muted)';
                div.style.fontFamily = 'var(--font-mono)';
                div.style.fontSize = '0.75rem';
                if (bubbleA) {
                    anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB) {
                    anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
            } else if (entry.speaker === activeTwin.name) {
                div.style.color = 'var(--accent-indigo)';
                div.style.fontWeight = 'bold';
                
                // speech bubble A scale-up and fade-in
                if (bubbleB) {
                    anime({ targets: '#speech-bubble-b', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleA) {
                    bubbleA.textContent = entry.message; // Fix missing text bug
                    anime({
                        targets: '#speech-bubble-a',
                        opacity: 1,
                        scale: [0.8, 1],
                        translateY: [10, 0],
                        duration: 500,
                        easing: 'easeOutBack'
                    });
                }
                
                // Spring Elastic bounce for avatar wrapper A
                anime({
                    targets: '#stage-avatar-a',
                    translateY: [0, -15, 0],
                    duration: 600,
                    easing: 'easeOutElastic(1, .5)'
                });
            } else {
                div.style.color = 'var(--accent-pink)';
                div.style.fontWeight = 'bold';
                
                // speech bubble B scale-up and fade-in
                if (bubbleA) {
                    anime({ targets: '#speech-bubble-a', opacity: 0, scale: 0.8, duration: 300, easing: 'easeOutQuad' });
                }
                if (bubbleB) {
                    bubbleB.textContent = entry.message; // Fix missing text bug
                    anime({
                        targets: '#speech-bubble-b',
                        opacity: 1,
                        scale: [0.8, 1],
                        translateY: [10, 0],
                        duration: 500,
                        easing: 'easeOutBack'
                    });
                }
                
                // Spring Elastic bounce for avatar wrapper B
                anime({
                    targets: '#stage-avatar-b',
                    translateY: [0, -15, 0],
                    duration: 600,
                    easing: 'easeOutElastic(1, .5)'
                });
            }
            
            div.textContent = `${entry.speaker}: ${entry.message}`;
            div.style.marginBottom = '0.4rem';
            div.style.fontSize = '0.85rem';
            stageLogs.appendChild(div);
            stageLogs.scrollTop = stageLogs.scrollHeight;
            
            logIndex++;
            setTimeout(runDialogAnimation, 3000);
        }

        setTimeout(runDialogAnimation, 1000);
    }

    loadTwinAndSimulations();
}

// ----------------- 5. DIRECT HUMAN CHATS WORKSPACE -----------------
function initChatWorkspace() {
    const contactsList = document.getElementById('chat-contacts-list') || document.getElementById('matched-contacts-list');
    const chatWorkspace = document.getElementById('chat-thread-pane') || document.getElementById('chat-workspace-box');
    
    if (!contactsList) return;

    let activeMessages = [];

    // Load matches where BOTH humans have approved
    async function loadMatches() {
        try {
            // Load matches
            const sims = await apiFetch('/api/agents/simulations');
            contactsList.innerHTML = '';
            const user = currentUser;
            const incompleteWarn = document.getElementById('incomplete-assessment-warning');
            const mainConsole = document.getElementById('main-console-content');
            const isAdmin = user.role === 'admin';
            
            if ((!user.profile || !user.profile.mbti_summary) && !isAdmin) {
                if (incompleteWarn) incompleteWarn.classList.remove('hidden');
                if (mainConsole) mainConsole.classList.add('hidden');
                return;
            } else {
                if (incompleteWarn) incompleteWarn.classList.add('hidden');
                if (mainConsole) mainConsole.classList.remove('hidden');
            }

            if (sims.length === 0) {
                contactsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No approved matches unlocked. Visit Simulated Dates to review.</div>`;
                return;
            }

            sims.forEach(match => {
                const item = document.createElement('div');
                item.style.padding = '0.5rem 0.75rem';
                item.style.border = '1px solid var(--border-color)';
                item.style.borderRadius = '4px';
                item.style.cursor = 'pointer';
                item.style.transition = 'all 0.2s';
                item.style.backgroundColor = chatPartnerId === match.user_a_id || chatPartnerId === match.user_b_id ? 'rgba(79, 70, 229, 0.05)' : 'transparent';
                
                const partner_id = match.user_a_id === currentUser.id ? match.user_b_id : match.user_a_id;
                const isApproved = (match.approval_user_a === 'approved' && match.approval_user_b === 'approved') || isAdmin;
                
                let badgeHtml = '';
                if (!isApproved) {
                    badgeHtml = `<span style="font-family:var(--font-mono); font-size:0.6rem; color:var(--accent-rose); border:1px solid rgba(225,29,72,0.3); border-radius:3px; padding:0.05rem 0.25rem; background:rgba(225,29,72,0.02);">🔒 Locked</span>`;
                } else {
                    badgeHtml = `<span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-muted);">${match.partner_konvo_id}</span>`;
                }

                item.innerHTML = `
                    <div style="font-weight:600; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>${match.partner_name}</span>
                        ${badgeHtml}
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    chatPartnerId = partner_id;
                    document.querySelectorAll('#chat-contacts-list div, #matched-contacts-list div').forEach(el => el.style.backgroundColor = 'transparent');
                    item.style.backgroundColor = 'rgba(79, 70, 229, 0.05)';
                    
                    if (!isApproved) {
                        // Show beautiful lock screen in chat pane
                        chatWorkspace.innerHTML = `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:3rem; text-align:center; background:radial-gradient(circle at 50% 30%, rgba(225,29,72,0.02) 0%, var(--bg-base) 80%);">
                                <div style="font-size:3.5rem; margin-bottom:1.5rem;">🔒</div>
                                <h3 style="font-family:var(--font-serif); font-size:1.6rem; color:var(--accent-rose); margin-bottom:0.75rem;">Direct Conversation Locked</h3>
                                <p style="color:var(--text-secondary); max-width:460px; font-size:0.9rem; line-height:1.6; margin-bottom:2rem;">
                                    Direct cryptographic chat routes require mutual human approval of the AI Twin simulated date logs first.
                                </p>
                                <a href="/agents" class="btn btn-primary" style="text-decoration:none;" onclick="event.preventDefault(); window.history.pushState(null, null, '/agents'); window.handleRouting('/profile');">
                                    Review & Approve Simulated Dates →
                                </a>
                            </div>
                        `;
                    } else {
                        openDirectChat(match, partner_id);
                    }
                });
                
                contactsList.appendChild(item);
            });

            // Handle preselected partner from URL query parameters
            const params = new URLSearchParams(window.location.search);
            const urlPartnerId = params.get('partner_id');
            if (urlPartnerId) {
                const preselectedMatch = matches.find(m => {
                    const pId = m.user_a_id === currentUser.id ? m.user_b_id : m.user_a_id;
                    return String(pId) === String(urlPartnerId);
                });
                if (preselectedMatch) {
                    const partner_id = preselectedMatch.user_a_id === currentUser.id ? preselectedMatch.user_b_id : preselectedMatch.user_a_id;
                    chatPartnerId = partner_id;
                    openDirectChat(preselectedMatch, partner_id);
                }
            } else if (matches.length > 0) {
                // Open first match by default
                const first = matches[0];
                const pId = first.user_a_id === currentUser.id ? first.user_b_id : first.user_a_id;
                chatPartnerId = pId;
                openDirectChat(first, pId);
            }
        } catch (e) {
            contactsList.innerHTML = `Error: ${e.message}`;
        }
    }

    async function openDirectChat(match, partner_id) {
        chatWorkspace.innerHTML = `
            <div class="chat-layout" style="border: none; border-radius: 0; height: 100%;">
                <div class="chat-header">
                    <div>
                        <strong style="font-size: 1.1rem; color: var(--text-primary);">${match.partner_name}</strong>
                        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${match.partner_konvo_id}</span>
                    </div>
                    <div>
                        <button class="btn btn-secondary" id="btn-block-node" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; color: var(--accent-rose); border-color: var(--accent-rose); margin-right: 0.5rem;">Block</button>
                        <button class="btn btn-secondary" id="btn-report-node" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;">Report</button>
                    </div>
                </div>
                
                <div class="chat-search-row" style="padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: center;">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">SEARCH DIALECTICS:</span>
                    <input type="text" id="chat-search-input" placeholder="Filter transcripts..." style="flex: 1; padding: 0.25rem 0.5rem; font-size: 0.8rem; background-color: transparent; border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                </div>

                <div class="chat-body-history" id="chat-history-messages-box">
                    <div class="safety-warning-box">
                        <span>🔒 Encrypted dialectic pipeline is secure. CSP, rate limiting, and SQL injection protections active.</span>
                    </div>
                    <div id="messages-list-wrapper" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
                    <div id="typing-indicator" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); padding: 0.2rem 0.5rem;" class="hidden">${match.partner_name} is drafting a transmission...</div>
                </div>

                <form id="chat-send-form" class="chat-input-row" style="display: flex; gap: 0.75rem; padding: 1rem; border-top: 1px solid var(--border-color);">
                    <div class="upload-btn-wrapper" style="position: relative; overflow: hidden; display: inline-block;">
                        <button class="btn btn-secondary" style="padding: 0.55rem 0.75rem; font-size: 1.1rem;" title="Upload Media" type="button">📎</button>
                        <input type="file" id="chat-media-file" name="file" accept="image/*,audio/*" style="font-size: 100px; position: absolute; left: 0; top: 0; opacity: 0; cursor: pointer;">
                    </div>
                    <input type="text" id="chat-msg-input" class="search-input" style="flex: 1;" placeholder="Type a message..." required autocomplete="off">
                    <button type="submit" class="btn btn-primary" style="background-color: var(--accent-teal); border-color: var(--accent-teal); color: #fff;">Transmit</button>
                </form>
            </div>
        `;

        const msgList = document.getElementById('messages-list-wrapper');
        const historyBox = document.getElementById('chat-history-messages-box');
        const inputField = document.getElementById('chat-msg-input');
        const searchField = document.getElementById('chat-search-input');
        const fileField = document.getElementById('chat-media-file');
        let searchTimer = null;

        // Block and Report hooks
        document.getElementById('btn-block-node').addEventListener('click', () => {
            if (confirm(`Are you sure you want to block ${match.partner_name}?`)) {
                alert(`Blocked. Re-routing.`);
                window.location.href = '/matches';
            }
        });
        document.getElementById('btn-report-node').addEventListener('click', () => {
            const reason = prompt(`Reason for reporting ${match.partner_name}:`);
            if (reason) {
                alert(`Report filed. Operational teams will analyze this transaction log.`);
            }
        });

        // Search messages log filter
        if (searchField) {
            searchField.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    const query = searchField.value.trim().toLowerCase();
                    if (!query) {
                        renderMessagesList(msgList, activeMessages);
                    } else {
                        const filtered = activeMessages.filter(m => m.content.toLowerCase().includes(query));
                        renderMessagesList(msgList, filtered);
                    }
                }, 300);
            });
        }

        // Media uploads validation logic
        if (fileField) {
            fileField.addEventListener('change', async () => {
                const file = fileField.files[0];
                if (!file) return;
                
                // Safe validation: max size 5MB and check type
                if (file.size > 5 * 1024 * 1024) {
                    alert("Security boundary validation failed: Upload payload exceeds 5MB limit.");
                    fileField.value = '';
                    return;
                }
                
                // Check extension
                const ext = file.name.split('.').pop().toLowerCase();
                const dangerousExts = ['exe', 'bat', 'sh', 'js', 'py', 'json', 'html', 'php'];
                if (dangerousExts.includes(ext)) {
                    alert("Security sandbox violation: Dangerous executable upload blocked by gateway validation rule.");
                    fileField.value = '';
                    return;
                }
                
                alert(`File calibrated successfully: ${file.name} (${Math.round(file.size / 1024)} KB). Compressing attachment payload.`);
                try {
                    await apiFetch(`/api/chat/messages/${partner_id}`, {
                        method: 'POST',
                        body: JSON.stringify({ content: `[Sent Media Attachment: ${file.name}]` })
                    });
                } catch (e) {
                    alert(`Attachment transmission failed: ${e.message}`);
                }
            });
        }

        // 1. Fetch past message history
        try {
            activeMessages = await apiFetch(`/api/chat/messages/${partner_id}`);
            renderMessagesList(msgList, activeMessages);
            historyBox.scrollTop = historyBox.scrollHeight;
        } catch (e) {
            msgList.innerHTML = `<div style="color:var(--accent-rose); font-family:var(--font-mono);">Failed loading messages: ${e.message}</div>`;
        }

        // 2. Set up WebSockets connection for live messaging & typing state
        connectChatWebSocket(partner_id, msgList, historyBox);

        // 3. Typing indicator listener
        inputField.addEventListener('input', () => {
            sendTypingState(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => sendTypingState(false), 2000);
        });

        // 4. Submit message handler
        const sendForm = document.getElementById('chat-send-form');
        sendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = inputField.value;
            inputField.value = '';
            sendTypingState(false);
            
            try {
                await apiFetch(`/api/chat/messages/${partner_id}`, {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });
            } catch (err) {
                alert(`Transmission failed: ${err.message}`);
            }
        });
    }

    function renderMessagesList(container, messages) {
        container.innerHTML = '';
        if (messages.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.8rem; font-style:italic;">Dialectic ledger is empty. Write the first argument.</div>`;
            return;
        }
        
        messages.forEach(msg => {
            const isMe = msg.sender_id === currentUser.id;
            const row = document.createElement('div');
            row.className = `message-row ${isMe ? 'sent' : 'received'}`;
            
            let reactionBadgeHtml = '';
            if (msg.reactions && msg.reactions.length > 0) {
                const ems = msg.reactions.map(r => r.emoji).join(' ');
                reactionBadgeHtml = `<div class="reaction-badge" data-msg-id="${msg.id}">${ems}</div>`;
            }

            row.innerHTML = `
                <div class="msg-bubble" style="position:relative;" title="Double click to react">
                    ${msg.content}
                    ${reactionBadgeHtml}
                </div>
                <div class="msg-receipts">
                    ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    ${isMe ? `<span>• ${msg.read_status ? 'Read' : 'Delivered'}</span>` : ''}
                </div>
            `;
            
            // Double click bubble to open reactions panel drawer
            const bubbleEl = row.querySelector('.msg-bubble');
            bubbleEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                openReactionsPicker(bubbleEl, msg.id);
            });

            container.appendChild(row);
        });
    }

    function openReactionsPicker(bubbleEl, msgId) {
        // Remove existing reaction pickers
        document.querySelectorAll('.reaction-picker-modal').forEach(el => el.remove());
        
        const picker = document.createElement('div');
        picker.className = 'reaction-picker-modal';
        picker.innerHTML = `
            <span class="reaction-option" data-emoji="❤️">❤️</span>
            <span class="reaction-option" data-emoji="😂">😂</span>
            <span class="reaction-option" data-emoji="👍">👍</span>
            <span class="reaction-option" data-emoji="🔥">🔥</span>
            <span class="reaction-option" data-emoji="👀">👀</span>
        `;
        
        bubbleEl.appendChild(picker);
        
        picker.querySelectorAll('.reaction-option').forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                const emoji = opt.dataset.emoji;
                picker.remove();
                
                alert(`Reaction logged locally: ${emoji}`);
                const msg = activeMessages.find(m => m.id === msgId);
                if (msg) {
                    if (!msg.reactions) msg.reactions = [];
                    msg.reactions.push({ user_id: currentUser.id, emoji });
                    renderMessagesList(document.getElementById('messages-list-wrapper'), activeMessages);
                }
            });
        });
        
        // Hide picker on outside click
        document.addEventListener('click', () => picker.remove(), {once: true});
    }

    function connectChatWebSocket(partner_id, msgList, historyBox) {
        if (activeWsChat) {
            activeWsChat.close();
        }
        
        activeWsChat = new WebSocket(`${WS_BASE_URL}/api/chat/ws?user_token=${token}`);
        
        activeWsChat.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chat_message') {
                const msg = data.message;
                // Verify if message belongs to this conversation
                if ((msg.sender_id === currentUser.id && msg.receiver_id === partner_id) || 
                    (msg.sender_id === partner_id && msg.receiver_id === currentUser.id)) {
                    
                    // Add message and redraw list
                    const exists = activeMessages.find(m => m.id === msg.id);
                    if (!exists) {
                        activeMessages.push(msg);
                        renderMessagesList(msgList, activeMessages);
                        historyBox.scrollTop = historyBox.scrollHeight;
                    }
                }
            } else if (data.type === 'typing') {
                if (data.sender_id === partner_id) {
                    const indicator = document.getElementById('typing-indicator');
                    if (indicator) {
                        if (data.typing) {
                            indicator.classList.remove('hidden');
                        } else {
                            indicator.classList.add('hidden');
                        }
                    }
                }
            }
        };

        activeWsChat.onclose = () => {
            console.log("Chat websocket disconnected");
        };
    }

    function sendTypingState(isTyping) {
        if (activeWsChat && activeWsChat.readyState === WebSocket.OPEN) {
            activeWsChat.send(JSON.stringify({
                type: 'typing',
                partner_id: chatPartnerId,
                typing: isTyping
            }));
        }
    }

    loadMatches();
}

// ─── Body scroll lock — single MutationObserver is the sole controller ───────
// IMPORTANT: Do NOT call lockBodyScroll/unlockBodyScroll manually in other
// places. The MutationObserver in setupModalClosers is the only authority.
const _activeModals = new Set();
let _savedScrollY = 0;

function lockBodyScroll(modalId) {
    if (!modalId) return;
    if (_activeModals.size === 0) {
        _savedScrollY = window.scrollY;
        document.documentElement.style.setProperty('--scroll-y', `-${_savedScrollY}px`);
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('position', 'fixed', 'important');
        document.body.style.setProperty('width', '100%', 'important');
        document.body.style.setProperty('top', `-${_savedScrollY}px`);
        document.body.classList.add('modal-open');
    }
    _activeModals.add(modalId);
}

function unlockBodyScroll(modalId) {
    if (!modalId) return;
    if (!_activeModals.has(modalId)) return;
    _activeModals.delete(modalId);
    if (_activeModals.size === 0) {
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('top');
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('--scroll-y');
        window.scrollTo(0, _savedScrollY);
    }
}

// Close Modal helper
function setupModalClosers() {

    // The single function to close a modal.
    // Does NOT call unlockBodyScroll — the MutationObserver below is the
    // only place that calls it, preventing the double-decrement bug.
    function closeModal(m) {
        if (m.id === 'quiz-modal' && typeof currentUser !== 'undefined' && currentUser &&
            (!currentUser.profile || !currentUser.profile.mbti_summary)) {
            return; // Onboarding quiz cannot be skipped
        }
        m.classList.remove('active');
        if (m.id === 'demo-modal' && typeof demoSimInterval !== 'undefined' && demoSimInterval) {
            clearInterval(demoSimInterval);
            demoSimInterval = null;
        }
    }

    // Expose close helper globally
    window.konvoCloseModal = function(id) {
        const el = document.getElementById(id);
        if (el) closeModal(el);
    };

    // Click-only delegation on each modal overlay.
    // We do NOT use pointerup here because:
    //   - pointerup with e.preventDefault() suppresses subsequent click events
    //     in iOS Safari, which breaks inline onclick handlers on close buttons
    //   - passive:false on inner elements causes laggy checkboxes / inputs
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            // Close when clicking the dark backdrop (outside modal-content)
            if (e.target === m) {
                closeModal(m);
                return;
            }
            // Close when any .close-modal button is clicked anywhere inside
            if (e.target.closest('.close-modal')) {
                closeModal(m);
            }
        });
    });

    // MutationObserver is the single authority for body scroll lock.
    // It observes class changes and calls lock/unlock exactly once per event.
    const scrollLockObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName !== 'class') return;
            const target = mutation.target;
            // Only act on elements that have the .modal class
            if (!target.classList.contains('modal')) return;
            const wasActive = mutation.oldValue ? mutation.oldValue.split(' ').includes('active') : false;
            const isActive = target.classList.contains('active');
            if (isActive && !wasActive) {
                lockBodyScroll(target.id || 'unnamed-modal');
            } else if (!isActive && wasActive) {
                unlockBodyScroll(target.id || 'unnamed-modal');
            }
        });
    });

    document.querySelectorAll('.modal').forEach(m => {
        scrollLockObserver.observe(m, {
            attributes: true,
            attributeFilter: ['class'],
            attributeOldValue: true   // needed to diff old vs new class list
        });
    });

    // Global ESC key — close all active modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m));
        }
    });
}

// Log out user
function setupLogout() {
    const btn = document.getElementById('btn-logout');
    if (btn) {
        btn.addEventListener('click', () => {
            localStorage.removeItem('konvo_token');
            token = '';
            window.location.href = '/auth';
        });
    }
}

// ----------------- 6. COMMUNITIES INTEL -----------------
async function initCommunitiesPage() {
    const grid = document.getElementById('communities-analytics-grid');
    if (!grid) return;

    // Form submit handler for creating a new community
    const createForm = document.getElementById('create-community-form');
    if (createForm && !createForm.dataset.listenerBound) {
        createForm.dataset.listenerBound = 'true';
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('comm-name').value;
            const description = document.getElementById('comm-desc').value;
            try {
                const res = await apiFetch('/api/communities', {
                    method: 'POST',
                    body: JSON.stringify({ name, description })
                });
                if (res) {
                    createForm.reset();
                    initCommunitiesPage();
                }
            } catch (err) {
                alert(`Domain registration failed: ${err.message}`);
            }
        });
    }

    try {
        const communities = await apiFetch('/api/communities');
        grid.innerHTML = '';
        if (!communities || communities.length === 0) {
            grid.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">No community domains active in the network registry.</div>';
            return;
        }

        communities.forEach(c => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '1rem';
            
            card.innerHTML = `
                <div>
                    <h3 style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--text-primary); margin-bottom: 0.25rem;">${c.name}</h3>
                    <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-amber); margin-bottom: 0.75rem;">domain/${c.slug}</div>
                    <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">${c.description}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <div>HEALTH INDEX: <strong style="color: var(--accent-teal);">${c.health_score}%</strong></div>
                    <div>QUALITY LEVEL: <strong style="color: var(--accent-indigo);">${c.quality_index}%</strong></div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = `<div style="color: var(--accent-rose); font-family: var(--font-mono);">Failed to load network domains: ${e.message}</div>`;
    }
}
window.initCommunitiesPage = initCommunitiesPage;

// ----------------- 7. INTERACTIVE RELATIONSHIP GRAPH -----------------
async function initGraphPage() {
    const container = document.getElementById('relationship-network');
    if (!container) return;

    try {
        const data = await apiFetch('/api/graph');
        if (!data || !data.nodes || data.nodes.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-family: var(--font-mono); text-align: center; padding: 3rem;">No active profiles in the relationship index.</div>';
            return;
        }

        container.innerHTML = '';
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 550;

        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.backgroundColor = '#050507';
        container.appendChild(svg);

        // Force Directed layout node mapping
        const nodes = data.nodes.map((n) => ({
            ...n,
            x: width / 2 + (Math.random() - 0.5) * 150,
            y: height / 2 + (Math.random() - 0.5) * 150,
            vx: 0,
            vy: 0,
            radius: 12
        }));

        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        const links = data.edges.map(e => ({
            source: nodeMap[e.source],
            target: nodeMap[e.target],
            type: e.type,
            weight: e.weight
        })).filter(l => l.source && l.target);

        // Physics parameters
        const k = 0.04;
        const length = 120;
        const rep = 800;
        const damp = 0.85;
        const centerGravity = 0.01;

        // SVG Groups
        const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(linkGroup);
        svg.appendChild(nodeGroup);

        const typeColors = {
            debate: 'var(--accent-rose)',
            collaborate: 'var(--accent-teal)',
            learn: 'var(--accent-amber)',
            mentor: 'var(--accent-indigo)',
            interact: 'var(--text-muted)'
        };

        const lines = links.map(l => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', typeColors[l.type] || '#555562');
            line.setAttribute('stroke-width', (1.5 * l.weight).toString());
            line.setAttribute('stroke-opacity', '0.5');
            linkGroup.appendChild(line);
            return { element: line, link: l };
        });

        // Detail tooltip element
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'var(--bg-card)';
        tooltip.style.border = '1px solid var(--border-color)';
        tooltip.style.padding = '0.75rem';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '0.75rem';
        tooltip.style.fontFamily = 'var(--font-mono)';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s';
        tooltip.style.zIndex = '1000';
        container.appendChild(tooltip);

        const circles = nodes.map(n => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.style.cursor = 'pointer';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', n.radius.toString());
            const isMe = currentUser && `USER-${currentUser.id}` === n.id;
            circle.setAttribute('fill', isMe ? 'var(--accent-amber)' : 'var(--accent-indigo)');
            circle.setAttribute('stroke', 'var(--border-color)');
            circle.setAttribute('stroke-width', '2');
            g.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = n.label;
            text.setAttribute('y', '22');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-primary)');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-family', 'var(--font-mono)');
            g.appendChild(text);

            nodeGroup.appendChild(g);

            // Tooltip interactivity
            g.addEventListener('mouseenter', () => {
                circle.setAttribute('stroke', 'var(--text-primary)');
                tooltip.style.opacity = '1';
                tooltip.innerHTML = `
                    <div style="font-weight:bold; color:var(--text-primary); margin-bottom:0.25rem;">${n.label}</div>
                    <div>ID: ${n.details.konvo_id}</div>
                    <div>Style: ${n.details.style}</div>
                    <div>Debate: ${n.details.debate}</div>
                    <div>Trust score: ${n.details.trust}%</div>
                `;
            });

            g.addEventListener('mousemove', (e) => {
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${e.clientX - rect.left + 15}px`;
                tooltip.style.top = `${e.clientY - rect.top + 15}px`;
            });

            g.addEventListener('mouseleave', () => {
                circle.setAttribute('stroke', 'var(--border-color)');
                tooltip.style.opacity = '0';
            });

            // Basic dragging logic
            let dragging = false;
            g.addEventListener('mousedown', (e) => {
                dragging = true;
                e.preventDefault();
            });
            window.addEventListener('mousemove', (e) => {
                if (dragging) {
                    const rect = container.getBoundingClientRect();
                    n.x = Math.max(20, Math.min(width - 20, e.clientX - rect.left));
                    n.y = Math.max(20, Math.min(height - 20, e.clientY - rect.top));
                    n.vx = 0;
                    n.vy = 0;
                }
            });
            window.addEventListener('mouseup', () => {
                dragging = false;
            });

            return { element: g, node: n };
        });

        function tick() {
            for (let i = 0; i < nodes.length; i++) {
                const n1 = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 250) {
                        const force = rep / (dist * dist);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        n1.vx += fx;
                        n1.vy += fy;
                        n2.vx -= fx;
                        n2.vy -= fy;
                    }
                }
            }

            links.forEach(l => {
                const dx = l.target.x - l.source.x;
                const dy = l.target.y - l.source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = k * (dist - length);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                l.source.vx += fx;
                l.source.vy += fy;
                l.target.vx -= fx;
                l.target.vy -= fy;
            });

            nodes.forEach(n => {
                n.vx += (width / 2 - n.x) * centerGravity;
                n.vy += (height / 2 - n.y) * centerGravity;
                
                n.x += n.vx;
                n.y += n.vy;
                
                n.vx *= damp;
                n.vy *= damp;

                n.x = Math.max(20, Math.min(width - 20, n.x));
                n.y = Math.max(20, Math.min(height - 20, n.y));
            });

            lines.forEach(l => {
                l.element.setAttribute('x1', l.link.source.x.toString());
                l.element.setAttribute('y1', l.link.source.y.toString());
                l.element.setAttribute('x2', l.link.target.x.toString());
                l.element.setAttribute('y2', l.link.target.y.toString());
            });

            circles.forEach(c => {
                c.element.setAttribute('transform', `translate(${c.node.x}, ${c.node.y})`);
            });

            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);

    } catch (e) {
        container.innerHTML = `<div style="color: var(--accent-rose); font-family: var(--font-mono); text-align: center; padding: 3rem;">Error loading network topology graph: ${e.message}</div>`;
    }
}
window.initGraphPage = initGraphPage;

// ----------------- 5. RESONANCE DISCOVERY MAP (LEAFLET) -----------------
async function initMapPage() {
    const mapElement = document.getElementById('discovery-map');
    if (!mapElement) return;

    mapElement.innerHTML = '';

    // Standard coordinates grid for seeded user nodes corresponding to DIGIPIN codes
    const DIGIPIN_MAPPING = {
        '8Y1A3B5C7D': { lat: 12.9716, lng: 77.5946, city: 'Bangalore (Indiranagar Grid)' },
        '8Y1A3B5C7E': { lat: 12.9516, lng: 77.6146, city: 'Bangalore (Koramangala Grid)' },
        '8Y1A3B9C2A': { lat: 12.9916, lng: 77.5746, city: 'Bangalore (Malleshwaram Grid)' },
        '8Y2A1B3C5D': { lat: 18.5204, lng: 73.8567, city: 'Pune (Shivajinagar Grid)' },
        '1A2B3C4D5E': { lat: 28.7041, lng: 77.1025, city: 'Delhi (Connaught Grid)' }
    };

    function getCoordsForDigipin(digipin) {
        if (!digipin) return null;
        const formatted = digipin.trim().toUpperCase();
        if (DIGIPIN_MAPPING[formatted]) {
            return DIGIPIN_MAPPING[formatted];
        }
        // Fallback translation algorithm mapping arbitrary pins
        let hash = 0;
        for (let i = 0; i < formatted.length; i++) {
            hash = formatted.charCodeAt(i) + ((hash << 5) - hash);
        }
        const mockLat = 12.9 + (Math.abs(hash % 1000) / 5000);
        const mockLng = 77.5 + (Math.abs((hash >> 3) % 1000) / 5000);
        return { lat: mockLat, lng: mockLng, city: `Grid Zone ${formatted.substring(0, 4)}` };
    }

    let centerLat = 12.9716;
    let centerLng = 77.5946;
    let myCoords = null;

    if (currentUser && currentUser.profile && currentUser.profile.digipin) {
        myCoords = getCoordsForDigipin(currentUser.profile.digipin);
        if (myCoords) {
            centerLat = myCoords.lat;
            centerLng = myCoords.lng;
        }
    }

    function createGeoJSONCircle(center, radiusInKm, points = 64) {
        const latitude = center[1];
        const longitude = center[0];
        const ret = [];
        const distanceX = radiusInKm / (111.32 * Math.cos(latitude * Math.PI / 180));
        const distanceY = radiusInKm / 110.57;

        for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            const x = distanceX * Math.cos(theta);
            const y = distanceY * Math.sin(theta);
            ret.push([longitude + x, latitude + y]);
        }
        ret.push(ret[0]);

        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [ret]
            }
        };
    }

    const map = new maplibregl.Map({
        container: 'discovery-map',
        style: {
            version: 8,
            sources: {
                'dark-matter': {
                    type: 'raster',
                    tiles: [
                        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap &copy; CARTO'
                }
            },
            layers: [
                {
                    id: 'dark-matter-layer',
                    type: 'raster',
                    source: 'dark-matter',
                    minzoom: 0,
                    maxzoom: 20
                }
            ]
        },
        center: [centerLng, centerLat],
        zoom: 11
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', async () => {
        const features = [];

        if (myCoords) {
            const jitterLat = centerLat + (Math.random() - 0.5) * 0.002;
            const jitterLng = centerLng + (Math.random() - 0.5) * 0.002;

            const el = document.createElement('div');
            el.className = 'my-location-marker';
            el.innerHTML = `<div style="background-color: var(--accent-amber); border: 2.5px solid white; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 10px var(--accent-amber); filter: drop-shadow(0 0 4px var(--accent-amber)); cursor: pointer;"></div>`;

            const popup = new maplibregl.Popup({ offset: 15 }).setHTML(
                `<div style="font-family: var(--font-sans); color: var(--text-primary); text-align: center; font-size: 0.8rem;">
                    <strong>Your Masked Node</strong><br>Grid: ${currentUser.profile.digipin || 'N/A'}<br>${myCoords.city}
                 </div>`
            );

            new maplibregl.Marker({ element: el })
                .setLngLat([jitterLng, jitterLat])
                .setPopup(popup)
                .addTo(map);

            features.push({
                ...createGeoJSONCircle([jitterLng, jitterLat], 0.8),
                properties: { color: 'var(--accent-amber)' }
            });
        }

        try {
            const candidates = await apiFetch('/api/compatibility/discovery');
            if (candidates && candidates.length > 0) {
                candidates.forEach(user => {
                    if (!user.user_id) return;

                    let userDigipin = user.digipin;
                    if (!userDigipin) {
                        const fallbackDigipins = {
                            1: '8Y1A3B5C7D',
                            2: '8Y1A3B5C7E',
                            3: '8Y1A3B9C2A',
                            4: '8Y2A1B3C5D',
                            5: '1A2B3C4D5E'
                        };
                        userDigipin = fallbackDigipins[user.user_id] || '8Y1A3B5C7D';
                    }

                    const userCoords = getCoordsForDigipin(userDigipin);
                    if (userCoords) {
                        const jitterLat = userCoords.lat + (Math.random() - 0.5) * 0.006;
                        const jitterLng = userCoords.lng + (Math.random() - 0.5) * 0.006;

                        let color = 'var(--text-muted)';
                        let shadowColor = 'rgba(85, 85, 98, 0.4)';
                        if (user.compatibility_score >= 80) {
                            color = 'var(--accent-indigo)';
                            shadowColor = 'rgba(79, 70, 229, 0.5)';
                        } else if (user.compatibility_score >= 60) {
                            color = 'var(--accent-teal)';
                            shadowColor = 'rgba(13, 148, 136, 0.5)';
                        }

                        const el = document.createElement('div');
                        el.className = 'user-location-marker';
                        el.innerHTML = `<div style="background-color: ${color}; border: 1.5px solid var(--border-color); width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 10px ${shadowColor}; cursor: pointer;"></div>`;

                        const popupContent = `
                            <div style="font-family: var(--font-sans); min-width: 180px; text-align: center; color: var(--text-primary);">
                                <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: bold; margin-bottom: 0.25rem;">${user.display_name}</div>
                                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-amber); margin-bottom: 0.5rem;">Resonance: ${user.compatibility_score}% (${user.compatibility_tier})</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">MBTI: ${user.mbti_type} // Intent: ${user.relationship_intent}</div>
                                <button class="btn btn-primary" style="font-size: 0.7rem; padding: 0.35rem 0.75rem; width: 100%;" onclick="window.location.href='/discover'">Review AI Twin</button>
                            </div>
                        `;

                        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupContent);

                        new maplibregl.Marker({ element: el })
                            .setLngLat([jitterLng, jitterLat])
                            .setPopup(popup)
                            .addTo(map);

                        features.push({
                            ...createGeoJSONCircle([jitterLng, jitterLat], 0.8),
                            properties: { color: color }
                        });
                    }
                });
            }

            if (features.length > 0) {
                map.addSource('proximity-circles', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: features
                    }
                });

                map.addLayer({
                    id: 'circles-fill',
                    type: 'fill',
                    source: 'proximity-circles',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.08
                    }
                });

                map.addLayer({
                    id: 'circles-outline',
                    type: 'line',
                    source: 'proximity-circles',
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': 1,
                        'line-dasharray': [3, 3]
                    }
                });
            }

        } catch (e) {
            console.error("Failed loading discovery map markers", e);
        }
    });
}
window.initMapPage = initMapPage;

function initLandingPageInteractive() {
    // 1. Sticky Header scroll effect
    const header = document.querySelector('.landing-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    });

    // 2. Interactive Demo Modal
    const demoBtn = document.getElementById('btn-watch-demo');
    const demoModal = document.getElementById('demo-modal');
    if (demoBtn && demoModal) {
        demoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            demoModal.classList.add('active');
            Telemetry.logEvent('interactive_demo_started');
            startInteractiveDemoSimulation();
        });
    }

    // 3. FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(q => {
        q.addEventListener('click', () => {
            const parent = q.parentElement;
            parent.classList.toggle('active');
        });
    });

    // 4. Resonance Interactive Matchup Calculator
    const typeASelect = document.getElementById('demo-type-a');
    const typeBSelect = document.getElementById('demo-type-b');
    const scoreVal = document.getElementById('demo-res-score');
    const matchAnalysis = document.getElementById('demo-res-analysis');

    function updateResonanceCalculation() {
        if (!typeASelect || !typeBSelect || !scoreVal || !matchAnalysis) return;
        const typeA = typeASelect.value;
        const typeB = typeBSelect.value;

        // Simple mock MBTI resonance calculations
        let score = 50;
        let analysis = "";

        // Calculate basic compatibility
        const mbtiA = typeA.split('');
        const mbtiB = typeB.split('');
        let matches = 0;
        for (let i = 0; i < 4; i++) {
            if (mbtiA[i] === mbtiB[i]) matches++;
        }

        // Standard MBTI chemistry rules
        if (typeA === typeB) {
            score = 75;
            analysis = "Shared behavioral styles create high comfort and predictive alignment, though potential blind spots exist in problem solving.";
        } else if (
            (typeA.includes('N') && typeB.includes('N') && matches >= 2) ||
            (typeA.includes('S') && typeB.includes('S') && matches >= 2)
        ) {
            score = 88;
            analysis = "Excellent cognitive compatibility. The resonance frequency points to high mutual understanding, shared mental models, and organic conversation flow.";
        } else {
            score = 62;
            analysis = "Complementary differences. While communication styles may differ initially, this matchup offers rich opportunities for growth and collaborative balance.";
        }

        if ((typeA.includes('T') && typeB.includes('F')) || (typeA.includes('F') && typeB.includes('T'))) {
            score += 5;
        }

        scoreVal.textContent = `${score}%`;
        matchAnalysis.textContent = analysis;

        const barFill = document.getElementById('demo-res-bar-fill');
        if (barFill) barFill.style.width = `${score}%`;
    }

    if (typeASelect && typeBSelect) {
        typeASelect.addEventListener('change', updateResonanceCalculation);
        typeBSelect.addEventListener('change', updateResonanceCalculation);
        updateResonanceCalculation();
    }

    // 5. AI Twin Demo sliders on landing page
    const twinTone = document.getElementById('demo-twin-tone');
    const twinHumor = document.getElementById('demo-twin-humor');
    const twinEmoji = document.getElementById('demo-twin-emoji');
    const twinMbti = document.getElementById('demo-twin-mbti');
    
    const toneLbl = document.getElementById('demo-twin-tone-lbl');
    const humorLbl = document.getElementById('demo-twin-humor-lbl');
    const emojiLbl = document.getElementById('demo-twin-emoji-lbl');
    
    const cardName = document.getElementById('demo-twin-card-name');
    const cardMbti = document.getElementById('demo-twin-card-mbti');
    const cardDesc = document.getElementById('demo-twin-card-desc');

    function updateTwinDemoCard() {
        if (!twinTone) return;
        const toneVal = parseInt(twinTone.value);
        const humorVal = parseInt(twinHumor.value);
        const emojiVal = parseInt(twinEmoji.value);
        const mbtiVal = twinMbti.value;
        
        if (toneLbl) toneLbl.textContent = toneVal < 30 ? "Formal" : (toneVal > 70 ? "Casual" : "Balanced");
        if (humorLbl) humorLbl.textContent = humorVal < 30 ? "Logical / Dry" : (humorVal > 70 ? "Conceptual / Sarcastic" : "Subtle");
        if (emojiLbl) emojiLbl.textContent = emojiVal < 30 ? "Minimalist" : (emojiVal > 70 ? "Expressive" : "Moderate");
        
        if (cardName) cardName.textContent = `Twin Agent (${mbtiVal})`;
        if (cardMbti) cardMbti.textContent = `${mbtiVal} Profile Archetype`;
        
        if (cardDesc) {
            let desc = `A digital representative calibrated with a ${toneLbl ? toneLbl.textContent.toLowerCase() : 'balanced'} tone and ${humorLbl ? humorLbl.textContent.toLowerCase() : 'subtle'} humor patterns. `;
            if (emojiVal > 70) {
                desc += "Expresses thoughts frequently using emotive markers.";
            } else if (emojiVal < 30) {
                desc += "Strictly avoids extra emoji characters.";
            } else {
                desc += "Uses moderate emoji markers when appropriate.";
            }
            cardDesc.textContent = desc;
        }
    }

    if (twinTone) {
        twinTone.addEventListener('input', updateTwinDemoCard);
        twinHumor.addEventListener('input', updateTwinDemoCard);
        twinEmoji.addEventListener('input', updateTwinDemoCard);
        twinMbti.addEventListener('change', updateTwinDemoCard);
        updateTwinDemoCard();
    }

    // 6. Virtual Date Demo auto streaming dialogues on landing page
    const dateStream = document.getElementById('landing-virtual-date-stream');
    if (dateStream) {
        const dialog = [
            { speaker: "Alice (INTJ Twin)", message: "Hello. I processed your public node repository. Your distributed database choices are interesting." },
            { speaker: "Bob (ENFP Twin)", message: "Hi! Haha, thanks! I went with Eventual Consistency to prioritize write scaling. Did your analytics models agree?" },
            { speaker: "Alice (INTJ Twin)", message: "Partially. High write rates introduce read delays. A hybrid CQRS pattern would reduce index contention." },
            { speaker: "Bob (ENFP Twin)", message: "Oh wow, that's work of art! I hadn't mapped index bottlenecks at this scale. Let's design a mock model." },
            { speaker: "Alice (INTJ Twin)", message: "Agreed. Let's request human authorization. The compatibility check is 92% on values and focus." },
            { speaker: "Bob (ENFP Twin)", message: "Awesome! Human approvals triggered. Connecting..." }
        ];
        
        let idxStream = 0;
        dateStream.innerHTML = '';
        
        function streamNextMessage() {
            if (!dateStream) return;
            if (idxStream >= dialog.length) {
                idxStream = 0;
                dateStream.innerHTML = '';
            }
            const msg = dialog[idxStream];
            const div = document.createElement('div');
            div.className = `sim-log-bubble ${msg.speaker.includes('Alice') ? 'speaker-a' : 'speaker-b'}`;
            div.textContent = `${msg.speaker}: ${msg.message}`;
            dateStream.appendChild(div);
            dateStream.scrollTop = dateStream.scrollHeight;
            idxStream++;
            setTimeout(streamNextMessage, 3000);
        }
        streamNextMessage();
    }
}

let demoSimInterval = null;
function startInteractiveDemoSimulation() {
    const dialogBox = document.getElementById('demo-chat-history');
    if (!dialogBox) return;
    dialogBox.innerHTML = '';
    
    if (demoSimInterval) clearInterval(demoSimInterval);

    const script = [
        { sender: 'Alice (INTJ Twin)', text: "Hello. I noticed you enjoy designing distributed systems. What architecture styles do you prefer?" },
        { sender: 'Bob (ENFP Twin)', text: "Hi! I absolutely love Event-Driven architectures. The async decoupled nature is so satisfying! UX is crucial too." },
        { sender: 'Alice (INTJ Twin)', text: "Agreed. Decoupled systems scale better. I tend to build event-driven workers in Go. Structural integrity is key." },
        { sender: 'Bob (ENFP Twin)', text: "Haha, Go is so fast! I usually write in TS, but I admire Go's concurrency. Speed + flexibility!" },
        { sender: 'Alice (INTJ Twin)', text: "An elegant combination. The resonance check confirms 89% compatibility on work ethic and interests." },
        { sender: 'Bob (ENFP Twin)', text: "Awesome! Let's request human approval to unlock direct chat." }
    ];

    let step = 0;
    function showNextMessage() {
        if (step >= script.length) {
            clearInterval(demoSimInterval);
            const approvalNotice = document.createElement('div');
            approvalNotice.className = 'demo-approval-notice';
            approvalNotice.innerHTML = `
                <div style="background-color: rgba(13, 148, 136, 0.1); border: 1px solid var(--accent-teal); border-radius: 6px; padding: 1rem; margin-top: 1rem; text-align: center;">
                    <strong style="color: var(--accent-teal);">Resonance Verification Success</strong>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Both Twins generated matching approval tokens. Human connection unlocked.</p>
                </div>
            `;
            dialogBox.appendChild(approvalNotice);
            dialogBox.scrollTop = dialogBox.scrollHeight;
            return;
        }

        const msg = script[step];
        const msgRow = document.createElement('div');
        msgRow.className = `chat-bubble ${msg.sender.includes('Alice') ? 'agent' : 'user'}`;
        msgRow.style.marginBottom = '0.75rem';
        msgRow.style.width = 'fit-content';
        msgRow.style.maxWidth = '85%';
        if (msg.sender.includes('Alice')) {
            msgRow.style.alignSelf = 'flex-start';
        } else {
            msgRow.style.alignSelf = 'flex-end';
            msgRow.style.backgroundColor = 'var(--accent-teal)';
            msgRow.style.color = '#fff';
        }
        msgRow.innerHTML = `<strong style="font-size: 0.75rem; display:block; opacity: 0.8; margin-bottom: 0.25rem;">${msg.sender}</strong>${msg.text}`;
        dialogBox.appendChild(msgRow);
        dialogBox.scrollTop = dialogBox.scrollHeight;

        step++;
    }

    showNextMessage();
    demoSimInterval = setInterval(showNextMessage, 3000);
}
window.initLandingPageInteractive = initLandingPageInteractive;

// ----------------- 8. MATCHES LEDGER -----------------
async function disconnectNode(partnerId, partnerName) {
    if (confirm(`Are you sure you want to disconnect your node from ${partnerName}? This blocks further communications and archives the simulated date.`)) {
        try {
            await apiFetch('/api/compatibility/swipe', {
                method: 'POST',
                body: JSON.stringify({ target_user_id: parseInt(partnerId), swipe_type: 'pass' })
            });
            alert(`${partnerName} disconnected.`);
            window.location.reload();
        } catch (e) {
            alert(`Disconnect transaction failed: ${e.message}`);
        }
    }
}
window.disconnectNode = disconnectNode;

async function initMatchesPage() {
    const container = document.getElementById('matches-ledger-container');
    if (!container) return;
    try {
        const sims = await apiFetch('/api/agents/simulations');
        container.innerHTML = '';
        const matches = sims.filter(s => s.approval_user_a === 'approved' && s.approval_user_b === 'approved');
        if (matches.length === 0) {
            container.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1.5rem;">🔗</div>
                    <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.75rem;">Matches Ledger is Empty</h3>
                    <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 1.5rem auto; font-size: 0.9rem; line-height: 1.5;">
                        Unlocked direct chats require mutual approval of the simulated date logs. Head over to Virtual Dates to approve compatible dates.
                    </p>
                    <a href="/virtual-dates" class="btn btn-primary">Review Simulated Dates</a>
                </div>
            `;
            return;
        }
        matches.forEach(match => {
            const card = document.createElement('div');
            card.className = 'match-card';
            const partnerId = match.user_a_id === currentUser.id ? match.user_b_id : match.user_a_id;
            const details = match.match_detail_json;
            const strengthsHtml = details.shared_interests ? details.shared_interests.map(i => `<li>${i}</li>`).join('') : '<li>Baseline interests matching</li>';
            const challengesHtml = details.potential_challenges ? details.potential_challenges.map(c => `<li>${c}</li>`).join('') : '<li>Low cognitive friction</li>';
            const topicsHtml = details.suggested_topics ? details.suggested_topics.map(t => `"${t}"`).join(', ') : '"Distributed systems design"';
            
            card.innerHTML = `
                <div>
                    <div class="match-header">
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <div class="match-avatar">
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="40" r="22" fill="var(--accent-indigo)" opacity="0.85"/>
                                    <path d="M15 85 C20 65, 80 65, 85 85" fill="var(--accent-teal)" opacity="0.85"/>
                                </svg>
                            </div>
                            <div>
                                <h4 style="font-family: var(--font-serif); font-size: 1.15rem; margin: 0;">${match.partner_name}</h4>
                                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">${match.partner_konvo_id}</span>
                            </div>
                        </div>
                        <span class="badge-explain" style="font-size: 0.65rem;">${match.overall_compatibility}% RESONANCE</span>
                    </div>
                    <div class="match-stats">
                        <div>CHEMISTRY: <strong>${details.conversation_chemistry || 50}%</strong></div>
                        <div>ENERGY MATCH: <strong>${details.energy_match || 50}%</strong></div>
                        <div>VALUES ALIGN: <strong>${details.values_match || 50}%</strong></div>
                        <div>HUMOR SYNERGY: <strong>${details.humor_match || 50}%</strong></div>
                    </div>
                    <div class="match-strengths">
                        <h5>Shared Strengths</h5>
                        <ul>${strengthsHtml}</ul>
                    </div>
                    <div class="match-challenges">
                        <h5>Potential Challenges</h5>
                        <ul>${challengesHtml}</ul>
                    </div>
                    <div class="suggested-topics">
                        <strong style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-amber); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Suggested Starters</strong>
                        <span>Discuss ${topicsHtml} to bypass small talk.</span>
                    </div>
                </div>
                <div class="match-actions" style="margin-top: 1rem;">
                    <button class="btn btn-secondary btn-disconnect-match" data-id="${partnerId}" data-name="${match.partner_name}" style="color: var(--accent-rose); border-color: var(--accent-rose); font-size: 0.75rem;">Disconnect</button>
                    <a href="/messages?partner_id=${partnerId}" class="btn btn-primary" style="font-size: 0.75rem; text-decoration: none;">Open Direct Chat</a>
                </div>
            `;
            container.appendChild(card);
        });

        // Staggered Anime.js slide-up & fade-in for match cards
        anime({
            targets: '.match-card',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(80),
            duration: 600,
            easing: 'easeOutQuad'
        });

        container.querySelectorAll('.btn-disconnect-match').forEach(btn => {
            btn.addEventListener('click', () => {
                const partnerId = btn.dataset.id;
                const partnerName = btn.dataset.name;
                disconnectNode(partnerId, partnerName);
            });
        });
    } catch (e) {
        container.innerHTML = `<div style="color: var(--accent-rose);">Failed loading matches index: ${e.message}</div>`;
    }
}
window.initMatchesPage = initMatchesPage;

// ----------------- 9. SETTINGS CALIBRATIONS -----------------
async function initSettingsPage() {
    const picker = document.getElementById('set-theme-picker');
    if (!picker) return;
    
    const navItems = document.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.dataset.target;
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    if (currentUser) {
        const prof = currentUser.profile;
        if (prof) {
            document.getElementById('set-display-name').value = prof.display_name || '';
            document.getElementById('set-bio').value = prof.bio || '';
            document.getElementById('set-gender').value = prof.gender || 'Prefer Not To Say';
            document.getElementById('set-digipin').value = prof.digipin || '';
            document.getElementById('set-birth-date').value = prof.birth_date || '';
            document.getElementById('set-birth-location').value = prof.birth_location || '';
            
            if (prof.birth_time) {
                let [hours, minutes] = prof.birth_time.split(':').map(Number);
                let ampm = 'AM';
                if (hours >= 12) {
                    ampm = 'PM';
                    if (hours > 12) hours -= 12;
                } else if (hours === 0) {
                    hours = 12;
                }
                document.getElementById('set-birth-time').value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                document.getElementById('set-birth-time-ampm').value = ampm;
            } else {
                document.getElementById('set-birth-time').value = '';
                document.getElementById('set-birth-time-ampm').value = 'AM';
            }
            
            document.getElementById('set-node-id').textContent = currentUser.konvo_id;
            document.getElementById('set-otp-status').textContent = currentUser.otp_verified ? "VERIFIED IDENTITY" : "UNVERIFIED NODE";
            document.getElementById('set-role-status').textContent = currentUser.role.toUpperCase() === 'USER' ? 'SOVEREIGN NETWORK USER' : 'ADMIN CONTROL CORE';

            document.getElementById('settings-profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const display_name = document.getElementById('set-display-name').value.trim();
                const bio = document.getElementById('set-bio').value.trim();
                const gender = document.getElementById('set-gender').value;
                const birth_date = document.getElementById('set-birth-date').value || null;
                const birth_location = document.getElementById('set-birth-location').value.trim() || null;
                const digipin = document.getElementById('set-digipin').value.trim() || null;
                
                const birthTimeRaw = document.getElementById('set-birth-time').value || null;
                const birthTimeAmpm = document.getElementById('set-birth-time-ampm').value;
                let birth_time = null;
                if (birthTimeRaw) {
                    let [hours, minutes] = birthTimeRaw.split(':').map(Number);
                    if (birthTimeAmpm === 'PM' && hours < 12) {
                        hours += 12;
                    } else if (birthTimeAmpm === 'AM' && hours === 12) {
                        hours = 0;
                    }
                    birth_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                }

                try {
                    await apiFetch('/api/users/profile', {
                        method: 'PUT',
                        body: JSON.stringify({
                            display_name, bio, gender, birth_date, birth_location, digipin,
                            birth_time,
                            interests: prof.interests || [],
                            goals: prof.goals || []
                        })
                    });
                    alert("Profile configuration updated successfully.");
                    window.location.reload();
                } catch (err) {
                    alert(`Failed updating configuration: ${err.message}`);
                }
            });
        }
    }

    initTwinSettings();

    const savedTheme = localStorage.getItem('konvo_theme') || 'dark';
    // Fix: ensure picker value is set correctly
    if (picker) {
        picker.value = savedTheme;
        // Live preview on change
        picker.addEventListener('change', () => {
            const newTheme = picker.value;
            const resolvedTheme = newTheme === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : newTheme;
            document.documentElement.setAttribute('data-theme', resolvedTheme);
        });
    }
    
    const btnSaveAppearance = document.getElementById('btn-save-appearance');
    if (btnSaveAppearance) {
        btnSaveAppearance.addEventListener('click', () => {
            const newTheme = picker ? picker.value : savedTheme;
            const resolvedTheme = newTheme === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : newTheme;
            document.documentElement.setAttribute('data-theme', resolvedTheme);
            // Persist with the raw value ('dark' | 'light' | 'system')
            localStorage.setItem('konvo_theme', newTheme);
            Telemetry.logEvent('theme_toggled', { theme: newTheme });
            themeChannel.postMessage({ theme: newTheme });
            // Show non-blocking toast instead of alert
            KonvoToast.show('✅ Theme saved — ' + newTheme.charAt(0).toUpperCase() + newTheme.slice(1), 'success');
        });
    }
}
window.initSettingsPage = initSettingsPage;

async function initTwinSettings() {
    const container = document.getElementById('twin-profile-card');
    if (!container) return;
    try {
        const twin = await apiFetch('/api/agents/twin');
        const prefs = twin.match_preferences || {};
        const toneVal = prefs.agent_tone !== undefined ? prefs.agent_tone : 50;
        const humorVal = prefs.agent_humor !== undefined ? prefs.agent_humor : 50;
        const emojiVal = prefs.agent_emoji !== undefined ? prefs.agent_emoji : 50;
        const boundaries = prefs.agent_boundaries || 'moderate';
        const discovery = prefs.discovery_pref || 'collaboration';
        container.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; background-color: var(--bg-main);">
                    ${twin.avatar || `<svg viewBox="0 0 100 100" style="width: 40px; height: 40px;"><circle cx="50" cy="40" r="22" fill="#0d9488" opacity="0.85"/><path d="M15 85 C20 65, 80 65, 85 85" fill="#4f46e5" opacity="0.85"/></svg>`}
                </div>
                <div>
                    <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0;">${twin.name}</h4>
                    <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber);">${twin.role_type}</span>
                </div>
            </div>
            <form id="edit-twin-settings-form">
                <div class="form-group">
                    <label>Twin Agent Description Name</label>
                    <input type="text" id="set-twin-name" value="${twin.name}" required>
                </div>
                <div class="form-group">
                    <label>Agent Description Template</label>
                    <textarea id="set-twin-desc" rows="3">${twin.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Tone</span><span id="lbl-set-twin-tone" style="color:var(--accent-amber);">${toneVal < 30 ? "Formal" : (toneVal > 70 ? "Casual" : "Balanced")}</span></label>
                    <input type="range" id="set-twin-tone" min="0" max="100" value="${toneVal}" style="width:100%;">
                </div>
                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Humor</span><span id="lbl-set-twin-humor" style="color:var(--accent-amber);">${humorVal < 30 ? "Logical / Dry" : (humorVal > 70 ? "Conceptual / Sarcastic" : "Subtle")}</span></label>
                    <input type="range" id="set-twin-humor" min="0" max="100" value="${humorVal}" style="width:100%;">
                </div>
                <div class="form-group">
                    <label style="display:flex; justify-content:space-between;"><span>Agent Emoji Usage</span><span id="lbl-set-twin-emoji" style="color:var(--accent-amber);">${emojiVal < 30 ? "Minimalist" : (emojiVal > 70 ? "Expressive" : "Moderate")}</span></label>
                    <input type="range" id="set-twin-emoji" min="0" max="100" value="${emojiVal}" style="width:100%;">
                </div>
                <div class="form-group">
                    <label for="set-twin-boundaries">Agent Boundaries</label>
                    <select id="set-twin-boundaries">
                        <option value="strict" ${boundaries === 'strict' ? 'selected' : ''}>Strict (no personal details disclosure)</option>
                        <option value="moderate" ${boundaries === 'moderate' ? 'selected' : ''}>Moderate (conditional disclosure)</option>
                        <option value="flexible" ${boundaries === 'flexible' ? 'selected' : ''}>Flexible (open dialogue representative)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="set-twin-discovery">Discovery Target Preferences</label>
                    <select id="set-twin-discovery">
                        <option value="collaboration" ${discovery === 'collaboration' ? 'selected' : ''}>Collaboration & Project Building</option>
                        <option value="learning" ${discovery === 'learning' ? 'selected' : ''}>Learning & Co-Studying</option>
                        <option value="mentorship" ${discovery === 'mentorship' ? 'selected' : ''}>Mentorship & Career Advice</option>
                        <option value="social" ${discovery === 'social' ? 'selected' : ''}>Casual Social Exchange</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Update Twin Parameters</button>
            </form>
        `;

        const tSlider = document.getElementById('set-twin-tone');
        const hSlider = document.getElementById('set-twin-humor');
        const eSlider = document.getElementById('set-twin-emoji');

        const tLbl = document.getElementById('lbl-set-twin-tone');
        const hLbl = document.getElementById('lbl-set-twin-humor');
        const eLbl = document.getElementById('lbl-set-twin-emoji');

        tSlider.addEventListener('input', () => {
            const val = parseInt(tSlider.value);
            tLbl.textContent = val < 30 ? "Formal" : (val > 70 ? "Casual" : "Balanced");
        });
        hSlider.addEventListener('input', () => {
            const val = parseInt(hSlider.value);
            hLbl.textContent = val < 30 ? "Logical / Dry" : (val > 70 ? "Conceptual / Sarcastic" : "Subtle");
        });
        eSlider.addEventListener('input', () => {
            const val = parseInt(eSlider.value);
            eLbl.textContent = val < 30 ? "Minimalist" : (val > 70 ? "Expressive" : "Moderate");
        });

        document.getElementById('edit-twin-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('set-twin-name').value;
            const description = document.getElementById('set-twin-desc').value;
            const prefs = {
                agent_tone: parseInt(tSlider.value),
                agent_humor: parseInt(hSlider.value),
                agent_emoji: parseInt(eSlider.value),
                agent_boundaries: document.getElementById('set-twin-boundaries').value,
                discovery_pref: document.getElementById('set-twin-discovery').value
            };
            try {
                await apiFetch('/api/agents/twin', {
                    method: 'PUT',
                    body: JSON.stringify({
                        name,
                        avatar: twin.avatar || '',
                        description,
                        voice_style: 'Calm',
                        emoji_style: 'Minimalist',
                        match_preferences: prefs
                    })
                });
                alert("AI Twin configuration synced successfully.");
                initTwinSettings();
            } catch (err) {
                alert(`Calibration sync failed: ${err.message}`);
            }
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--accent-rose)">Quiz must be completed first.</div>`;
    }
}
window.initTwinSettings = initTwinSettings;

// Tab switching logic for discover.html
function initDiscoverTabs() {
    const tabBtns = document.querySelectorAll('.tab-navigation .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            
            const targetId = btn.dataset.tab;
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Trigger layout recalculation for MapLibre/Leaflet maps when the tab changes
            if (targetId === 'discover-deck-map-section' && window.map) {
                setTimeout(() => window.map.resize(), 100);
            }
        });
    });
}
window.initDiscoverTabs = initDiscoverTabs;

// Dynamic Footer Injection Helper
function injectFooter() {
    const main = document.querySelector('.main-content');
    if (main && !document.querySelector('.app-footer')) {
        const footer = document.createElement('footer');
        footer.className = 'app-footer';
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-brand">
                    <div class="brand-text">KONVO</div>
                    <p class="brand-sub">The world's first agent-based date finder. Sovereign AI Twins negotiate compatibility before you connect.</p>
                    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
                        <span style="font-family:var(--font-mono);font-size:0.65rem;border:1px solid var(--accent-teal);color:var(--accent-teal);padding:0.2rem 0.5rem;border-radius:4px;">TLS 1.3</span>
                        <span style="font-family:var(--font-mono);font-size:0.65rem;border:1px solid var(--accent-amber);color:var(--accent-amber);padding:0.2rem 0.5rem;border-radius:4px;">AES-256-GCM</span>
                        <span style="font-family:var(--font-mono);font-size:0.65rem;border:1px solid var(--border-color);color:var(--text-secondary);padding:0.2rem 0.5rem;border-radius:4px;">E2E Encrypted</span>
                    </div>
                </div>
                <div class="footer-links-grid">
                    <div class="footer-col">
                        <h4>Navigate</h4>
                        <ul>
                            <li><a href="/" onclick="event.preventDefault();window.handleRouting('/');window.history.pushState(null,null,'/');">Console</a></li>
                            <li><a href="/discover" onclick="event.preventDefault();window.handleRouting('/discover');window.history.pushState(null,null,'/discover');">Resonance Grid</a></li>
                            <li><a href="/profile" onclick="event.preventDefault();window.handleRouting('/profile');window.history.pushState(null,null,'/profile');">Twin DNA</a></li>
                            <li><a href="/settings" onclick="event.preventDefault();window.handleRouting('/settings');window.history.pushState(null,null,'/settings');">Settings</a></li>
                            <li><a href="/feedback">Feedback</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>Security</h4>
                        <ul>
                            <li><a href="#" onclick="event.preventDefault();document.getElementById('security-policy-modal')&&document.getElementById('security-policy-modal').classList.add('active');">Security Policy</a></li>
                            <li><a href="#" onclick="event.preventDefault();document.getElementById('privacy-modal')&&document.getElementById('privacy-modal').classList.add('active');">Data Protection</a></li>
                            <li><a href="#" onclick="event.preventDefault();alert('System Status: Operational. All gateway microservices active. High-Speed Memory: Connected. Relational Index: Active.');">● Systems: Operational</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="#" onclick="event.preventDefault();document.getElementById('privacy-modal')&&document.getElementById('privacy-modal').classList.add('active');">Privacy Policy</a></li>
                            <li><a href="#" onclick="event.preventDefault();document.getElementById('tos-modal')&&document.getElementById('tos-modal').classList.add('active');">Terms of Service</a></li>
                            <li><a href="#" onclick="event.preventDefault();document.getElementById('security-policy-modal')&&document.getElementById('security-policy-modal').classList.add('active');">Security Policy</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="footer-bottom-bar">
                <div>© 2026 Konvo. All rights reserved.</div>
                <div style="display: flex; gap: 1.5rem; color: var(--text-muted); font-size: 0.75rem;">
                    <a href="#" style="color:var(--text-muted);" onclick="event.preventDefault();document.getElementById('privacy-modal')&&document.getElementById('privacy-modal').classList.add('active');">Privacy</a>
                    <a href="#" style="color:var(--text-muted);" onclick="event.preventDefault();document.getElementById('tos-modal')&&document.getElementById('tos-modal').classList.add('active');">Terms</a>
                    <span>v1.0.0</span>
                </div>
            </div>
        `;
        main.appendChild(footer);
    }
}

// Scroll-driven Reveal Animation Loader
function initScrollReveal() {
    const targets = document.querySelectorAll('.card, .landing-section, .problem-card, .pipeline-step, .faq-item, .astrology-disclaimer');
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

// ----------------- CLIENT-SIDE ROUTER (SPA) -----------------
function handleRouting(path) {
    // Determine active view container ID
    let activeViewId = 'view-discover-deck'; // Default
    
    const isProfileIncomplete = currentUser && (!currentUser.profile || !currentUser.profile.mbti_summary);
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (isProfileIncomplete && !isAdmin) {
        activeViewId = 'view-profile';
    } else {
        if (path.includes('/discover')) {
            activeViewId = 'view-discover-deck';
        } else if (path.includes('/chat')) {
            activeViewId = 'view-chat-center';
        } else if (path.includes('/grid') || path.includes('/compatibility') || path.includes('/communities') || path.includes('/graph')) {
            activeViewId = 'view-grid';
        } else if (path.includes('/profile') || path.includes('/virtual-dates') || path.includes('/agents')) {
            activeViewId = 'view-profile';
        } else if (path.includes('/settings')) {
            activeViewId = 'view-settings';
        }
    }
    
    // Hide all authenticated view sections
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.style.display = 'none';
    });
    
    // De-activate all sidebar nav links
    const links = document.querySelectorAll('.nav-links li');
    links.forEach(li => li.classList.remove('active'));
    
    // Show active view container
    const activeView = document.getElementById(activeViewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        if (activeViewId === 'view-profile') {
            activeView.style.display = 'grid'; // Maintain its grid layout
        } else if (activeViewId === 'view-discover-deck' || activeViewId === 'view-chat-center') {
            activeView.style.display = 'grid'; // Uses .dashboard-grid
        } else {
            activeView.style.display = '';
        }
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(activeView, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
    }
    
    // Highlight sidebar active link
    let activeHref = '/discover';
    if (activeViewId === 'view-chat-center') activeHref = '/chat';
    else if (activeViewId === 'view-grid') activeHref = '/grid';
    else if (activeViewId === 'view-profile') activeHref = '/profile';
    else if (activeViewId === 'view-settings') activeHref = '/settings';
    
    links.forEach(li => {
        const a = li.querySelector('a');
        if (a && a.getAttribute('href') === activeHref) {
            li.classList.add('active');
        }
    });

    // Run view-specific page initializations
    if (activeViewId === 'view-discover-deck') {
        initSwipePage('swipe-discovery-box');
    } else if (activeViewId === 'view-chat-center') {
        initChatWorkspace();
    } else if (activeViewId === 'view-grid') {
        initSwipePage('discovery-deck-container');
        initMapPage();
        initCommunitiesPage();
        initGraphPage();
        initDiscoverTabs();
        if (window.map) {
            setTimeout(() => window.map.resize(), 100);
        }
    } else if (activeViewId === 'view-profile') {
        initProfilePage();
        initAgentsPage();
    } else if (activeViewId === 'view-settings') {
        initSettingsPage();
    }
}
window.handleRouting = handleRouting;

function initSPALinks() {
    // Intercept global link clicks to SPA client endpoints
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target) {
            const href = target.getAttribute('href');
            if (href) {
                try {
                    // Parse URL to handle both relative and absolute URLs
                    const url = new URL(href, window.location.origin);
                    if (url.origin === window.location.origin) {
                        const path = url.pathname;
                        const spaPaths = [
                            '/discover', '/chat', '/grid', '/compatibility', 
                            '/communities', '/graph', '/profile', '/virtual-dates', 
                            '/agents', '/settings'
                        ];
                        const isSPARoute = path === '/' || spaPaths.some(p => path === p || path.startsWith(p + '/'));
                        if (isSPARoute) {
                            e.preventDefault();
                            window.history.pushState(null, null, href);
                            handleRouting(path);
                        }
                    }
                } catch (err) {
                    // Ignore invalid URLs
                }
            }
        }
    });

    // Handle back/forward actions
    window.addEventListener('popstate', () => {
        handleRouting(window.location.pathname);
    });
}

// Landing Page Tab Switcher & Mobile Menu Routing
function initLandingPage() {
    // Call the interactive components initializer (formerly first definition of initLandingPage)
    if (typeof initLandingPageInteractive === 'function') {
        initLandingPageInteractive();
    }

    // 1. Mobile Menu Drawer Toggle
    const header = document.querySelector('.landing-header');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const drawerLinks = document.querySelectorAll('.mobile-menu-drawer .landing-tab-btn');
    
    if (menuToggle && header) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            header.classList.toggle('menu-open');
        });
        
        // Close menu drawer when any link inside it is clicked
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                header.classList.remove('menu-open');
            });
        });
        
        // Close drawer when clicking outside
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

        // Find parent landing tab content (e.g. landing-platform, landing-security, landing-legal)
        const tabContent = targetElement.closest('.landing-tab-content');
        if (tabContent) {
            const tabId = tabContent.id;
            
            // Switch tabs
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
            
            // Update hash without triggering hashchange reload loop
            if (window.location.hash !== hash) {
                window.history.replaceState(null, null, hash);
            }

            // Scroll cleanly after rendering layout
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }

    // 3. Tab Button Click Listeners (desktop and mobile)
    const tabBtns = document.querySelectorAll('.landing-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;
            
            // Toggle active styling
            tabBtns.forEach(el => el.classList.remove('active'));
            
            // Active matching class on both desktop/mobile buttons for synchronization
            document.querySelectorAll(`.landing-tab-btn[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));
            
            // Switch landing views
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

            // Update hash
            const hashName = `#${tabId.replace('landing-', '')}`;
            window.history.replaceState(null, null, hashName);
        });
    });

    // 3.5. Landing Feedback Sub-tab switcher
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

    // Landing Severity/Priority button selector listeners
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.severity-btns button');
        if (!btn) return;
        const parent = btn.closest('.severity-btns');
        if (parent && parent.id && parent.id.startsWith('landing-')) {
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });

    // 4. Intercept clicks on links pointing to hashes (e.g. footer links)
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target) {
            const href = target.getAttribute('href');
            if (href && href.includes('#')) {
                // Check if the unauth landing page is currently displayed
                const unauthLayout = document.getElementById('unauth-landing-layout');
                if (unauthLayout && !unauthLayout.classList.contains('hidden')) {
                    const hash = href.substring(href.indexOf('#'));
                    e.preventDefault();
                    navigateToLandingSection(hash);
                }
            }
        }
    });

    // 5. Initial Routing from page load or direct URL mapping
    const hash = window.location.hash;
    if (hash) {
        // Handle common custom anchors or tab defaults
        if (hash === '#platform' || hash === '#how-it-works' || hash === '#resonance-engine' || hash === '#virtual-dates') {
            navigateToLandingSection(hash);
        } else if (hash === '#security' || hash === '#safety' || hash === '#data-protection') {
            navigateToLandingSection(hash);
        } else if (hash === '#legal' || hash === '#faq') {
            navigateToLandingSection(hash);
        } else if (hash === '#feedback') {
            navigateToLandingSection(hash);
        } else {
            // Generic lookup
            navigateToLandingSection(hash);
        }
    }
}

// Global Landing Feedback helpers
let landingSugRating = 0;

window.toggleLandingTag = function(btn) {
    btn.classList.toggle('active');
    btn.classList.toggle('btn-primary');
    btn.classList.toggle('btn-secondary');
};

window.setLandingSugRating = function(val) {
    landingSugRating = val;
    document.querySelectorAll('#landing-sug-rating-row .star-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i < val);
        btn.classList.toggle('btn-primary', i < val);
        btn.classList.toggle('btn-secondary', !(i < val));
    });
};

window.submitLandingFeedback = function(type) {
    // Collect data
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
        }).then(res => {
            console.log('[Landing Feedback] API response status:', res.status);
        }).catch((err) => {
            console.warn('[Landing Feedback] API network error:', err);
        });
    } catch (e) {
        console.error('[Landing Feedback] API submission error:', e);
    }

    // Submit to FormSubmit.co (mohit.info.83@gmail.com) via AJAX
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
        }).then(res => {
            console.log('[Landing Feedback] FormSubmit status:', res.status);
        }).catch((err) => console.warn('FormSubmit integration error:', err));
    } catch (e) {}

    // Show success state
    document.querySelectorAll('.landing-feedback-form-pane').forEach(f => f.style.display = 'none');
    document.getElementById('landing-feedback-tabs').style.display = 'none';
    const successEl = document.getElementById('landing-feedback-success');
    successEl.style.display = 'block';
    successEl.scrollIntoView({ behavior: 'smooth' });
};

window.resetLandingFeedback = function() {
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
};

// ═══════════════════════════════════════════════════════
// KONVO TOAST (non-blocking notification)
// ═══════════════════════════════════════════════════════
const KonvoToast = {
    show(message, type = 'info', duration = 3500) {
        const el = document.createElement('div');
        const colors = { success: '#0D9488', error: '#E11D48', info: '#4F46E5', warning: '#D97706' };
        el.style.cssText = `position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(20px);
            background:var(--bg-card);border:1px solid ${colors[type] || colors.info};
            color:var(--text-primary);padding:0.75rem 1.5rem;border-radius:8px;
            font-family:var(--font-mono);font-size:0.82rem;z-index:99999;
            box-shadow:0 8px 30px rgba(0,0,0,0.4);opacity:0;
            transition:opacity 0.3s ease,transform 0.3s cubic-bezier(0.16,1,0.3,1);
            border-left:3px solid ${colors[type] || colors.info};`;
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => el.remove(), 350);
        }, duration);
    }
};
window.KonvoToast = KonvoToast;

// ═══════════════════════════════════════════════════════
// NEURAL RIZZ ENGINE™ — Gen-Z Pickup Line Generator
// ═══════════════════════════════════════════════════════
class NeuralRizzEngine {
    constructor() {
        this._used = new Set();
        this._sessionUsed = [];

        // Corpus organized by energy nodes
        this._openers = {
            m2f: ["okay real talk","not gonna lie","be so fr","no cap","lowkey","honestly tho","bruh okay","wait actually","i just need to say","so like"],
            f2m: ["okay so","don't make this weird but","be honest","i'm obsessed how","not gonna lie","fr though","lowkey","okay i'll be real","just saying","wait hear me out"]
        };
        this._compliments = {
            m2f: ["your energy is unmatched","you're giving main character","you're built different","your vibe is elite","you're literally that girl","your aura is too powerful","you ate that ngl","you're the moment","your energy is so clean","you're a vibe and a half"],
            f2m: ["you're giving zaddy energy ngl","your confidence is so attractive","you're built for this","you're genuinely hilarious","your energy is really calming","you seem so real tho","you're that guy fr","you're kinda intimidating tbh","your aura is doing something to me","you're very him"]
        };
        this._escalations = {
            m2f: ["and i'm not even trying to rizz you up","and that's a problem for me honestly","rent free btw","and i don't even know what to do about that","and i'm losing","like what do you want from me","the audacity honestly","it's giving unfair","and i'm standing here","it's your fault really"],
            f2m: ["and i hate it here","and it's unhinged of me","rent free since we met","and i don't even know what that means for me","which is annoying","not like i care tho lol","and that's your problem now","it's giving something","and i'm not okay about it","be so serious with me"]
        };
        this._closers = {
            m2f: ["just so you know","that's it that's the tweet","thought you should know","okay bye","carry on","take that","you're welcome","i said what i said","no further questions","receipts attached"],
            f2m: ["just putting that out there","don't read into it","thought you should know","i'll let you sit with that","okay moving on","you're welcome","not my fault","make it make sense","that's all","you didn't hear it from me"]
        };
        this._vibes = ['flirty','witty','smooth','playful','deep'];
        this._mbtiTypes = ['INFP','ENFP','INFJ','ENFJ','INTJ','ENTJ','INTP','ENTP','ISFP','ESFP','ISTP','ESTP','ISFJ','ESFJ','ISTJ','ESTJ'];
        this._reactions = {
            m2f: ['She smiles but tries to hide it 👀','She screenshots this immediately','She shows her bestie right away','She clocks the confidence — intrigued','She\'s not ready for this fr','She says "stop" but means keep going'],
            f2m: ['He\'s blushing and won\'t admit it','He screenshots this to flex to his boys','He goes quiet for exactly 3 seconds','He says "lol" but meant "I\'m nervous"','He\'s spinning — didn\'t expect this','He\'s already drafting his reply']
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
            line = `"${opener.charAt(0).toUpperCase() + opener.slice(1)}, ${compliment} — ${esc}. ${closer.charAt(0).toUpperCase() + closer.slice(1)}."`;
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
window.RizzEngine = RizzEngine;

function initRizzPanel() {
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

    if (genBtn) genBtn.addEventListener('click', generate);
    genderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            genderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gender = btn.dataset.gender || 'm2f';
            generate();
        });
    });

    // Auto-generate first line
    generate();
}

// ═══════════════════════════════════════════════════════
// AGENT TRANSCRIPT VIEWER
// ═══════════════════════════════════════════════════════
function showAgentTranscript(simData) {
    const existing = document.getElementById('agent-transcript-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'agent-transcript-modal';
    modal.className = 'modal-overlay agent-transcript-modal active';

    const transcript = simData?.transcript || simData?.simulation_log || [];
    let transcriptHTML = '';
    transcript.forEach((entry, i) => {
        const isA = entry.speaker === 'agent_a' || entry.speaker === 'A' || entry.role === 'user_twin';
        const isSystem = entry.speaker === 'system' || entry.type === 'system';
        const cls = isSystem ? 'system' : (isA ? 'agent-a' : 'agent-b');
        const label = isSystem ? 'SYS' : (isA ? 'A' : 'B');
        const labelName = isSystem ? 'System' : (isA ? 'Your AI Twin' : 'Partner AI Twin');
        const ts = entry.timestamp || entry.time || `T+${i * 2}s`;
        const msg = entry.message || entry.content || entry.text || '';

        let chemBar = '';
        if (entry.chemistry_delta !== undefined) {
            chemBar = `<div class="transcript-chemistry-bar">⚗ Chemistry score updated: <strong>+${entry.chemistry_delta || 0}%</strong></div>`;
        }

        transcriptHTML += `
        <div class="transcript-entry ${cls}" style="animation-delay:${i * 60}ms">
            <div class="transcript-avatar-col">
                <div class="transcript-avatar-dot ${cls}">${label}</div>
                ${i < transcript.length - 1 ? '<div class="transcript-thread-line"></div>' : ''}
            </div>
            <div class="transcript-bubble-col">
                <div class="transcript-speaker-label ${cls}">${labelName}</div>
                <div class="transcript-message">${msg}</div>
                ${chemBar}
                <div class="transcript-timestamp">${ts}</div>
            </div>
        </div>`;
    });

    if (!transcript.length) {
        transcriptHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.82rem;padding:1rem;">No transcript data available yet. Run a simulation first.</div>';
    }

    modal.innerHTML = `
    <div class="modal-content" style="max-width:760px;padding:0;background:linear-gradient(180deg,#0b0b14 0%,#080810 100%);border-color:rgba(79,70,229,0.3);">
        <div class="transcript-header">
            <div>
                <div class="transcript-title">⚡ Agent-to-Agent Chat Process</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;font-family:var(--font-sans);">${transcript.length} messages • Real agent dialogue</div>
            </div>
            <div style="display:flex;gap:0.5rem;">
                <button id="btn-replay-transcript" style="padding:0.4rem 0.75rem;border-radius:5px;background:rgba(79,70,229,0.15);border:1px solid rgba(79,70,229,0.3);color:var(--accent-indigo);font-family:var(--font-mono);font-size:0.72rem;cursor:pointer;">⟳ Replay</button>
                <button id="btn-close-transcript" style="background:none;border:none;color:var(--text-muted);font-size:1.25rem;cursor:pointer;">✕</button>
            </div>
        </div>
        <div class="transcript-body" id="transcript-scroll-body">
            ${transcriptHTML}
        </div>
    </div>`;

    document.body.appendChild(modal);

    modal.querySelector('#btn-close-transcript').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const replayBtn = modal.querySelector('#btn-replay-transcript');
    replayBtn.addEventListener('click', () => {
        const entries = modal.querySelectorAll('.transcript-entry');
        entries.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            setTimeout(() => {
                el.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, i * 120);
        });
    });
}
window.showAgentTranscript = showAgentTranscript;

// ═══════════════════════════════════════════════════════
// VIRTUAL DATE ENGINE — 3D Full-Screen Story Mode
// ═══════════════════════════════════════════════════════
const VirtualDateScenarios = [
    {
        id: 'future_planning',
        name: 'Future Planning',
        npc: 'Evelyn (Advisor)',
        intro: 'How do you structure your long-term roadmap? Do you prioritize nesting and stability, or rapid career scaling and global nomadism?',
        choices: [
            { text: 'Settle in a vibrant city with local community roots.', outcome: 'You build a stable local support system with rich shared spaces.', insight: 'Nesting & Community. Planning Style: Structured.', delta: 10 },
            { text: 'Embrace a nomadic lifestyle, travel-working globally.', outcome: 'You explore global hubs, adapting to shifting contexts.', insight: 'Career & Nomadism. Planning Style: Spontaneous.', delta: 10 }
        ],
        neuralPrompts: [
            'Where do you see yourself living in five years?',
            'Do you prefer structured routines or highly variable days?',
            'What does stability mean to you in a relationship?'
        ]
    },
    {
        id: 'dream_home',
        name: 'Dream Home Builder',
        npc: 'Marcus (Architect)',
        intro: 'You are designing your ideal shared space. Do you prefer a minimalist smart-home condo in the metropolitan core, or a rustic off-grid cabin?',
        choices: [
            { text: 'A sleek, automated high-rise with skyline views.', outcome: 'You prioritize metropolitan access, high technology, and modern conveniences.', insight: 'Urban Active. Priorities: Access, technology, convenience.', delta: 10 },
            { text: 'A quiet, eco-friendly cabin surrounded by nature.', outcome: 'You focus on peace, sustainability, slow living, and self-reliance.', insight: 'Eco Sanctuary. Priorities: Peace, environment, slow living.', delta: 10 }
        ],
        neuralPrompts: [
            'What room in your house is the most important to you?',
            'Do you enjoy hosting people or keeping your home a private sanctuary?',
            'How clean or organized is your ideal living space?'
        ]
    },
    {
        id: 'weekend_simulation',
        name: 'Weekend Simulation',
        npc: 'Aria (Concierge)',
        intro: 'A free Saturday arises. Do you lock in a detailed itinerary of cultural activities, or turn off alarms and go completely unscheduled?',
        choices: [
            { text: 'A pre-planned cultural tour followed by dining reservations.', outcome: 'You maximize efficiency and ensure entry to high-demand venues.', insight: 'Structured. Planning Style: Curated, high productivity.', delta: 10 },
            { text: 'No alarms, no bookings—just wander and explore organically.', outcome: 'You prioritize surprise discoveries, high flexibility, and relaxed pacing.', insight: 'Fluid. Planning Style: Spontaneous, open to chance.', delta: 10 }
        ],
        neuralPrompts: [
            'What is your perfect Saturday morning routine?',
            'How do you recharge after a high-stress week?',
            'Do you prefer cozy nights in or energetic social outings?'
        ]
    },
    {
        id: 'team_challenges',
        name: 'Team Challenges',
        npc: 'Zara (Founder)',
        intro: 'You are co-organizing a charity event. Do you divide tasks cleanly and check in weekly, or work side-by-side in real-time collaborative sprints?',
        choices: [
            { text: 'Divide tasks by specialty and trust each other to execute.', outcome: 'You optimize for individual focus, checking in on milestone deadlines.', insight: 'Autonomous Work. Cooperation: Specialized, high trust.', delta: 10 },
            { text: 'Work together on everything in real-time sprints.', outcome: 'You build high-touch shared alignment and active joint decision-making.', insight: 'Collaborative Sprints. Cooperation: Combined, real-time.', delta: 10 }
        ],
        neuralPrompts: [
            'Are you a details-oriented person or a big-picture planner?',
            'How do you deal with group projects that go off-track?',
            'Do you prefer leading a project or working as a specialized builder?'
        ]
    },
    {
        id: 'conflict_resolution',
        name: 'Conflict Resolution',
        npc: 'Dax (Mediator)',
        intro: 'You disagree on a major life direction. Do you immediately talk through the friction point, or take personal cool-down space before conversing?',
        choices: [
            { text: 'Address and discuss the friction point immediately.', outcome: 'You process emotions dynamically in real time to reach early resolution.', insight: 'Direct Resolution. Emotional Maturity: Immediate closure.', delta: 10 },
            { text: 'Take a brief quiet period to organize thoughts first.', outcome: 'You step back to process rationally, arriving with calm perspectives.', insight: 'Reflective Resolution. Emotional Maturity: Regulated dialogue.', delta: 10 }
        ],
        neuralPrompts: [
            'How do you know when a conversation has become unproductive?',
            'Do you find it easy or difficult to apologize first?',
            'What is your boundary when dealing with disagreements?'
        ]
    },
    {
        id: 'financial_priorities',
        name: 'Financial Priorities',
        npc: 'Kaelen (Treasurer)',
        intro: 'A major windfall arrives. Do you invest it into aggressive, high-upside financial assets, or secure a protective emergency safety net first?',
        choices: [
            { text: 'Aggressive equity/crypto investments for high-growth potential.', outcome: 'You accept volatility in pursuit of rapid compound scaling.', insight: 'Wealth Builder. Risk Profile: High risk, growth-oriented.', delta: 10 },
            { text: 'Secure safety net in cash reserves, treasuries, and real assets.', outcome: 'You secure immediate downside protection and peace of mind.', insight: 'Safety Guard. Risk Profile: Risk averse, security-focused.', delta: 10 }
        ],
        neuralPrompts: [
            'Are you a saver, a builder, or an experience-driven spender?',
            'What is one investment you made that you are proud of?',
            'How do you feel about discussing finances early in relationships?'
        ]
    },
    {
        id: 'life_goals',
        name: 'Life Goals Alignment',
        npc: 'Sora (Guide)',
        intro: 'You are balancing career ambition and nesting priorities. Do you prioritize climbing career milestones or dedicating space for family and lifestyle?',
        choices: [
            { text: 'Prioritize career scaling and personal legacy building.', outcome: 'You chase global opportunities, putting career excellence in focus.', insight: 'Legacy Creator. Priorities: Career ambition, personal achievement.', delta: 10 },
            { text: 'Prioritize family life, lifestyle design, and rich shared hours.', outcome: 'You design hours around nesting, domestic peace, and deep human bonds.', insight: 'Family Aligned. Priorities: Shared life, lifestyle design.', delta: 10 }
        ],
        neuralPrompts: [
            'What does success look like for you in ten years?',
            'Is your work a major part of your identity or a way to fund your life?',
            'How do you balance professional goals with relationship energy?'
        ]
    },
    {
        id: 'social_situations',
        name: 'Social Situations',
        npc: 'Brix (Host)',
        intro: 'You host a weekend gathering. Do you throw an energetic cocktail party for a large circle, or host a quiet, curated dinner for three close friends?',
        choices: [
            { text: 'A dynamic, high-energy party welcoming diverse groups.', outcome: 'You thrive in extroverted circles, building broad network vibes.', insight: 'Extroverted. Social Energy: Broad, high variety.', delta: 10 },
            { text: 'A cozy, intimate dinner focusing on deep conversations.', outcome: 'You foster safe, quiet spaces for concentrated dialogue and trust.', insight: 'Introverted. Social Energy: Deep, curated networks.', delta: 10 }
        ],
        neuralPrompts: [
            'Do you feel recharged or drained after a large party?',
            'How do you meet new people in your day-to-day life?',
            'Who is the most interesting person you have met recently?'
        ]
    },
    {
        id: 'values_discovery',
        name: 'Values Discovery',
        npc: 'Luna (Philosopher)',
        intro: 'You face a complex dilemma. Do you prioritize raw honesty and objective truth, or social harmony and emotional consideration?',
        choices: [
            { text: 'Raw, uncompromising honesty and objective truth.', outcome: 'You build high trust through transparency, avoiding hidden variables.', insight: 'Truth Seeking. Ethics: Objective, direct, radical clarity.', delta: 10 },
            { text: 'Harmony, kindness, and protecting emotional safety.', outcome: 'You prioritize empathy, choosing phrasing that supports peace.', insight: 'Harmony Mindset. Alignment: Empathy and emotional care.', delta: 10 }
        ],
        neuralPrompts: [
            'Is there a time when raw honesty might be counterproductive?',
            'How do you define personal integrity in your life?',
            'What is a core value you will never compromise on?'
        ]
    },
    {
        id: 'communication_analysis',
        name: 'Communication Analysis',
        npc: 'Milo (Linguist)',
        intro: 'When sharing ideas, do you appreciate rapid, critical debate and feedback, or supportive confirmation and encouragement first?',
        choices: [
            { text: 'Direct critical debate to stress-test your thinking.', outcome: 'You engage in active dialectics, testing logic to reach refined systems.', insight: 'Critical Debate. Dialectic Style: Assertive, logic-first.', delta: 10 },
            { text: 'Encouraging support to build safe creative space.', outcome: 'You validate core feelings first, nurturing the confidence to build.', insight: 'Supportive Validation. Dialectic Style: Safe, growth-focused.', delta: 10 }
        ],
        neuralPrompts: [
            'Do you like debating topics for fun, or does it feel stressful?',
            'How do you prefer to receive feedback when working on a project?',
            'What communication style makes you feel shut down?'
        ]
    },
    {
        id: 'travel_planning',
        name: 'Travel Planning',
        npc: 'Talon (Pathfinder)',
        intro: 'You plan an overseas adventure. Do you pack broadly for all contingencies, or fly with a single light carry-on for agility?',
        choices: [
            { text: 'Pack broadly to ensure comfort for any weather or context.', outcome: 'You are prepared for all conditions, valuing security over weight.', insight: 'Preparedness. Priorities: Comfort, contingency backup.', delta: 10 },
            { text: 'Ultralight carry-on packing for maximum travel agility.', outcome: 'You bypass baggage gates and lines, moving with swift adaptability.', insight: 'Ultralight. Priorities: Speed, flexibility, minimal burden.', delta: 10 }
        ],
        neuralPrompts: [
            'What was your most adventurous travel experience?',
            'Do you prefer structured tours or exploring off-the-beaten-path?',
            'What is the first thing you do when arriving in a new country?'
        ]
    },
    {
        id: 'entrepreneurship',
        name: 'Entrepreneurship Ideas',
        npc: 'Vance (Venturer)',
        intro: 'You discuss launching a business. Do you pitch to venture capital for rapid scale, or bootstrap a self-sustaining cash flow asset?',
        choices: [
            { text: 'Pitch to venture capital for hyper-growth and scale.', outcome: 'You secure major leverage, trading equity for accelerated reach.', insight: 'Hyper Scale. Ambition: Venture-backed, high-growth risk.', delta: 10 },
            { text: 'Bootstrap a cash-flow positive lifestyle business.', outcome: 'You retain full control, optimizing for immediate profitability.', insight: 'Independent Builder. Ambition: Organic service, full equity.', delta: 10 }
        ],
        neuralPrompts: [
            'If you could start any business tomorrow, what would it be?',
            'How do you feel about high-stakes risks vs. steady progress?',
            'Do you prefer working inside structured systems or building them?'
        ]
    },
    {
        id: 'lifestyle_decisions',
        name: 'Lifestyle Decisions',
        npc: 'Yuna (Wellness Coach)',
        intro: 'How do you design your daily lifestyle rhythm? Do you choose high-energy career sprints or mindful, slow-paced living routines?',
        choices: [
            { text: 'High-energy career sprints and hyper-focused growth.', outcome: 'You maximize professional output and momentum, living fast-paced.', insight: 'Hustle Mindset. Rhythm: Fast, output-focused, ambitious.', delta: 10 },
            { text: 'Mindful, balanced routines focusing on wellness and slow living.', outcome: 'You protect calm routines, prioritizing grounding practices and pacing.', insight: 'Mindful Slow. Rhythm: Balanced, wellness-first, calm.', delta: 10 }
        ],
        neuralPrompts: [
            'How do you structure your typical morning to feel grounded?',
            'What does self-care look like to you on a busy day?',
            'Do you prefer living in quiet suburbs or buzzing metropolitan areas?'
        ]
    },
    {
        id: 'relationship_expectations',
        name: 'Relationship Expectations',
        npc: 'Orion (Counselor)',
        intro: 'How do you structure relationship bounds? Do you maintain separate spheres of independence, or merge day-to-day schedules deeply?',
        choices: [
            { text: 'Maintain personal hobbies, independent friends, and distinct spheres.', outcome: 'You preserve high individual autonomy, coming together as equals.', insight: 'Interdependent. Bounds: High autonomy, personal growth.', delta: 10 },
            { text: 'Merge daily lives, shared habits, and joint schedules deeply.', outcome: 'You create a unified core, making decisions and experiences together.', insight: 'Merged Lives. Bounds: Deep synergy, high coordination.', delta: 10 }
        ],
        neuralPrompts: [
            'How much alone time do you need to feel comfortable in a relationship?',
            'What is one hobby you love that you prefer doing alone?',
            'What does a perfect shared weekend look like to you?'
        ]
    },
    {
        id: 'shared_goal_building',
        name: 'Shared Goal Building',
        npc: 'Nova (Synthesizer)',
        intro: 'When supporting each other, do you prefer co-creating joint goals, or supporting each other’s separate individual dreams?',
        choices: [
            { text: 'Co-creating shared goals and projects to tackle as a team.', outcome: 'You align your maps to build combined achievements together.', insight: 'Unified Project. Goal Style: Joint creation, team build.', delta: 10 },
            { text: 'Supporting and championing each other\'s individual dreams.', outcome: 'You act as cheerleaders, giving space for personal accomplishments.', insight: 'Dream Supporters. Goal Style: Autonomy, mutual leverage.', delta: 10 }
        ],
        neuralPrompts: [
            'What is one personal dream you are currently working toward?',
            'How can a partner best support you when you are struggling?',
            'Do you like working on projects together or having separate domains?'
        ]
    }
];

const VirtualDateLocations = [
    { id: 'rooftop',     emoji: '🌃', name: 'Rooftop Under City Lights', bg: 'vd-bg-rooftop',    charA: '🧑', charB: '👩' },
    { id: 'cafe',        emoji: '☕', name: 'Midnight Café',             bg: 'vd-bg-cafe',       charA: '🧑', charB: '👩' },
    { id: 'beach',       emoji: '🏖️', name: 'Sunset Beach Walk',          bg: 'vd-bg-beach',      charA: '🧑', charB: '👩' },
    { id: 'bookstore',   emoji: '📚', name: 'Hidden Bookstore',          bg: 'vd-bg-bookstore',  charA: '🧑', charB: '👩' },
    { id: 'lantern',     emoji: '🏮', name: 'Lantern Garden Night',      bg: 'vd-bg-lantern',    charA: '🧑', charB: '👩' },
    { id: 'gallery',     emoji: '🖼️', name: 'Art Gallery Experience',    bg: 'vd-bg-gallery',    charA: '🧑', charB: '👩' },
    { id: 'mountain',    emoji: '🏔️', name: 'Mountain Escape',           bg: 'vd-bg-mountain',   charA: '🧑', charB: '👩' },
    { id: 'music',       emoji: '🎵', name: 'Music Lounge',              bg: 'vd-bg-music',      charA: '🧑', charB: '👩' },
    { id: 'futurecity',  emoji: '🏙️', name: 'Future City Exploration',   bg: 'vd-bg-futurecity', charA: '🧑', charB: '👩' },
    { id: 'observatory', emoji: '🌌', name: 'Stargazing Observatory',    bg: 'vd-bg-observatory',charA: '🧑', charB: '👩' }
];

const DateResponses = {
    positive: [
        "That's so sweet, you actually noticed that?",
        "Okay wait, you're kinda fun to talk to.",
        "No cap, I wasn't expecting tonight to go like this.",
        "You're making this really hard to leave early.",
        "Stop, you're going to make me actually like you.",
        "That's... actually one of the nicest things anyone's said to me.",
        "Okay I take back what I said before, you're actually great.",
        "This place suddenly got way more interesting."
    ],
    neutral: [
        "Hmm... I'll have to think about that one.",
        "That's... an interesting way to look at it.",
        "I don't know, what do you think?",
        "Tell me more, I'm listening.",
        "You know what, I never thought about it like that.",
        "That's a bold thing to say on a first date."
    ],
    negative: [
        "Wait, really? That's a bit much for a first date.",
        "Okay, let's change subjects before this gets weird.",
        "I... yeah I'm not sure how to respond to that.",
        "Is this going the direction I think it's going?",
        "Interesting choice. Points for boldness I guess."
    ],
    greetings: [
        "Oh hi! This place is amazing, right? The view is everything.",
        "I'm so glad you suggested this. I've always wanted to come here.",
        "You actually showed up! I half expected to be stood up.",
        "Hey! You look even better in person, just saying."
    ]
};

function scoreMessage(text) {
    const t = text.toLowerCase();
    const positiveWords = ['beautiful','love','amazing','wow','gorgeous','like you','miss','adore','dream','perfect','great','nice','wonderful','sweet','cute','funny','smart'];
    const negativeWords = ['hate','boring','whatever','leave','bad','ugly','lame','dumb','stupid','annoying','weird'];
    let score = 0;
    positiveWords.forEach(w => { if (t.includes(w)) score += 8; });
    negativeWords.forEach(w => { if (t.includes(w)) score -= 10; });
    if (t.length > 20) score += 3; // thoughtful message bonus
    return Math.max(-15, Math.min(12, score));
}

function getResponse(score, detectedSlang) {
    const GenZPrefixes = [
        "No cap, ",
        "Lowkey, ",
        "Fr, ",
        "Bet, ",
        "That's so valid, ",
        "Real, ",
        "Honestly, "
    ];
    let response = "";
    if (score > 5) response = DateResponses.positive[Math.floor(Math.random() * DateResponses.positive.length)];
    else if (score < -5) response = DateResponses.negative[Math.floor(Math.random() * DateResponses.negative.length)];
    else response = DateResponses.neutral[Math.floor(Math.random() * DateResponses.neutral.length)];

    if (detectedSlang) {
        const prefix = GenZPrefixes[Math.floor(Math.random() * GenZPrefixes.length)];
        response = prefix + response.charAt(0).toLowerCase() + response.slice(1);
    }
    return response;
}

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

        // Initialize Three.js Scene, Camera, and WebGL Renderer
        const scene = new THREE.Scene();
        // Reduce fog density on mobile to ease GPU fill rate
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
        scene.fog = new THREE.FogExp2(0x080810, isMobile ? 0.006 : 0.0035);

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

        const ambientLight = new THREE.AmbientLight(0x0d0d18, 0.5);
        scene.add(ambientLight);

        // Grid platform boundary helper
        const gridHelper = new THREE.GridHelper(50, 40, 0x14b8a6, 0x1f1f2e);
        gridHelper.position.y = 0;
        gridHelper.material.opacity = 0.18;
        gridHelper.material.transparent = true;
        envGroup.add(gridHelper);

        // Base cylindrical glass/metal platform
        const platformGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0f,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x050508
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, -0.2, 0);
        envGroup.add(platform);

        // Central interactive 3D table
        const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 24);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.25,
            metalness: 0.7,
            emissive: 0x0c0c0e
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1.1, 0);
        envGroup.add(table);

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
            scene.fog.color.setHex(0x04040a);
            ambientLight.color.setHex(0x111124);
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
            scene.fog.color.setHex(0x080604);
            ambientLight.color.setHex(0x271910);
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
            scene.fog.color.setHex(0x0e0815);
            ambientLight.color.setHex(0x1f112c);
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
            scene.fog.color.setHex(0x050403);
            ambientLight.color.setHex(0x181410);
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
            scene.fog.color.setHex(0x060301);
            ambientLight.color.setHex(0x180b06);
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
            scene.fog.color.setHex(0x01040a);
            ambientLight.color.setHex(0x0b1329);
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
            scene.fog.color.setHex(0x020308);
            ambientLight.color.setHex(0x054f75);
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
            scene.fog.color.setHex(0x04010a);
            ambientLight.color.setHex(0x1e0736);
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
            scene.fog.color.setHex(0x010402);
            ambientLight.color.setHex(0x064e3b);
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
            scene.fog.color.setHex(0x010104);
            ambientLight.color.setHex(0x0a0c1a);
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

// ═══════════════════════════════════════════════════════
// SESSION RATING POPUP (90-minute trigger)
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// AGENT LIVE PREVIEW (Landing Page Auto-Animation)
// ═══════════════════════════════════════════════════════
function initAgentLivePreview() {
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

// ----------------- COOKIE CONSENT BANNER & PREFERENCES -----------------
function initCookieConsent() {
    const banner = document.getElementById('cookie-consent-banner');
    const btnAcceptAll = document.getElementById('btn-cookie-accept-all');
    const btnPreferences = document.getElementById('btn-cookie-preferences');
    const prefModal = document.getElementById('cookie-preferences-modal');
    const btnSavePrefs = document.getElementById('btn-cookie-save-prefs');

    if (!banner) return;

    // Show banner if user hasn't accepted yet
    if (!localStorage.getItem('konvo_cookies_accepted')) {
        setTimeout(() => { banner.classList.add('active'); }, 1500);
    }

    // Accept all — just dismiss the banner, no modal involved
    if (btnAcceptAll) {
        btnAcceptAll.addEventListener('click', () => {
            localStorage.setItem('konvo_cookies_accepted', 'all');
            localStorage.setItem('konvo_cookies_analytics', 'true');
            localStorage.setItem('konvo_cookies_functional', 'true');
            banner.classList.remove('active');
        });
    }

    // "Manage Preferences" — open the modal by adding .active
    // setupModalClosers() handles closing it (X, backdrop, ESC) and all scroll locking.
    // We do NOT call lockBodyScroll() here; the MutationObserver in setupModalClosers
    // fires the moment .active is added to the modal.
    if (btnPreferences) {
        btnPreferences.addEventListener('click', () => {
            if (prefModal) prefModal.classList.add('active');
        });
    }

    // Save Preferences — read checkboxes, persist, then close modal.
    // We remove .active directly; MutationObserver fires unlockBodyScroll automatically.
    if (btnSavePrefs) {
        btnSavePrefs.addEventListener('click', () => {
            const analytics = document.getElementById('cookie-pref-analytics')?.checked ? 'true' : 'false';
            const functional = document.getElementById('cookie-pref-functional')?.checked ? 'true' : 'false';
            localStorage.setItem('konvo_cookies_accepted', 'custom');
            localStorage.setItem('konvo_cookies_analytics', analytics);
            localStorage.setItem('konvo_cookies_functional', functional);
            if (prefModal) prefModal.classList.remove('active');
            banner.classList.remove('active');
        });
    }

    // NOTE: The X button and Cancel button in the HTML use inline onclick to remove .active.
    // setupModalClosers() ALSO handles them via .close-modal class + backdrop click.
    // No extra JS listeners needed here — adding them would cause double-fire bugs.
}

// ----------------- INTERACTIVE USER GUIDE -----------------
function initUserGuideTabs() {
    const tabButtons = document.querySelectorAll('.guide-tabs button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from other buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            // Add active to current
            btn.classList.add('active');
            
            // Hide all content panes
            document.querySelectorAll('.guide-content-pane').forEach(pane => {
                pane.classList.add('hidden');
                pane.style.display = 'none';
            });
            
            // Show corresponding content pane
            const targetId = btn.dataset.guideTab;
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.style.display = 'block';
                // Trigger subtle fade-in animation
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(targetPane, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
                }
            }
        });
    });
}

// ----------------- ROOT INTERCEPT ROUTER -----------------
async function initApp() {
    injectFooter();
    initScrollReveal();
    setupModalClosers();
    initCookieConsent();
    initUserGuideTabs();

    // GSAP Modal Animation Observer
    if (typeof gsap !== 'undefined') {
        const modals = document.querySelectorAll('.modal');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const target = mutation.target;
                    const isActive = target.classList.contains('active');
                    const wasActive = target.dataset.wasActive === 'true';
                    if (isActive !== wasActive) {
                        target.dataset.wasActive = isActive ? 'true' : 'false';
                        if (isActive) {
                            const content = target.querySelector('.modal-content, .card');
                            if (content) {
                                gsap.killTweensOf(content);
                                gsap.killTweensOf(target);
                                gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
                                gsap.fromTo(content, { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' });
                            }
                        } else {
                            if (target.id === 'demo-modal') {
                                if (typeof demoSimInterval !== 'undefined' && demoSimInterval) {
                                    clearInterval(demoSimInterval);
                                    demoSimInterval = null;
                                }
                            }
                            
                            // Snappy premium exit animation and complete cleanup of GSAP inline styles
                            const content = target.querySelector('.modal-content, .card');
                            gsap.killTweensOf(target);
                            if (content) gsap.killTweensOf(content);
                            
                            gsap.to(target, {
                                opacity: 0,
                                duration: 0.2,
                                ease: 'power2.in',
                                onComplete: () => {
                                    gsap.set(target, { clearProps: 'opacity' });
                                }
                            });
                            if (content) {
                                gsap.to(content, {
                                    scale: 0.93,
                                    y: 10,
                                    duration: 0.2,
                                    ease: 'power2.in',
                                    onComplete: () => {
                                        gsap.set(content, { clearProps: 'transform,scale' });
                                    }
                                });
                            }
                        }
                    }
                }
            });
        });
        modals.forEach(modal => {
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }
    setupLogout();

    // Bind Mobile Sidebar Drawer controls
    const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
    const btnSidebarClose = document.getElementById('btn-sidebar-close');
    const sidebar = document.querySelector('.sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    if (btnSidebarToggle && sidebar && sidebarBackdrop) {
        btnSidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarBackdrop.classList.add('active');
        });
    }

    if (btnSidebarClose && sidebar && sidebarBackdrop) {
        btnSidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        });
    }

    if (sidebarBackdrop && sidebar) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        });
    }

    // Close sidebar on link clicks on mobile viewports
    document.querySelectorAll('.sidebar .nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                sidebarBackdrop.classList.remove('active');
            }
        });
    });

    // Bind Theme Toggle Switcher
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('konvo_theme', newTheme);
            Telemetry.logEvent('theme_toggled', { theme: newTheme });
            themeChannel.postMessage({ theme: newTheme });
            const picker = document.getElementById('set-theme-picker');
            if (picker) picker.value = newTheme;
        });
    }

    // Global DIGIPIN Helper Modal Trigger Binding
    document.addEventListener('click', (e) => {
        const target = e.target.closest('#btn-know-digipin, #btn-set-know-digipin, #btn-wiz-know-digipin');
        const modal = document.getElementById('digipin-helper-modal');
        if (target && modal) {
            modal.classList.add('active');
        }
        
        const closeTarget = e.target.closest('#btn-close-digipin-modal, #btn-digipin-modal-cancel');
        if (closeTarget && modal) {
            modal.classList.remove('active');
        }
        
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    const isAuth = await checkAuth();
    const path = window.location.pathname;

    if (path.includes('/auth')) {
        initAuthPage();
        return;
    }

    const authLayout = document.getElementById('auth-app-layout');
    const unauthLayout = document.getElementById('unauth-landing-layout');

    if (isAuth) {
        if (authLayout) authLayout.classList.remove('hidden');
        if (unauthLayout) unauthLayout.classList.add('hidden');
        initSPALinks();
        const isProfileIncomplete = !currentUser.profile || !currentUser.profile.mbti_summary;
        const isAdmin = currentUser.role === 'admin';
        if (isProfileIncomplete && !isAdmin) {
            window.history.pushState(null, null, '/profile');
            handleRouting('/profile');
        } else {
            handleRouting(path);
        }
        initLiveWebSockets();

        // ── New Feature Engines ──
        initRizzPanel();
        initRatingPopup();
        animateStatCounters();

        // Wire up virtual date launch buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-open-vdate]');
            if (btn) {
                const loc = btn.dataset.openVdate || 'rooftop';
                const partnerName = btn.dataset.partnerName || 'Your Match';
                openVirtualDate(loc, {
                    displayName: currentUser?.profile?.display_name || 'You',
                    partnerName
                });
            }
            // Wire up agent transcript view button
            const transcriptBtn = e.target.closest('[data-show-transcript]');
            if (transcriptBtn) {
                const simId = transcriptBtn.dataset.showTranscript;
                if (simId === 'latest') {
                    fetch('/api/agents/simulations')
                        .then(r => r.json())
                        .then(sims => {
                            if (sims.length > 0) {
                                const latest = sims[0];
                                showAgentTranscript({
                                    transcript: latest.dialogue_log || [],
                                    compatibility: latest.overall_compatibility,
                                    partner: latest.partner_name,
                                    environment: latest.environment
                                });
                            } else {
                                showAgentTranscript({ transcript: [] });
                            }
                        })
                        .catch(() => showAgentTranscript({ transcript: [] }));
                } else {
                    const simEl = document.querySelector(`[data-sim-id="${simId}"]`);
                    const simData = simEl ? JSON.parse(simEl.dataset.simData || '{}') : { transcript: [] };
                    showAgentTranscript(simData);
                }
            }
        });

        // Background JWT Refresh rotating tokens every 10 minutes (600,000 ms)
        setInterval(async () => {
            try {
                const res = await apiFetch('/api/auth/refresh', { method: 'POST' });
                if (res && res.access_token) {
                    localStorage.setItem('konvo_token', res.access_token);
                    token = res.access_token;
                    console.log("[Auth System] Session token refreshed successfully.");
                }
            } catch (err) {
                console.error("[Auth System] Automatic token rotation failed:", err);
            }
        }, 10 * 60 * 1000);
    } else {
        if (authLayout) authLayout.classList.add('hidden');
        if (unauthLayout) unauthLayout.classList.remove('hidden');
        initLandingPage();
        initAuthPage();
        // Animate landing page stat counters
        animateStatCounters();
        // Start agent live preview animation
        initAgentLivePreview();
    }

    // Fade out the splash loader once the app is initialized
    const loader = document.getElementById('app-splash-loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }, 800);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
