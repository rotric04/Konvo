/**
 * KONVO™ ONBOARDING PROCESSOR
 * src/features/auth/onboarding.js
 *
 * Coordinates the premium 7-step user onboarding flow.
 * Compiles slider preferences into 50 database-compatible personality answers
 * and registers details via the user profile services.
 */

import { apiFetch } from '/src/services/api.js';

// ─── Constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'konvo_onboarding_draft';
const STEPS = [
    'step-welcome',
    'step-identity',
    'step-interests',
    'step-personality',
    'step-communication',
    'step-preferences',
    'step-completion'
];

// ─── State ─────────────────────────────────────────────────────────────────
let currentStep = 0;
let selectedInterests = [];
let currentUser = null;

// ─── Initialize ────────────────────────────────────────────────────────────
async function initOnboarding() {
    // 1. Auth Guard
    const token = localStorage.getItem('konvo_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        currentUser = await apiFetch('/api/users/me');
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }

        // If user already has assessment results, skip onboarding
        if (currentUser.profile && currentUser.profile.mbti_summary) {
            window.location.href = '/discover';
            return;
        }
    } catch (err) {
        console.error('[Onboarding] Profile load failed:', err);
        window.location.href = '/login';
        return;
    }

    // 2. Setup DOM Selectors
    const btnPrev = document.getElementById('btn-wiz-prev');
    const btnNext = document.getElementById('btn-wiz-next');
    const fillBar = document.getElementById('progress-bar-fill');
    const stepText = document.getElementById('progress-step-text');
    const stepTitle = document.getElementById('progress-title-text');

    // 3. Setup Custom Dropdown Bindings
    setupDropdownToggles();

    // 4. Setup Interest Tags
    setupInterestTags();

    // 5. Setup MBTI Sliders
    setupMbtiSliders();

    // 6. Setup Avatar / Photo Upload
    setupAvatarUpload();

    // 7. Setup DIGIPIN modal helpers
    setupDigipinHelper();

    // 8. Load Local Storage Draft
    loadDraft();

    // 9. Initial Render
    renderStep();

    // 10. Navigation Actions
    btnPrev?.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            renderStep();
            saveDraft();
        }
    });

    btnNext?.addEventListener('click', async () => {
        if (validateStep(currentStep)) {
            if (currentStep < STEPS.length - 1) {
                currentStep++;
                renderStep();
                saveDraft();
            } else {
                await submitOnboarding();
            }
        }
    });
}

// ─── Step Rendering ────────────────────────────────────────────────────────
function renderStep() {
    STEPS.forEach((stepId, idx) => {
        const el = document.getElementById(stepId);
        if (el) {
            el.classList.toggle('active', idx === currentStep);
            el.style.display = idx === currentStep ? 'flex' : 'none';
        }
    });

    const btnPrev = document.getElementById('btn-wiz-prev');
    const btnNext = document.getElementById('btn-wiz-next');
    const fillBar = document.getElementById('progress-bar-fill');
    const stepText = document.getElementById('progress-step-text');
    const stepTitle = document.getElementById('progress-title-text');

    if (btnPrev) btnPrev.disabled = currentStep === 0;
    if (btnNext) {
        btnNext.textContent = currentStep === STEPS.length - 1 ? 'Compile & Activate' : 'Next';
    }

    // Update Progress
    const progressPercent = ((currentStep + 1) / STEPS.length) * 100;
    if (fillBar) fillBar.style.width = `${progressPercent}%`;
    if (stepText) stepText.textContent = `Step ${currentStep + 1} of ${STEPS.length}`;

    // Update Header Text
    const stepTitles = [
        'Vibe Calibration',
        'Identity Profile',
        'Interest Cluster',
        'Personality Scale',
        'Communication Style',
        'Discovery Scope',
        'Digital Twin Activation'
    ];
    if (stepTitle) stepTitle.textContent = stepTitles[currentStep] || 'Calibration';
}

// ─── Validation ────────────────────────────────────────────────────────────
function validateStep(stepIdx) {
    if (stepIdx === 1) {
        const name = document.getElementById('wiz-display-name').value.trim();
        const bio = document.getElementById('wiz-bio').value.trim();
        if (!name) {
            alert('Please enter your Display Name.');
            return false;
        }
        if (!bio || bio.length < 10) {
            alert('Please share a narrative self-description (min 10 characters) for vibe calibration.');
            return false;
        }
    } else if (stepIdx === 2) {
        if (selectedInterests.length < 3) {
            alert('Please select at least 3 interest clusters.');
            return false;
        }
    } else if (stepIdx === 6) {
        const digipin = document.getElementById('wiz-digipin').value.trim();
        if (!digipin) {
            alert('Please provide a DIGIPIN geo coordinate.');
            return false;
        }
    }
    return true;
}

