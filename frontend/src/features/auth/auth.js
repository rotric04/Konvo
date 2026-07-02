/**
 * KONVO™ AUTHENTICATION FEATURE
 * src/features/auth/auth.js
 *
 * Handles: Sign In, Register, OTP Verification, Forgot Password, Reset Password.
 * Works with login.html exclusively.
 *
 * BUGS FIXED:
 * - Agent preview + splash-hide code was trapped inside resetForm event listener block
 * - Country dropdown and OTP were double-initialized when loaded alongside old app.js
 */

import { apiFetch, fetchTurnstileConfig } from '/src/services/api.js';
import { setAuth } from '/src/store/state.js';
import { KonvoToast } from '/src/components/toast.js';

// ─── Module State ──────────────────────────────────────────────────────────────
let pendingRegisterEmail = '';
let loginWidgetId = null;
let registerWidgetId = null;
let loginTurnstileToken = '';
let registerTurnstileToken = '';
let loginFallbackId = '';
let registerFallbackId = '';

// ─── Initialize Auth Page ──────────────────────────────────────────────────────
export function initAuthPage() {
    // ── Form containers ──
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formOtp = document.getElementById('form-otp');
    const formForgot = document.getElementById('form-forgot');
    const formReset = document.getElementById('form-reset');

    // ── Form elements ──
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const otpForm = document.getElementById('otpForm');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');

    // ── Error/message elements ──
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const otpError = document.getElementById('otp-error');
    const forgotMessage = document.getElementById('forgot-message');
    const resetError = document.getElementById('reset-error');

    // ── Misc elements ──
    const otpDesc = document.getElementById('otp-desc');
    const resetEmailInput = document.getElementById('resetEmail');

    // ── Tabs ──
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    // ─── Turnstile Verification Integration ───
    function showLoginFallback() {
        const loader = document.getElementById('login-captcha-loader');
        if (loader) loader.style.display = 'none';
        const widget = document.getElementById('login-turnstile');
        if (widget) widget.style.display = 'none';
        const fallback = document.getElementById('login-captcha-fallback');
        if (fallback) {
            fallback.style.display = 'flex';
            fallback.classList.remove('hidden');
        }
    }

    function showRegisterFallback() {
        const loader = document.getElementById('register-captcha-loader');
        if (loader) loader.style.display = 'none';
        const widget = document.getElementById('register-turnstile');
        if (widget) widget.style.display = 'none';
        const fallback = document.getElementById('register-captcha-fallback');
        if (fallback) {
            fallback.style.display = 'flex';
            fallback.classList.remove('hidden');
        }
    }

    window.renderCaptchaWidgets = async function () {
        const config = await fetchTurnstileConfig();
        
        if (config && config.fallback_challenge) {
            loginFallbackId = config.fallback_challenge.id;
            registerFallbackId = config.fallback_challenge.id;
            
            const loginQ = document.getElementById('login-fallback-question');
            if (loginQ) loginQ.textContent = config.fallback_challenge.question;
            const registerQ = document.getElementById('register-fallback-question');
            if (registerQ) registerQ.textContent = config.fallback_challenge.question;
        }

        const siteKey = config?.site_key;
        if (!siteKey) {
            console.warn("[AUTH] No Turnstile site key received from backend. Falling back to math captcha.");
            showLoginFallback();
            showRegisterFallback();
            return;
        }

        if (typeof window.turnstile !== 'undefined') {
            try {
                loginWidgetId = window.turnstile.render('#login-turnstile', {
                    sitekey: siteKey,
                    theme: 'dark',
                    callback: function (token) {
                        loginTurnstileToken = token;
                        const loader = document.getElementById('login-captcha-loader');
                        if (loader) loader.style.display = 'none';
                    },
                    'expired-callback': function () {
                        loginTurnstileToken = '';
                        const loader = document.getElementById('login-captcha-loader');
                        if (loader) loader.style.display = 'flex';
                    },
                    'error-callback': function () {
                        loginTurnstileToken = '';
                        showLoginFallback();
                    }
                });
            } catch (e) {
                console.error("Error rendering login turnstile:", e);
                showLoginFallback();
            }

            try {
                registerWidgetId = window.turnstile.render('#register-turnstile', {
                    sitekey: siteKey,
                    theme: 'dark',
                    callback: function (token) {
                        registerTurnstileToken = token;
                        const loader = document.getElementById('register-captcha-loader');
                        if (loader) loader.style.display = 'none';
                    },
                    'expired-callback': function () {
                        registerTurnstileToken = '';
                        const loader = document.getElementById('register-captcha-loader');
                        if (loader) loader.style.display = 'flex';
                    },
                    'error-callback': function () {
                        registerTurnstileToken = '';
                        showRegisterFallback();
                    }
                });
            } catch (e) {
                console.error("Error rendering register turnstile:", e);
                showRegisterFallback();
            }
        } else {
            showLoginFallback();
            showRegisterFallback();
        }
    };

    // Auto-invoke if turnstile is already loaded
    if (typeof window.turnstile !== 'undefined') {
        window.renderCaptchaWidgets();
    } else {
        // Fallback timeout if turnstile does not load in 4 seconds
        setTimeout(() => {
            if (typeof window.turnstile === 'undefined' || (!loginWidgetId && !registerWidgetId)) {
                showLoginFallback();
                showRegisterFallback();
            }
        }, 4000);
    }

    document.getElementById('btn-login-refresh-captcha')?.addEventListener('click', async () => {
        const config = await fetchTurnstileConfig(true);
        if (config && config.fallback_challenge) {
            loginFallbackId = config.fallback_challenge.id;
            registerFallbackId = config.fallback_challenge.id;
            const qEl = document.getElementById('login-fallback-question');
            if (qEl) qEl.textContent = config.fallback_challenge.question;
            const regQ = document.getElementById('register-fallback-question');
            if (regQ) regQ.textContent = config.fallback_challenge.question;
            
            const ansEl = document.getElementById('login-fallback-answer');
            if (ansEl) ansEl.value = '';
        }
    });

    document.getElementById('btn-register-refresh-captcha')?.addEventListener('click', async () => {
        const config = await fetchTurnstileConfig(true);
        if (config && config.fallback_challenge) {
            loginFallbackId = config.fallback_challenge.id;
            registerFallbackId = config.fallback_challenge.id;
            const qEl = document.getElementById('register-fallback-question');
            if (qEl) qEl.textContent = config.fallback_challenge.question;
            const logQ = document.getElementById('login-fallback-question');
            if (logQ) logQ.textContent = config.fallback_challenge.question;
            
            const ansEl = document.getElementById('register-fallback-answer');
            if (ansEl) ansEl.value = '';
        }
    });

    // ─── Helpers ────────────────────────────────────────────────────────────────

    function showForm(formEl) {
        [formLogin, formRegister, formOtp, formForgot, formReset].forEach(f => {
            if (f) { f.classList.remove('active'); f.style.display = 'none'; }
        });
        if (formEl) { formEl.classList.add('active'); formEl.style.display = 'block'; }
    }

    function switchTab(active) {
        tabLogin?.classList.toggle('active', active === 'login');
        tabLogin?.setAttribute('aria-selected', String(active === 'login'));
        tabRegister?.classList.toggle('active', active === 'register');
        tabRegister?.setAttribute('aria-selected', String(active === 'register'));
    }

    // ─── Tab Bindings ────────────────────────────────────────────────────────────

    tabLogin?.addEventListener('click', () => { showForm(formLogin); switchTab('login'); });
    tabRegister?.addEventListener('click', () => { showForm(formRegister); switchTab('register'); });

    document.getElementById('btn-switch-to-register')?.addEventListener('click', () => { showForm(formRegister); switchTab('register'); });
    document.getElementById('btn-switch-to-login')?.addEventListener('click', () => { showForm(formLogin); switchTab('login'); });
    document.getElementById('btn-forgot-password')?.addEventListener('click', () => { showForm(formForgot); });
    document.getElementById('btn-back-to-login')?.addEventListener('click', () => { showForm(formLogin); switchTab('login'); });
    document.getElementById('btn-back-from-otp')?.addEventListener('click', () => { showForm(formLogin); switchTab('login'); });
    document.getElementById('btn-reset-back-to-login')?.addEventListener('click', () => { showForm(formLogin); switchTab('login'); });

    // ─── Country Selector ────────────────────────────────────────────────────────

    const countryBtn = document.getElementById('country-select-btn');
    const countryDropdown = document.getElementById('country-dropdown');

    if (countryBtn && countryDropdown) {
        countryBtn.addEventListener('click', () => {
            countryDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.country-select-container')) {
                countryDropdown.classList.add('hidden');
            }
        });

        countryDropdown.querySelectorAll('.country-item').forEach(item => {
            item.addEventListener('click', () => {
                const flagEl = document.getElementById('selected-flag');
                const dialEl = document.getElementById('selected-dial');
                if (flagEl) flagEl.textContent = item.dataset.flag;
                if (dialEl) dialEl.textContent = item.dataset.dial;
                countryDropdown.querySelectorAll('.country-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                countryDropdown.classList.add('hidden');
            });
        });
    }

    // ─── OTP Digit Autofocus ──────────────────────────────────────────────────────

    const otpDigits = document.querySelectorAll('.otp-digit');
    otpDigits.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(-1);
            if (val && idx < otpDigits.length - 1) otpDigits[idx + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) otpDigits[idx - 1].focus();
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            pasted.split('').forEach((char, i) => {
                if (otpDigits[idx + i]) otpDigits[idx + i].value = char;
            });
            const next = idx + pasted.length;
            (otpDigits[next] || otpDigits[otpDigits.length - 1])?.focus();
        });
    });

    // ─── Username Suggestion ──────────────────────────────────────────────────────

    const regUsername = document.getElementById('regUsername');
    const usernameMsg = document.getElementById('username-msg');
    const btnSuggestUsername = document.getElementById('btn-suggest-username');
    const adjectives = ['vibe', 'neon', 'hyper', 'pixel', 'cyber', 'glow', 'meta', 'spicy', 'luna', 'wired', 'retro', 'stellar', 'drip', 'omega', 'slay'];
    const nouns = ['byte', 'soul', 'twin', 'rizz', 'coder', 'avatar', 'pulse', 'aura', 'ghost', 'hacker', 'wave', 'spark', 'glitch', 'nomad', 'flux'];

    btnSuggestUsername?.addEventListener('click', async () => {
        const regEmail = document.getElementById('regEmail');
        let username = '';
        if (regEmail?.value && regEmail.value.includes('@')) {
            const prefix = regEmail.value.split('@')[0].toLowerCase().replace(/[^a-z0-9_\-\. ]/g, '');
            if (prefix.length >= 2) {
                const suffixes = ['_rizz', '_twin', '_x', '99', '42', '_byte', '_soul'];
                username = prefix + suffixes[Math.floor(Math.random() * suffixes.length)];
            }
        }
        if (!username) {
            username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 90) + 10}`;
        }
        if (regUsername) {
            regUsername.value = username;
            regUsername.dispatchEvent(new Event('input'));
            // Immediately check availability for the suggested username
            checkUsernameAvailability(username);
        }
    });

    // Function to check username availability
    async function checkUsernameAvailability(username) {
        if (!username) {
            usernameMsg.textContent = '';
            usernameMsg.className = 'validation-msg';
            return;
        }
        try {
            const res = await apiFetch('/api/auth/check-username', {
                method: 'POST',
                body: JSON.stringify({ username }),
            });
            if (res?.success) {
                usernameMsg.textContent = '✓ Username is available';
                usernameMsg.className = 'validation-msg success';
            } else {
                usernameMsg.textContent = res?.message || 'Username check failed';
                usernameMsg.className = 'validation-msg error';
            }
        } catch (err) {
            usernameMsg.textContent = err.message || 'Username check failed';
            usernameMsg.className = 'validation-msg error';
        }
    }

    // Add event listener for regUsername input to check availability on change
    regUsername?.addEventListener('input', () => {
        let { selectionStart: s, selectionEnd: e } = regUsername;
        const orig = regUsername.value.length;
        regUsername.value = regUsername.value.toLowerCase().replace(/[^a-z0-9_\-\. ]/g, '');
        const diff = orig - regUsername.value.length;
        if (diff > 0) regUsername.setSelectionRange(s - diff, e - diff);
        // Call the availability check function
        checkUsernameAvailability(regUsername.value);
    });

    // ─── Password Strength ────────────────────────────────────────────────────────

    const pwInput = document.getElementById('regPassword');
    const pwFill = document.getElementById('password-strength-fill');
    const pwFeedback = document.getElementById('password-strength-feedback');
    // Use CSS variables for colors to support dark mode
    const colorMap = ['', 'var(--strength-very-weak)', 'var(--strength-weak)', 'var(--strength-fair)', 'var(--strength-strong)', 'var(--strength-very-strong)'];
    const labelMap = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

    function checkReq(id, valid) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('valid', valid);
        el.textContent = (valid ? '✓ ' : '✗ ') + el.textContent.replace(/^[✓✗] /, '');
    }

    pwInput?.addEventListener('input', () => {
        const v = pwInput.value;
        const hasLen = v.length >= 8;
        const hasUpper = /[A-Z]/.test(v);
        const hasNumber = /\d/.test(v);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v);
        checkReq('req-length', hasLen);
        checkReq('req-upper', hasUpper);
        checkReq('req-number', hasNumber);
        checkReq('req-special', hasSpecial);
        const score = [hasLen, hasUpper, hasNumber, hasSpecial, v.length >= 12].filter(Boolean).length;
        const pct = Math.max(score * 20, v.length > 0 ? 5 : 0);
        if (pwFill) { pwFill.style.width = pct + '%'; pwFill.style.backgroundColor = colorMap[score] || colorMap[1]; }
        if (pwFeedback) pwFeedback.textContent = v.length === 0 ? '' : (labelMap[score] || 'Very Weak');
    });

    // ─── Submit: Login ───────────────────────────────────────────────────────────
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginError) loginError.textContent = '';

        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            if (loginError) loginError.textContent = 'Please enter your email and password.';
            return;
        }

        let token = loginTurnstileToken;
        const loginFallback = document.getElementById('login-captcha-fallback');
        const isFallbackVisible = loginFallback && loginFallback.style.display === 'flex';
        
        if (isFallbackVisible) {
            const answer = document.getElementById('login-fallback-answer')?.value.trim();
            if (!answer) {
                if (loginError) loginError.textContent = 'Please answer the security question.';
                return;
            }
            token = `fallback:${loginFallbackId}:${answer}`;
        }
        
        if (!token) {
            if (loginError) loginError.textContent = 'Please complete the security challenge.';
            return;
        }

        const btn = loginForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

        try {
            const res = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, turnstile_token: token }),
            });

            if (res?.access_token) {
                setAuth(res.access_token, res.user || null);
                KonvoToast.show('Welcome back! Redirecting…', 'success');
                setTimeout(() => { window.location.href = '/discover'; }, 800);
            } else {
                if (loginError) loginError.textContent = 'Invalid credentials. Please try again.';
                if (typeof window.turnstile !== 'undefined' && loginWidgetId) {
                    try { window.turnstile.reset(loginWidgetId); } catch(e){}
                    loginTurnstileToken = '';
                    const loader = document.getElementById('login-captcha-loader');
                    if (loader) loader.style.display = 'flex';
                }
            }
        } catch (err) {
            if (loginError) loginError.textContent = err.message || 'Authentication failed.';
            KonvoToast.show(err.message || 'Login failed', 'error');
            if (typeof window.turnstile !== 'undefined' && loginWidgetId) {
                try { window.turnstile.reset(loginWidgetId); } catch(e){}
                loginTurnstileToken = '';
                const loader = document.getElementById('login-captcha-loader');
                if (loader) loader.style.display = 'flex';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        }
    });

    // ─── Submit: Register ─────────────────────────────────────────────────────────
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (registerError) registerError.textContent = '';

        const email = document.getElementById('regEmail')?.value.trim();
        const password = document.getElementById('regPassword')?.value;
        const displayName = document.getElementById('regDisplayName')?.value.trim();
        const username = document.getElementById('regUsername')?.value.trim();
        const phoneVal = document.getElementById('regPhone')?.value.trim();
        const tosAgreed = document.getElementById('reg-tos-agree')?.checked;

        if (!email || !password || !displayName || !username || !phoneVal) {
            if (registerError) registerError.textContent = 'All fields are required.';
            return;
        }
        if (!tosAgreed) {
            if (registerError) registerError.textContent = 'You must agree to the Terms of Service.';
            return;
        }

        let token = registerTurnstileToken;
        const registerFallback = document.getElementById('register-captcha-fallback');
        const isFallbackVisible = registerFallback && registerFallback.style.display === 'flex';
        
        if (isFallbackVisible) {
            const answer = document.getElementById('register-fallback-answer')?.value.trim();
            if (!answer) {
                if (registerError) registerError.textContent = 'Please answer the security question.';
                return;
            }
            token = `fallback:${registerFallbackId}:${answer}`;
        }
        
        if (!token) {
            if (registerError) registerError.textContent = 'Please complete the security challenge.';
            return;
        }

        const dialCode = document.getElementById('selected-dial')?.textContent || '+91';
        const fullPhone = `${dialCode}${phoneVal.replace(/\D/g, '')}`;

        const btn = registerForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

        try {
            const res = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email, password,
                    display_name: displayName,
                    username,
                    phone: fullPhone,
                    gender: 'Unknown',
                    looking_for_gender: 'All',
                    relationship_intent: 'Long Term',
                    bio: '',
                    interests: [],
                    goals: [],
                    turnstile_token: token
                }),
            });

            if (res) {
                pendingRegisterEmail = email;
                localStorage.setItem('pending_email', email);
                if (otpDesc) otpDesc.textContent = `We sent a 6-digit code to ${email}.`;
                showForm(formOtp);
                KonvoToast.show('Verification code sent!', 'success');
            }
        } catch (err) {
            if (registerError) registerError.textContent = err.message || 'Registration failed.';
            KonvoToast.show(err.message || 'Registration failed', 'error');
            if (typeof window.turnstile !== 'undefined' && registerWidgetId) {
                try { window.turnstile.reset(registerWidgetId); } catch(e){}
                registerTurnstileToken = '';
                const loader = document.getElementById('register-captcha-loader');
                if (loader) loader.style.display = 'flex';
            }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
        }
    });
    // ─── Submit: OTP Verification ─────────────────────────────────────────────────

    otpForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (otpError) otpError.textContent = '';

        const digits = Array.from(otpDigits).map(i => i.value).join('');
        if (digits.length < 6) {
            if (otpError) otpError.textContent = 'Please enter all 6 digits.';
            return;
        }

        const email = pendingRegisterEmail || localStorage.getItem('pending_email') || '';
        if (!email) {
            if (otpError) otpError.textContent = 'Session expired. Please register again.';
            return;
        }

        const btn = otpForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }

        try {
            const res = await apiFetch('/api/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, otp_code: digits }),
            });

            if (res?.success) {
                KonvoToast.show('Email verified! You can now sign in.', 'success');
                showForm(formLogin);
                switchTab('login');
                const loginEmailInput = document.getElementById('loginEmail');
                if (loginEmailInput) { loginEmailInput.value = email; document.getElementById('loginPassword')?.focus(); }
            } else {
                // Handle cases where res.success is explicitly false but no error was thrown
                if (otpError) otpError.textContent = res?.message || 'Verification failed.';
                KonvoToast.show(res?.message || 'Verification failed', 'error');
            }
        } catch (err) {
            if (otpError) otpError.textContent = err.message || 'Verification failed.';
            KonvoToast.show(err.message || 'Verification failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Verify Email'; }
        }
    });

    document.getElementById('btn-resend-otp')?.addEventListener('click', async () => {
        const email = pendingRegisterEmail || localStorage.getItem('pending_email') || '';
        if (!email) { KonvoToast.show('Session expired. Please register again or start over.', 'warning'); return; }

        const btn = document.getElementById('btn-resend-otp');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Resending…';
        }
        try {
            const res = await apiFetch('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) });
            if (res?.success) {
                KonvoToast.show('Verification code resent!', 'success');
            } else {
                KonvoToast.show(res?.message || 'Failed to resend code', 'error');
            }
        } catch (err) {
            KonvoToast.show(err.message || 'Failed to resend code', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Resend Code';
            }
        }
    });

    // ─── Submit: Forgot Password ──────────────────────────────────────────────────

    forgotForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (forgotMessage) forgotMessage.textContent = '';

        const email = document.getElementById('forgotEmail')?.value.trim();
        if (!email) {
            if (forgotMessage) { forgotMessage.textContent = 'Please enter your email.'; forgotMessage.className = 'validation-msg error'; }
            return;
        }

        const btn = forgotForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        try {
            const res = await apiFetch('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            if (res) {
                KonvoToast.show('Recovery code sent to your email!', 'success');
                if (resetEmailInput) resetEmailInput.value = email;
                showForm(formReset);
            }
        } catch (err) {
            if (forgotMessage) { forgotMessage.textContent = err.message || 'Failed to send reset link.'; forgotMessage.className = 'validation-msg error'; }
            KonvoToast.show(err.message || 'Reset request failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
        }
    });

    // ─── Submit: Reset Password ───────────────────────────────────────────────────

    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (resetError) resetError.textContent = '';

        const email = document.getElementById('resetEmail')?.value.trim();
        const code = document.getElementById('resetCode')?.value.trim();
        const newPassword = document.getElementById('resetPassword')?.value;

        if (!email || !code || !newPassword) {
            if (resetError) resetError.textContent = 'All fields are required.';
            return;
        }

        const btn = resetForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Resetting…'; }

        try {
            const res = await apiFetch('/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email, code, new_password: newPassword }),
            });
            if (res?.success) {
                KonvoToast.show('Password reset! Sign in with your new password.', 'success');
                showForm(formLogin);
                switchTab('login');
                const loginEmailInput = document.getElementById('loginEmail');
                if (loginEmailInput) loginEmailInput.value = email;
                document.getElementById('loginPassword')?.focus();
            }
        } catch (err) {
            if (resetError) resetError.textContent = err.message || 'Password reset failed.';
            KonvoToast.show(err.message || 'Reset failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Reset & Sign In'; }
        }
    });

    // ─── Agent Live Preview ───────────────────────────────────────────────────────
    // NOTE: This was previously trapped inside the resetForm listener - now correctly at top level.

    const previewBody = document.getElementById('auth-preview-body');
    if (previewBody) {
        const msgs = [
            { role: 'a', text: "Your profile resonates deeply - jazz, 3am thoughts, and borrowed books." },
            { role: 'b', text: "My twin has taste. What's the overlap score?" },
            { role: 'a', text: "91%. Rare. Your curiosity patterns align completely." },
            { role: 'b', text: "Initiating contact request for my human…" },
            { role: 'a', text: "Approved. ✨ This conversation was inevitable." },
        ];

        let idx = 0;
        const addMsg = () => {
            const body = document.getElementById('auth-preview-body');
            if (!body) return;
            if (idx >= msgs.length) { idx = 0; body.innerHTML = ''; }
            const m = msgs[idx++];
            const el = document.createElement('div');
            el.className = `auth-msg ${m.role}`;
            el.innerHTML = `<div class="auth-msg-avatar ${m.role}">${m.role.toUpperCase()}</div><div class="auth-msg-text">${m.text}</div>`;
            body.appendChild(el);
            body.scrollTop = body.scrollHeight;
            setTimeout(addMsg, 2200 + Math.random() * 800);
        };
        setTimeout(addMsg, 600);
    }

    // ─── Splash Loader ────────────────────────────────────────────────────────────
    // NOTE: This was previously trapped inside the resetForm listener - now correctly at top level.

    const hideSplash = () => {
        const splash = document.getElementById('app-splash-loader');
        if (!splash) return;
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 600);
        }, 500);
    };

    if (document.readyState === 'complete') hideSplash();
    else window.addEventListener('load', hideSplash);


}
