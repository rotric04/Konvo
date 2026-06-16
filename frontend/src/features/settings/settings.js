/**
 * KONVO™ SETTINGS FEATURE
 * src/features/settings/settings.js
 *
 * Coordinates calibrations forms for user profile details and AI Twin configurations.
 */

import { apiFetch } from '/src/services/api.js';
import { KonvoToast } from '/src/components/toast.js';
import { updateUser, getState } from '/src/store/state.js';

// Geolocation service for reverse geocoding
const GeoLocationService = {
    /**
     * Reverse geocode latitude/longitude to city and state using Nominatim
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<{city: string, state: string, country: string}>}
     */
    async reverseGeocode(latitude, longitude) {
        try {
            if (!latitude || !longitude) return null;
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Konvo-App/1.0'
                    }
                }
            );
            
            if (!response.ok) throw new Error('Geocoding failed');
            const data = await response.json();
            
            const address = data.address || {};
            const city = address.city || address.town || address.village || '';
            const state = address.state || '';
            const country = address.country || '';
            
            return { city, state, country, full_address: data.display_name };
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    },

    /**
     * Extract coordinates from DIGIPIN if encoded, or parse from location string
     * DIGIPIN format: XXX-XXX-XXXX
     * Returns {latitude, longitude} if found
     */
    extractCoordinatesFromDigipin(digipin) {
        try {
            if (!digipin) return null;
            
            const cleaned = digipin.replace(/-/g, '').toUpperCase();
            
            // Try to decode as base36 location encoding
            // This assumes DIGIPIN might contain encoded coordinates
            // Format: first 6 chars = latitude encoding, next 6 = longitude encoding
            if (cleaned.length === 10) {
                // Parse as hex values that represent lat/long
                const latPart = cleaned.substring(0, 6);
                const lonPart = cleaned.substring(4, 10);
                
                // Convert hex to float coordinates
                const latValue = parseInt(latPart, 36);
                const lonValue = parseInt(lonPart, 36);
                
                // Normalize to valid lat/lon ranges (-90 to 90, -180 to 180)
                const latitude = ((latValue % 18000) / 100) - 90;
                const longitude = ((lonValue % 36000) / 100) - 180;
                
                // Validate ranges
                if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
                    return { latitude, longitude };
                }
            }
        } catch (e) {
            console.warn('Could not extract coordinates from DIGIPIN:', e);
        }
        return null;
    },

    /**
     * Generate location string from coordinates
     */
    async getLocationFromCoordinates(latitude, longitude) {
        const result = await this.reverseGeocode(latitude, longitude);
        if (result) {
            const { city, state, country } = result;
            return [city, state, country].filter(Boolean).join(', ');
        }
        return null;
    }
};

function formatDigipin(value) {
    const cleaned = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10);

    let formatted = cleaned;

    if (cleaned.length > 3) {
        formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }

    if (cleaned.length > 6) {
        formatted =
            cleaned.slice(0, 3) +
            '-' +
            cleaned.slice(3, 6) +
            '-' +
            cleaned.slice(6);
    }

    return formatted;
}

