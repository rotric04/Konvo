/**
 * KONVO™ COGNITIVE CALIBRATION PROCESSOR
 * src/features/auth/onboarding.js
 *
 * Implements the onboarding Welcome Experience, Identity Sync,
 * and the Adaptive Flow Engine with Gemini dynamic questions.
 */

import { apiFetch } from '/src/services/api.js';
import { navigateTo } from '/src/router/router.js';
import { KonvoToast } from '/src/components/toast.js';
import { updateUser } from '/src/store/state.js';

// ─── Module State ──────────────────────────────────────────────────────────────
let currentUser = null;
let currentQuestion = null;
let questionStartTime = 0;

// ─── Welcome Experience & Navigation Bindings ──────────────────────────────────
export async function initOnboarding() {
    // 1. Auth Guard
    const token = localStorage.getItem('konvo_token');
    if (!token) {
        navigateTo('/auth');
        return;
    }

    try {
        currentUser = await apiFetch('/api/users/me');
        if (!currentUser) {
            navigateTo('/auth');
            return;
        }

        // If user already has assessment results, skip onboarding
        if (currentUser.profile && currentUser.profile.mbti_summary) {
            navigateTo('/discover');
            return;
        }
    } catch (err) {
        console.error('[Onboarding] Profile load failed:', err);
        navigateTo('/auth');
        return;
    }

    // Populate user's first name in welcome screen
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle && currentUser.profile?.display_name) {
        const firstName = currentUser.profile.display_name.split(' ')[0];
        welcomeTitle.innerHTML = `Welcome to Konvo, ${firstName}.`;
    }

    // Screens references
    const welcomeS1 = document.getElementById('welcome-s1');
    const welcomeS2 = document.getElementById('welcome-s2');
    const welcomeS3 = document.getElementById('welcome-s3');
    const welcomeS4 = document.getElementById('welcome-s4');
    const screenIdentitySync = document.getElementById('screen-identity-sync');
    const screenCalibrationHud = document.getElementById('screen-calibration-hud');
    const screenProcessing = document.getElementById('screen-processing');
    const screenFinal = document.getElementById('screen-final');

    function showScreen(screenEl) {
        [
            welcomeS1, welcomeS2, welcomeS3, welcomeS4,
            screenIdentitySync, screenCalibrationHud, screenProcessing, screenFinal
        ].forEach(el => {
            if (el) {
                el.classList.remove('active');
            }
        });
        if (screenEl) {
            screenEl.classList.add('active');
        }
    }

    // Bind Welcome experience screen buttons
    document.getElementById('btn-s1-next')?.addEventListener('click', () => showScreen(welcomeS2));
    document.getElementById('btn-s2-next')?.addEventListener('click', () => showScreen(welcomeS3));
    document.getElementById('btn-s3-next')?.addEventListener('click', () => showScreen(welcomeS4));
    document.getElementById('btn-s4-next')?.addEventListener('click', () => showScreen(screenIdentitySync));

    // ─── Identity Sync Form Submit ───
    const identityForm = document.getElementById('identitySyncForm');
    identityForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const gender = document.getElementById('syncGender').value;
        const birthDate = document.getElementById('syncBirthDate').value;
        const birthTime = document.getElementById('syncBirthTime').value || null;
        const birthLocation = document.getElementById('syncBirthLocation').value.trim() || null;
        const digipin = document.getElementById('syncDigipin').value.trim();
        const language = document.getElementById('syncLanguage').value.trim();

        if (!gender || !birthDate || !digipin || !language) {
            KonvoToast.show('Please fill in all required fields.', 'error');
            return;
        }

        const startBtn = document.getElementById('btn-start-calibration');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Syncing Signals...';
        }

        try {
            const res = await apiFetch('/api/onboarding/init', {
                method: 'POST',
                body: JSON.stringify({
                    gender,
                    birth_date: birthDate,
                    birth_time: birthTime,
                    birth_location: birthLocation,
                    digipin,
                    language
                })
            });

            if (res && res.success) {
                KonvoToast.show('Signals synced successfully. Starting vibe calibration.', 'success');
                currentQuestion = res.question;
                
                showScreen(screenCalibrationHud);
                renderQuestion();
            } else {
                KonvoToast.show('Initialization failed. Please try again.', 'error');
            }
        } catch (err) {
            console.error('[Identity Sync] Failed:', err);
            KonvoToast.show(err.message || 'Identity Sync failed', 'error');
        } finally {
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Start Vibe Calibration';
            }
        }
    });

    // ─── Complete Calibration Button ───
    document.getElementById('btn-complete-onboarding')?.addEventListener('click', () => {
        navigateTo('/discover');
    });
}