// ─── Interest Tags ─────────────────────────────────────────────────────────
function setupInterestTags() {
    const searchInput = document.getElementById('interest-search-input');
    const addCustomBtn = document.getElementById('btn-add-custom-interest');
    const interestsGrid = document.getElementById('wiz-interests-grid');

    const filterInterests = () => {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const tags = interestsGrid?.querySelectorAll('.interest-tag-btn') || [];
        let matchedAny = false;

        tags.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            const val = btn.dataset.interest.toLowerCase();
            const visible = text.includes(query) || val.includes(query);
            btn.style.display = visible ? 'block' : 'none';
            if (visible) matchedAny = true;
        });

        if (addCustomBtn) {
            const exactMatch = Array.from(tags).some(btn => btn.dataset.interest.toLowerCase() === query || btn.textContent.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase() === query);
            addCustomBtn.style.display = (query && !exactMatch) ? 'block' : 'none';
        }
    };

    searchInput?.addEventListener('input', filterInterests);

    const toggleInterest = (btn) => {
        const interest = btn.dataset.interest;
        const idx = selectedInterests.indexOf(interest);
        if (idx === -1) {
            selectedInterests.push(interest);
            btn.classList.add('selected');
        } else {
            selectedInterests.splice(idx, 1);
            btn.classList.remove('selected');
        }
        updateInterestsCounter();
        saveDraft();
    };

    addCustomBtn?.addEventListener('click', () => {
        const query = searchInput?.value.trim();
        if (!query) return;

        const safeVal = query.toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
        
        let existingBtn = interestsGrid?.querySelector(`.interest-tag-btn[data-interest="${safeVal}"]`);
        if (!existingBtn && interestsGrid) {
            existingBtn = document.createElement('div');
            existingBtn.className = 'interest-tag-btn selected';
            existingBtn.dataset.interest = safeVal;
            existingBtn.textContent = `✨ ${query.toUpperCase()}`;
            
            existingBtn.addEventListener('click', () => {
                toggleInterest(existingBtn);
            });
            
            interestsGrid.appendChild(existingBtn);
        }

        if (!selectedInterests.includes(safeVal)) {
            selectedInterests.push(safeVal);
            existingBtn?.classList.add('selected');
        }

        if (searchInput) searchInput.value = '';
        filterInterests();
        updateInterestsCounter();
        saveDraft();
    });

    const tags = interestsGrid?.querySelectorAll('.interest-tag-btn') || [];
    tags.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleInterest(btn);
        });
    });
}

function updateInterestsCounter() {
    const counter = document.getElementById('interests-counter');
    if (counter) {
        counter.textContent = `Selected: ${selectedInterests.length} (Min 3 required)`;
        if (selectedInterests.length >= 3) {
            counter.style.color = 'var(--accent-teal)';
        } else {
            counter.style.color = 'var(--text-secondary)';
        }
    }
}

// ─── MBTI Sliders ──────────────────────────────────────────────────────────
function setupMbtiSliders() {
    const sliders = [
        { id: 'wiz-slider-ei', labelId: 'val-label-ei', labels: ['Introvert (I)', 'Mild Introvert', 'Ambivert', 'Mild Extrovert', 'Extrovert (E)'] },
        { id: 'wiz-slider-ns', labelId: 'val-label-ns', labels: ['Sensing (S)', 'Sensing-leaning', 'Balanced', 'Intuitive-leaning', 'Intuition (N)'] },
        { id: 'wiz-slider-tf', labelId: 'val-label-tf', labels: ['Feeling (F)', 'Feeling-leaning', 'Balanced', 'Thinking-leaning', 'Thinking (T)'] },
        { id: 'wiz-slider-jp', labelId: 'val-label-jp', labels: ['Perceiving (P)', 'Perceiving-leaning', 'Adaptable', 'Judging-leaning', 'Judging (J)'] }
    ];

    sliders.forEach(s => {
        const el = document.getElementById(s.id);
        const lbl = document.getElementById(s.labelId);
        if (el && lbl) {
            const updateLabel = () => {
                const val = parseInt(el.value, 10);
                lbl.textContent = s.labels[val - 1] || 'Balanced';
            };
            el.addEventListener('input', updateLabel);
            updateLabel(); // Initial run
        }
    });
}