export async function initSettingsPage() {
    const profileForm = document.getElementById('settings-profile-form');
    if (!profileForm) return;

    const picker = document.getElementById('set-theme-picker');

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

    const currentUser = window.currentUser || getState('currentUser');
    if (currentUser) {
        const prof = currentUser.profile || {};
        if (prof) {
            // Avatar file upload and AI generation wiring
            const avatarInput = document.getElementById('settings-avatar-input');
            const uploadBtn = document.getElementById('btn-settings-upload-avatar');
            const previewImg = document.getElementById('settings-avatar-preview');
            const aiAvatarBtn = document.getElementById('btn-settings-ai-avatar');

            if (prof.avatar_url && previewImg) {
                previewImg.src = prof.avatar_url;
            }

            if (uploadBtn && avatarInput && !uploadBtn.dataset.listenerBound) {
                uploadBtn.dataset.listenerBound = 'true';
                uploadBtn.addEventListener('click', () => {
                    avatarInput.click();
                });

                avatarInput.addEventListener('change', async () => {
                    const file = avatarInput.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.textContent = 'Uploading...';

                        const token = localStorage.getItem('konvo_token');
                        const headers = {};
                        if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                        }

                        const response = await fetch('/api/users/profile/avatar', {
                            method: 'POST',
                            headers,
                            body: formData
                        });

                        const responseText = await response.text();
                        let result;
                        try {
                            result = JSON.parse(responseText);
                        } catch (jsonErr) {
                            throw new Error(`Server returned invalid response: ${responseText.slice(0, 150)}...`);
                        }

                        if (!response.ok || !result.success) {
                            throw new Error(result.detail || 'Upload failed');
                        }

                        KonvoToast.show('Avatar photo uploaded successfully!', 'success');

                        if (previewImg) {
                            previewImg.src = result.avatar_url;
                        }

                        if (window.currentUser && window.currentUser.profile) {
                            window.currentUser.profile.avatar_url = result.avatar_url;
                        }
                        updateUser(window.currentUser || getState('currentUser'));
                    } catch (err) {
                        KonvoToast.show(`Upload failed: ${err.message}`, 'error');
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = 'Upload Image';
                    }
                });
            }

            // Delete avatar button handler
            const deleteAvatarBtn = document.getElementById('btn-settings-delete-avatar');
            if (deleteAvatarBtn && !deleteAvatarBtn.dataset.listenerBound) {
                deleteAvatarBtn.dataset.listenerBound = 'true';
                deleteAvatarBtn.addEventListener('click', async () => {
                    if (!confirm('Are you sure you want to delete your avatar image?')) {
                        return;
                    }
                    try {
                        deleteAvatarBtn.disabled = true;
                        deleteAvatarBtn.textContent = 'Deleting...';
                        
                        const token = localStorage.getItem('konvo_token');
                        const headers = {};
                        if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                        }

                        const response = await fetch('/api/users/profile/avatar', {
                            method: 'DELETE',
                            headers
                        });

                        const responseText = await response.text();
                        let result;
                        try {
                            result = JSON.parse(responseText);
                        } catch (jsonErr) {
                            throw new Error(`Server returned invalid response: ${responseText.slice(0, 150)}...`);
                        }

                        if (!response.ok || !result.success) {
                            throw new Error(result.detail || 'Delete failed');
                        }

                        KonvoToast.show('Avatar deleted successfully', 'success');
                        
                        // Reset preview
                        if (previewImg) {
                            previewImg.src = 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="40" r="22" fill="%23888"/><path d="M15 85 C20 65, 80 65, 85 85" fill="%23888"/></svg>';
                        }

                        if (window.currentUser && window.currentUser.profile) {
                            window.currentUser.profile.avatar_url = null;
                        }
                        updateUser(window.currentUser || getState('currentUser'));
                    } catch (err) {
                        KonvoToast.show(`Delete failed: ${err.message}`, 'error');
                    } finally {
                        deleteAvatarBtn.disabled = false;
                        deleteAvatarBtn.textContent = 'Delete Avatar';
                    }
                });
            }

            const setDisplayName = document.getElementById('set-display-name');
            const setGender = document.getElementById('set-gender');
            const setLookingForGender = document.getElementById('set-looking-for-gender');
            const setDigipin = document.getElementById('set-digipin');
            const setBirthDate = document.getElementById('set-birth-date');
            const setBirthLocation = document.getElementById('set-birth-location');

            if (setDisplayName) setDisplayName.value = prof.display_name || '';
            if (setBio) setBio.value = prof.bio || '';
            if (setGender) setGender.value = prof.gender || 'Prefer Not To Say';
            if (setLookingForGender) setLookingForGender.value = prof.looking_for_gender || 'All';
            if (setDigipin) setDigipin.value = formatDigipin(prof.digipin || '');
            if (setBirthDate) setBirthDate.value = prof.birth_date || '';
            if (setBirthLocation) setBirthLocation.value = prof.birth_location || '';

            const birthTimeInput = document.getElementById('set-birth-time');
            const birthTimeAmpmInput = document.getElementById('set-birth-time-ampm');

            if (prof.birth_time) {
                let [hours, minutes] = prof.birth_time.split(':').map(Number);
                let ampm = 'AM';
                if (hours >= 12) {
                    ampm = 'PM';
                    if (hours > 12) hours -= 12;
                } else if (hours === 0) {
                    hours = 12;
                }
                if (birthTimeInput) birthTimeInput.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                if (birthTimeAmpmInput) birthTimeAmpmInput.value = ampm;
            } else {
                if (birthTimeInput) birthTimeInput.value = '';
                if (birthTimeAmpmInput) birthTimeAmpmInput.value = 'AM';
            }

            const nodeIdEl = document.getElementById('set-node-id');
            const otpStatusEl = document.getElementById('set-otp-status');
            const roleStatusEl = document.getElementById('set-role-status');

            if (nodeIdEl) nodeIdEl.textContent = currentUser.konvo_id || 'KONVO-NODE';
            if (otpStatusEl) otpStatusEl.textContent = currentUser.otp_verified ? "VERIFIED IDENTITY" : "UNVERIFIED NODE";
            if (roleStatusEl) {
                roleStatusEl.textContent = (currentUser.role || 'USER').toUpperCase() === 'USER' ? 'SOVEREIGN NETWORK USER' : 'ADMIN CONTROL CORE';
            }

            const profileForm = document.getElementById('settings-profile-form');
            if (profileForm && !profileForm.dataset.listenerBound) {
                profileForm.dataset.listenerBound = 'true';
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = profileForm.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Saving…';
                    }
                    const display_name = document.getElementById('set-display-name').value.trim();
                    const bio = document.getElementById('set-bio').value.trim();
                    const gender = document.getElementById('set-gender').value;
                    const looking_for_gender = document.getElementById('set-looking-for-gender')?.value || 'All';
                    const birth_date = document.getElementById('set-birth-date').value || null;
                    const birth_location = document.getElementById('set-birth-location').value.trim() || null;
                    const digipinRaw = document.getElementById('set-digipin').value.trim() || null;
                    let digipin = null;
                    if (digipinRaw) {
                        const DIGIPIN_REGEX = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{4}$/;
                        if (!DIGIPIN_REGEX.test(digipinRaw)) {
                            KonvoToast.show('Invalid DIGIPIN format. Expected format: XXX-XXX-XXXX', 'error');
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.textContent = 'Save Profile';
                            }
                            return;
                        }
                        digipin = digipinRaw.replace(/-/g, '');
                    }

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

                    // Validate required fields
                    if (!display_name || display_name.length < 2) {
                        KonvoToast.show('Display name is required and must be at least 2 characters', 'error');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Save Profile';
                        }
                        return;
                    }

                    if (gender && !['Male', 'Female', 'Non-binary', 'Prefer Not To Say', 'Other'].includes(gender)) {
                        KonvoToast.show('Invalid gender selection', 'error');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Save Profile';
                        }
                        return;
                    }

                    // Process DIGIPIN location extraction
                    let final_birth_location = birth_location;
                    if (digipin) {
                        const coords = GeoLocationService.extractCoordinatesFromDigipin(digipin);
                        if (coords) {
                            // Try to get city/state from coordinates
                            const locationString = await GeoLocationService.getLocationFromCoordinates(
                                coords.latitude,
                                coords.longitude
                            );
                            if (locationString) {
                                final_birth_location = locationString;
                                // Update the UI field to show resolved location
                                if (setBirthLocation) {
                                    setBirthLocation.value = locationString;
                                }
                            }
                        }
                    }

                    try {
                        // Show processing message
                        if (submitBtn) {
                            submitBtn.textContent = 'Processing...';
                        }

                        // Prepare payload with proper validation
                        const payload = {
                            display_name: display_name.substring(0, 100),
                            bio: bio.substring(0, 500) || null,
                            gender: gender || 'Prefer Not To Say',
                            looking_for_gender: looking_for_gender || 'All',
                            birth_date: birth_date || null,
                            birth_location: final_birth_location || null,
                            digipin: digipin || null,
                            birth_time: birth_time || null,
                            interests: prof.interests || [],
                            goals: prof.goals || [],
                            avatar_url: (window.currentUser?.profile?.avatar_url || prof.avatar_url || null),
                            relationship_intent: prof.relationship_intent || 'Long Term'
                        };

                        // Log payload for debugging (remove in production)
                        console.debug('Profile update payload:', payload);

                        const response = await apiFetch('/api/users/profile', {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });

                        if (!response || !response.success) {
                            throw new Error(response?.message || 'Profile update failed');
                        }

                        KonvoToast.show("✅ Profile configuration updated successfully", 'success');

                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Save Profile';
                        }

                        // Re-fetch user data and update UI dynamically instead of full reload
                        try {
                            const updatedUser = await apiFetch('/api/users/me');
                            if (updatedUser) {
                                window.currentUser = updatedUser;
                                initSettingsPage();
                            }
                        } catch (fetchErr) {
                            console.warn('Could not refresh user data:', fetchErr);
                        }
                    } catch (err) {
                        console.error('Profile update error:', err);
                        const errorMsg = err.message || 'Failed updating configuration';
                        KonvoToast.show(`❌ ${errorMsg}`, 'error');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Save Profile';
                        }
                    }
                });
            }
        }
    }

    initTwinSettings();

    const savedTheme = window.ThemeManager?.getTheme?.() || 'dark';
    if (picker) {
        picker.value = savedTheme;
        picker.addEventListener('change', () => {
            window.ThemeManager?.setTheme?.(picker.value);
        });
    }

    const btnSaveAppearance = document.getElementById('btn-save-appearance');
    if (btnSaveAppearance) {
        btnSaveAppearance.replaceWith(btnSaveAppearance.cloneNode(true));
        const newBtnSaveAppearance = document.getElementById('btn-save-appearance');
        newBtnSaveAppearance.addEventListener('click', () => {
            const newTheme = picker ? picker.value : savedTheme;
            window.ThemeManager?.setTheme?.(newTheme);
            KonvoToast.show('✅ Theme saved — ' + newTheme.charAt(0).toUpperCase() + newTheme.slice(1), 'success');
        });
    }
}