// ─── Question Renderer & Response Submission ──────────────────────────────────
function renderQuestion() {
    const container = document.getElementById('calibration-card-container');
    const transitionText = document.getElementById('calib-transition-text');
    
    if (!container || !currentQuestion) return;

    // Update transition message/vibe state
    if (transitionText && currentQuestion.transition_message) {
        transitionText.textContent = currentQuestion.transition_message;
    }

    container.innerHTML = '';

    // Create question text
    const qTextEl = document.createElement('h3');
    qTextEl.className = 'question-text';
    qTextEl.textContent = currentQuestion.question;
    container.appendChild(qTextEl);

    // Record when the question was shown
    questionStartTime = Date.now();

    // Render based on question type
    if (currentQuestion.type === 'open_ended') {
        const wrapper = document.createElement('div');
        wrapper.className = 'open-response-wrapper';

        const textarea = document.createElement('textarea');
        textarea.className = 'open-response-textarea';
        textarea.placeholder = 'Type your honest thoughts here (max 1 sentence)...';
        textarea.rows = 3;
        wrapper.appendChild(textarea);

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn-calibration btn-accent';
        submitBtn.textContent = 'Submit response';
        wrapper.appendChild(submitBtn);

        container.appendChild(wrapper);

        const handleOpenSubmit = async () => {
            const value = textarea.value.trim();
            if (!value) {
                KonvoToast.show('Please write a short response.', 'error');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing writing style...';
            await submitAnswer(value);
        };

        submitBtn.addEventListener('click', handleOpenSubmit);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleOpenSubmit();
            }
        });
    } else {
        // Multiple choice (Scenario, Tradeoff, Social, Lifestyle)
        const wrapper = document.createElement('div');
        wrapper.className = 'options-container';

        const options = currentQuestion.options || [];
        options.forEach(opt => {
            const card = document.createElement('button');
            card.className = 'option-card';
            
            const keyEl = document.createElement('span');
            keyEl.className = 'option-key';
            keyEl.textContent = opt.key;
            card.appendChild(keyEl);

            const textEl = document.createElement('span');
            textEl.className = 'option-text';
            textEl.textContent = opt.text;
            card.appendChild(textEl);

            card.addEventListener('click', async () => {
                // Disable option cards to prevent double-click
                const allCards = wrapper.querySelectorAll('.option-card');
                allCards.forEach(c => c.disabled = true);
                await submitAnswer(opt.key);
            });

            wrapper.appendChild(card);
        });

        container.appendChild(wrapper);
    }
}

async function submitAnswer(value) {
    const latency_ms = Date.now() - questionStartTime;
    
    try {
        const res = await apiFetch('/api/onboarding/answer', {
            method: 'POST',
            body: JSON.stringify({
                question_text: currentQuestion.question,
                question_type: currentQuestion.type,
                answer_text: value,
                latency_ms: latency_ms
            })
        });

        if (res && res.success) {
            const nextQ = res.question;
            if (nextQ && nextQ.complete) {
                // Calibration questions finished! Proceed to Twin compilation.
                await compileCognitiveTwin();
            } else if (nextQ) {
                // Show the transition feedback for 1 second before showing the next question
                currentQuestion = nextQ;
                const transitionText = document.getElementById('calib-transition-text');
                if (transitionText && currentQuestion.transition_message) {
                    transitionText.textContent = currentQuestion.transition_message;
                }
                
                const container = document.getElementById('calibration-card-container');
                if (container) {
                    container.style.opacity = '0.3';
                    container.style.pointerEvents = 'none';
                }

                setTimeout(() => {
                    if (container) {
                        container.style.opacity = '1';
                        container.style.pointerEvents = 'all';
                    }
                    renderQuestion();
                }, 1000);
            }
        }
    } catch (err) {
        console.error('[Calibration Answer] Error submitting answer:', err);
        KonvoToast.show('Failed to save answer. Retrying...', 'error');
        // Re-enable input/cards
        renderQuestion();
    }
}

async function compileCognitiveTwin() {
    const screenCalibrationHud = document.getElementById('screen-calibration-hud');
    const screenProcessing = document.getElementById('screen-processing');
    const screenFinal = document.getElementById('screen-final');

    // Show processing spinner screen
    if (screenCalibrationHud) screenCalibrationHud.classList.remove('active');
    if (screenProcessing) screenProcessing.classList.add('active');

    try {
        // Wait 3.5 seconds to build immersion for the user
        await new Promise(resolve => setTimeout(resolve, 3500));

        const res = await apiFetch('/api/onboarding/complete', {
            method: 'POST'
        });

        if (res && res.success) {
            // Re-fetch current user to populate in global state
            try {
                const updatedUser = await apiFetch('/api/users/me');
                updateUser(updatedUser);
            } catch (fetchErr) {
                console.error('Failed to sync updated user model:', fetchErr);
            }

            if (screenProcessing) screenProcessing.classList.remove('active');
            if (screenFinal) screenFinal.classList.add('active');
            KonvoToast.show('Cognitive Twin successfully mapped!', 'success');
        } else {
            throw new Error('Analysis pipeline failed');
        }
    } catch (err) {
        console.error('[Compilation] Gemini analysis failed:', err);
        KonvoToast.show('Failed to finalize Cognitive Twin. Retrying...', 'error');
        
        // Retry logic after short timeout
        setTimeout(compileCognitiveTwin, 3000);
    }
}

// Automatically bind to DOMContentLoaded if script is imported directly
document.addEventListener('DOMContentLoaded', initOnboarding);