// ─── Dropdown Toggles ──────────────────────────────────────────────────────
function setupDropdownToggles() {
    // Custom tone toggle
    const selectComm = document.getElementById('wiz-comm-tone');
    const selectConflict = document.getElementById('wiz-conflict-approach');
    const customRow = document.getElementById('custom-comm-fields-row');

    const updateCommCustomRow = () => {
        const show = (selectComm?.value === 'custom' || selectConflict?.value === 'custom');
        if (customRow) customRow.style.display = show ? 'grid' : 'none';
    };

    selectComm?.addEventListener('change', updateCommCustomRow);
    selectConflict?.addEventListener('change', updateCommCustomRow);

    // Custom connection basis
    const selectBasis = document.getElementById('wiz-connection-basis');
    const inputBasis = document.getElementById('wiz-custom-connection-basis');
    selectBasis?.addEventListener('change', () => {
        if (inputBasis) inputBasis.style.display = selectBasis.value === 'custom' ? 'block' : 'none';
    });

    // Custom values focus
    const selectValue = document.getElementById('wiz-values-focus');
    const inputValue = document.getElementById('wiz-custom-values-focus');
    selectValue?.addEventListener('change', () => {
        if (inputValue) inputValue.style.display = selectValue.value === 'custom' ? 'block' : 'none';
    });
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────
function setupAvatarUpload() {
    const photoUpload = document.getElementById('wiz-photo-upload');
    const avatarPreview = document.getElementById('wiz-avatar-preview');

    photoUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && avatarPreview) {
            const reader = new FileReader();
            reader.onload = (event) => {
                avatarPreview.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

// ─── DIGIPIN Helpers ───────────────────────────────────────────────────────
function setupDigipinHelper() {
    const btnShow = document.getElementById('btn-wiz-know-digipin');
    const modal = document.getElementById('digipin-helper-modal');
    const btnClose = document.getElementById('btn-close-digipin-modal');
    const btnCancel = document.getElementById('btn-digipin-modal-cancel');

    const openModal = () => {
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    if (btnShow) btnShow.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
}

// ─── Draft Sync ────────────────────────────────────────────────────────────
function saveDraft() {
    const draft = {
        currentStep,
        selectedInterests,
        display_name: document.getElementById('wiz-display-name')?.value || '',
        gender: document.getElementById('wiz-gender')?.value || 'Male',
        bio: document.getElementById('wiz-bio')?.value || '',
        slider_ei: document.getElementById('wiz-slider-ei')?.value || '3',
        slider_ns: document.getElementById('wiz-slider-ns')?.value || '3',
        slider_tf: document.getElementById('wiz-slider-tf')?.value || '3',
        slider_jp: document.getElementById('wiz-slider-jp')?.value || '3',
        comm_tone: document.getElementById('wiz-comm-tone')?.value || 'intellectual',
        custom_comm_tone: document.getElementById('wiz-custom-comm-tone')?.value || '',
        conflict_approach: document.getElementById('wiz-conflict-approach')?.value || 'logical',
        custom_conflict_approach: document.getElementById('wiz-custom-conflict-approach')?.value || '',
        connection_basis: document.getElementById('wiz-connection-basis')?.value || 'banter',
        custom_connection_basis: document.getElementById('wiz-custom-connection-basis')?.value || '',
        custom_cognitive: document.getElementById('wiz-custom-cognitive')?.value || '',
        relationship_intent: document.getElementById('wiz-relationship-intent')?.value || 'Long Term',
        values_focus: document.getElementById('wiz-values-focus')?.value || 'growth',
        custom_values_focus: document.getElementById('wiz-custom-values-focus')?.value || '',
        custom_interests: document.getElementById('wiz-custom-interests')?.value || '',
        digipin: document.getElementById('wiz-digipin')?.value || 'GP-1102'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function loadDraft() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    let draft = {};
    if (raw) {
        try {
            draft = JSON.parse(raw);
            currentStep = draft.currentStep || 0;
            selectedInterests = draft.selectedInterests || [];

            setVal('wiz-display-name', draft.display_name || '');
            setVal('wiz-gender', draft.gender || 'Male');
            setVal('wiz-bio', draft.bio || '');
            setVal('wiz-slider-ei', draft.slider_ei || '3');
            setVal('wiz-slider-ns', draft.slider_ns || '3');
            setVal('wiz-slider-tf', draft.slider_tf || '3');
            setVal('wiz-slider-jp', draft.slider_jp || '3');
            setVal('wiz-comm-tone', draft.comm_tone || 'intellectual');
            setVal('wiz-custom-comm-tone', draft.custom_comm_tone || '');
            setVal('wiz-conflict-approach', draft.conflict_approach || 'logical');
            setVal('wiz-custom-conflict-approach', draft.custom_conflict_approach || '');
            setVal('wiz-connection-basis', draft.connection_basis || 'banter');
            setVal('wiz-custom-connection-basis', draft.custom_connection_basis || '');
            setVal('wiz-custom-cognitive', draft.custom_cognitive || '');
            setVal('wiz-relationship-intent', draft.relationship_intent || 'Long Term');
            setVal('wiz-values-focus', draft.values_focus || 'growth');
            setVal('wiz-custom-values-focus', draft.custom_values_focus || '');
            setVal('wiz-custom-interests', draft.custom_interests || '');
            setVal('wiz-digipin', draft.digipin || 'GP-1102');
        } catch (e) {
            console.error('[Onboarding] Failed to parse draft:', e);
        }
    }

    if (currentUser && currentUser.profile) {
        const prof = currentUser.profile;
        if (prof.display_name) {
            setVal('wiz-display-name', prof.display_name);
            if (currentStep < 2) currentStep = 2;
        }
        if (prof.gender) setVal('wiz-gender', prof.gender);
        if (prof.bio) setVal('wiz-bio', prof.bio);
        if (prof.digipin) setVal('wiz-digipin', prof.digipin);
        if (prof.interests && prof.interests.length >= 3) {
            selectedInterests = prof.interests;
            if (currentStep < 3) currentStep = 3;
        }
    }

    const interestsGrid = document.getElementById('wiz-interests-grid');
    if (interestsGrid) {
        selectedInterests.forEach(interest => {
            let existingBtn = interestsGrid.querySelector(`.interest-tag-btn[data-interest="${interest}"]`);
            if (!existingBtn) {
                existingBtn = document.createElement('div');
                existingBtn.className = 'interest-tag-btn selected';
                existingBtn.dataset.interest = interest;
                const label = interest.replace(/\-/g, ' ').toUpperCase();
                existingBtn.textContent = `✨ ${label}`;
                existingBtn.addEventListener('click', () => {
                    const idx = selectedInterests.indexOf(interest);
                    if (idx !== -1) {
                        selectedInterests.splice(idx, 1);
                        existingBtn.remove();
                    }
                    updateInterestsCounter();
                    saveDraft();
                });
                interestsGrid.appendChild(existingBtn);
            } else {
                existingBtn.classList.add('selected');
            }
        });

        interestsGrid.querySelectorAll('.interest-tag-btn').forEach(btn => {
            const interest = btn.dataset.interest;
            btn.classList.toggle('selected', selectedInterests.includes(interest));
        });
    }
    updateInterestsCounter();

    document.getElementById('wiz-comm-tone')?.dispatchEvent(new Event('change'));
    document.getElementById('wiz-connection-basis')?.dispatchEvent(new Event('change'));
    document.getElementById('wiz-values-focus')?.dispatchEvent(new Event('change'));
}

// ─── Onboarding Submission ─────────────────────────────────────────────────
async function submitOnboarding() {
    const btnNext = document.getElementById('btn-wiz-next');
    if (btnNext) {
        btnNext.disabled = true;
        btnNext.textContent = 'Compiling Cognitive Twin...';
    }

    try {
        const display_name = document.getElementById('wiz-display-name').value.trim();
        const bio = document.getElementById('wiz-bio').value.trim();
        const gender = document.getElementById('wiz-gender').value;
        const digipin = document.getElementById('wiz-digipin').value.trim() || 'GP-1102';
        const relationship_intent = document.getElementById('wiz-relationship-intent').value;

        // 1. Save Profile Data
        await apiFetch('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify({
                display_name,
                bio,
                gender,
                birth_date: null,
                birth_location: null,
                digipin,
                interests: selectedInterests,
                goals: [],
                relationship_intent
            })
        });

        // Get MBTI slider values (1 to 5)
        const sEI = parseInt(document.getElementById('wiz-slider-ei')?.value || '3', 10);
        const sNS = parseInt(document.getElementById('wiz-slider-ns')?.value || '3', 10);
        const sTF = parseInt(document.getElementById('wiz-slider-tf')?.value || '3', 10);
        const sJP = parseInt(document.getElementById('wiz-slider-jp')?.value || '3', 10);

        // Map sliders to letter codes
        const mbtiEI = sEI > 3 ? 'E' : 'I';
        const mbtiNS = sNS > 3 ? 'N' : 'S';
        const mbtiTF = sTF > 3 ? 'T' : 'F';
        const mbtiJP = sJP > 3 ? 'J' : 'P';

        // 2. Build NLP custom inputs
        const customInputs = {
            mbti_ei: mbtiEI,
            mbti_ns: mbtiNS,
            mbti_tf: mbtiTF,
            mbti_jp: mbtiJP,
            comm_tone: document.getElementById('wiz-comm-tone')?.value || 'intellectual',
            custom_comm_tone: document.getElementById('wiz-custom-comm-tone')?.value || '',
            conflict_approach: document.getElementById('wiz-conflict-approach')?.value || 'logical',
            custom_conflict_approach: document.getElementById('wiz-custom-conflict-approach')?.value || '',
            connection_basis: document.getElementById('wiz-connection-basis')?.value || 'banter',
            custom_connection_basis: document.getElementById('wiz-custom-connection-basis')?.value || '',
            custom_cognitive: document.getElementById('wiz-custom-cognitive')?.value || '',
            values_focus: document.getElementById('wiz-values-focus')?.value || 'growth',
            custom_values_focus: document.getElementById('wiz-custom-values-focus')?.value || '',
            custom_interests: document.getElementById('wiz-custom-interests')?.value || ''
        };

        // 3. Compile 50 answers from sliders
        // Default everything to neutral (3)
        const compiledAnswers = {};
        for (let i = 1; i <= 50; i++) {
            compiledAnswers[i] = 3;
        }

        // Map E-I questions: [1, 3, 5, 7, 9, 35] are E-aligned, [2, 4, 6, 8, 10, 36] are I-aligned
        [1, 3, 5, 7, 9, 35].forEach(qId => { compiledAnswers[qId] = sEI; });
        [2, 4, 6, 8, 10, 36].forEach(qId => { compiledAnswers[qId] = 6 - sEI; });

        // Map N-S questions: [13, 16, 17, 20, 34, 39, 42] are N-aligned, [18, 40, 49] are S-aligned
        [13, 16, 17, 20, 34, 39, 42].forEach(qId => { compiledAnswers[qId] = sNS; });
        [18, 40, 49].forEach(qId => { compiledAnswers[qId] = 6 - sNS; });

        // Map T-F questions: [11, 14, 19, 21, 24, 25, 37, 41, 44, 46, 50] are T-aligned, [12, 15, 22, 23, 26, 38, 43, 45, 47] are F-aligned
        [11, 14, 19, 21, 24, 25, 37, 41, 44, 46, 50].forEach(qId => { compiledAnswers[qId] = sTF; });
        [12, 15, 22, 23, 26, 38, 43, 45, 47].forEach(qId => { compiledAnswers[qId] = 6 - sTF; });

        // Map J-P questions: [27, 29, 31, 33, 48] are J-aligned, [28, 30, 32] are P-aligned
        [27, 29, 31, 33, 48].forEach(qId => { compiledAnswers[qId] = sJP; });
        [28, 30, 32].forEach(qId => { compiledAnswers[qId] = 6 - sJP; });

        // 4. Submit Assessment
        const res = await apiFetch('/api/users/assessment', {
            method: 'POST',
            body: JSON.stringify({ answers: compiledAnswers, custom_inputs: customInputs })
        });

        if (res) {
            localStorage.removeItem(STORAGE_KEY);
            alert(`Twin initialization succeeded! Calculated Personality: ${res.mbti_type} (${res.role_type}).`);
            window.location.href = '/discover';
        }
    } catch (err) {
        console.error('[Onboarding] Submission failed:', err);
        alert(`Twin compile failed: ${err.message}`);
        if (btnNext) {
            btnNext.disabled = false;
            btnNext.textContent = 'Compile & Activate';
        }
    }
}

// ─── Boot ──────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnboarding);
} else {
    initOnboarding();
}