export async function initTwinSettings() {
    const container = document.getElementById('twin-profile-card');
    if (!container) return;
    try {
        const twin = await apiFetch('/api/agents/twin');
        if (!twin) return;

        const prefs = twin.match_preferences || {};
        const toneVal = prefs.agent_tone !== undefined ? prefs.agent_tone : 50;
        const humorVal = prefs.agent_humor !== undefined ? prefs.agent_humor : 50;
        const emojiVal = prefs.agent_emoji !== undefined ? prefs.agent_emoji : 50;
        const boundaries = prefs.agent_boundaries || 'moderate';
        const discovery = prefs.discovery_pref || 'collaboration';

        container.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary); overflow:hidden;">
                    ${twin.avatar || `<svg viewBox="0 0 100 100" style="width: 40px; height: 40px; fill:var(--accent-teal);"><circle cx="50" cy="40" r="22"/><path d="M15 85 C20 65, 80 65, 85 85"/></svg>`}
                </div>
                <div>
                    <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0; color: var(--text-primary);">${twin.name}</h4>
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
                    <select id="set-twin-boundaries" style="width:100%;">
                        <option value="strict" ${boundaries === 'strict' ? 'selected' : ''}>Strict (no personal details disclosure)</option>
                        <option value="moderate" ${boundaries === 'moderate' ? 'selected' : ''}>Moderate (conditional disclosure)</option>
                        <option value="flexible" ${boundaries === 'flexible' ? 'selected' : ''}>Flexible (open dialogue representative)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="set-twin-discovery">Discovery Target Preferences</label>
                    <select id="set-twin-discovery" style="width:100%;">
                        <option value="collaboration" ${discovery === 'collaboration' ? 'selected' : ''}>Collaboration & Project Building</option>
                        <option value="learning" ${discovery === 'learning' ? 'selected' : ''}>Learning & Co-Studying</option>
                        <option value="mentorship" ${discovery === 'mentorship' ? 'selected' : ''}>Mentorship & Career Advice</option>
                        <option value="social" ${discovery === 'social' ? 'selected' : ''}>Casual Social Exchange</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; color: var(--accent-teal); font-weight:600;">Update Twin Parameters</button>
            </form>
        `;

        const tSlider = document.getElementById('set-twin-tone');
        const hSlider = document.getElementById('set-twin-humor');
        const eSlider = document.getElementById('set-twin-emoji');

        const tLbl = document.getElementById('lbl-set-twin-tone');
        const hLbl = document.getElementById('lbl-set-twin-humor');
        const eLbl = document.getElementById('lbl-set-twin-emoji');

        tSlider?.addEventListener('input', () => {
            const val = parseInt(tSlider.value);
            if (tLbl) tLbl.textContent = val < 30 ? "Formal" : (val > 70 ? "Casual" : "Balanced");
        });
        hSlider?.addEventListener('input', () => {
            const val = parseInt(hSlider.value);
            if (hLbl) hLbl.textContent = val < 30 ? "Logical / Dry" : (val > 70 ? "Conceptual / Sarcastic" : "Subtle");
        });
        eSlider?.addEventListener('input', () => {
            const val = parseInt(eSlider.value);
            if (eLbl) eLbl.textContent = val < 30 ? "Minimalist" : (val > 70 ? "Expressive" : "Moderate");
        });

        document.getElementById('edit-twin-settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving…';
            }
            const name = document.getElementById('set-twin-name').value;
            const description = document.getElementById('set-twin-desc').value;
            const matchPrefs = {
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
                        match_preferences: matchPrefs
                    })
                });
                KonvoToast.show("AI Twin configuration synced successfully.", 'success');
                initTwinSettings();
            } catch (err) {
                KonvoToast.show(`Calibration sync failed: ${err.message}`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Update Twin Parameters';
                }
            }
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--accent-rose)">Quiz must be completed first.</div>`;
    }
}

// Expose globally
window.initSettingsPage = initSettingsPage;
window.initTwinSettings = initTwinSettings;
