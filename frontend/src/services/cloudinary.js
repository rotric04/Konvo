/**
 * KONVO™ PROGRESSIVE IMAGE SERVICE
 * frontend/src/services/cloudinary.js
 *
 * Handles:
 * 1. Progressive image loading with BlurHash canvas placeholders
 * 2. Avatar upload to backend (which uses Cloudinary CDN when configured)
 * 3. Chat image upload
 * 4. Responsive CDN URL generation for Cloudinary-hosted images
 *
 * Usage:
 *   import { renderProgressiveImage, uploadAvatar, uploadChatImage } from '/src/services/cloudinary.js';
 *
 *   // Render an image with BlurHash placeholder
 *   renderProgressiveImage(imgElement, cdnUrl, 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.');
 */

import { apiFetch, API_BASE_URL } from '/src/services/api.js';

// ─── BlurHash Decoder (Pure JS, no external dependency) ──────────────────────
// Adapted from https://github.com/woltapp/blurhash/tree/master/TypeScript
// Inlined to avoid an extra HTTP request.

const _DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function _b83decode(str) {
    let value = 0;
    for (let i = 0; i < str.length; i++) {
        const digit = _DIGITS.indexOf(str[i]);
        if (digit === -1) throw new Error(`Invalid base83 character: ${str[i]}`);
        value = value * 83 + digit;
    }
    return value;
}

function _linearToSRGB(value) {
    value = Math.max(0, Math.min(1, value));
    return value <= 0.0031308
        ? Math.round(value * 12.92 * 255)
        : Math.round((1.055 * Math.pow(value, 1 / 2.4) - 0.055) * 255);
}

function _sRGBToLinear(value) {
    value /= 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function _decodeDC(value) {
    return [
        _sRGBToLinear(value >> 16),
        _sRGBToLinear((value >> 8) & 255),
        _sRGBToLinear(value & 255),
    ];
}

function _decodeAC(value, maximumValue) {
    const r = Math.floor(value / (19 * 19));
    const g = Math.floor(value / 19) % 19;
    const b = value % 19;
    return [
        _signPow((r - 9) / 9, 2) * maximumValue,
        _signPow((g - 9) / 9, 2) * maximumValue,
        _signPow((b - 9) / 9, 2) * maximumValue,
    ];
}

function _signPow(val, exp) {
    return Math.sign(val) * Math.pow(Math.abs(val), exp);
}

/**
 * Decode a BlurHash string into an ImageData-compatible pixel array.
 * @param {string} hash   BlurHash string
 * @param {number} width  Output canvas width (default 32)
 * @param {number} height Output canvas height (default 32)
 * @returns {Uint8ClampedArray} RGBA pixel data
 */
function decodeBlurHash(hash, width = 32, height = 32) {
    if (!hash || hash.length < 6) return null;

    try {
        const sizeFlag = _b83decode(hash[0]);
        const numX = (sizeFlag % 9) + 1;
        const numY = Math.floor(sizeFlag / 9) + 1;

        const quantisedMaximumValue = _b83decode(hash[1]);
        const maximumValue = (quantisedMaximumValue + 1) / 166;

        const colors = [];
        for (let i = 0; i < numX * numY; i++) {
            if (i === 0) {
                colors.push(_decodeDC(_b83decode(hash.substring(2, 6))));
            } else {
                colors.push(_decodeAC(_b83decode(hash.substring(4 + i * 2, 6 + i * 2)), maximumValue));
            }
        }

        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;
                for (let j = 0; j < numY; j++) {
                    for (let i = 0; i < numX; i++) {
                        const basis =
                            Math.cos((Math.PI * x * i) / width) *
                            Math.cos((Math.PI * y * j) / height);
                        const color = colors[j * numX + i];
                        r += color[0] * basis;
                        g += color[1] * basis;
                        b += color[2] * basis;
                    }
                }
                const idx = (y * width + x) * 4;
                pixels[idx]     = _linearToSRGB(r);
                pixels[idx + 1] = _linearToSRGB(g);
                pixels[idx + 2] = _linearToSRGB(b);
                pixels[idx + 3] = 255;
            }
        }
        return pixels;
    } catch (err) {
        console.debug('[BlurHash] Decode failed:', err);
        return null;
    }
}

// ─── Progressive Image Rendering ─────────────────────────────────────────────

/**
 * Render a BlurHash placeholder on a canvas while the real image loads.
 * When the image loads, smoothly transitions to the real image.
 *
 * @param {HTMLImageElement} imgEl        The target <img> element
 * @param {string}           realSrc      The actual CDN image URL
 * @param {string}           [blurhash]   BlurHash string (optional)
 * @param {string}           [dominantColor] CSS color fallback (e.g. '#3a2f5b')
 */
export function renderProgressiveImage(imgEl, realSrc, blurhash = '', dominantColor = '#1a1a2e') {
    if (!imgEl || !realSrc) return;

    // If no BlurHash, just use dominant color as background
    if (!blurhash) {
        imgEl.style.backgroundColor = dominantColor;
        imgEl.src = realSrc;
        return;
    }

    // Create canvas placeholder
    const canvas = document.createElement('canvas');
    const W = 32, H = 32;
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        object-fit: cover;
        border-radius: inherit;
        transition: opacity 0.4s ease;
    `;

    // Decode BlurHash and draw to canvas
    try {
        const pixels = decodeBlurHash(blurhash, W, H);
        if (pixels) {
            const ctx = canvas.getContext('2d');
            const imageData = new ImageData(pixels, W, H);
            ctx.putImageData(imageData, 0, 0);
        }
    } catch (err) {
        console.debug('[BlurHash] Canvas draw failed:', err);
    }

    // Insert canvas before the image
    const parent = imgEl.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }
    parent?.insertBefore(canvas, imgEl);

    // Hide real image initially
    imgEl.style.opacity = '0';
    imgEl.style.transition = 'opacity 0.4s ease';

    // Load real image and fade in
    const tempImg = new Image();
    tempImg.onload = () => {
        imgEl.src = realSrc;
        imgEl.style.opacity = '1';
        // Fade out and remove the canvas placeholder
        canvas.style.opacity = '0';
        setTimeout(() => canvas.remove(), 500);
    };
    tempImg.onerror = () => {
        // Fallback: just show image normally
        imgEl.src = realSrc;
        imgEl.style.opacity = '1';
        canvas.remove();
    };
    tempImg.src = realSrc;
}

/**
 * Apply BlurHash progressive loading to all images with a data-blurhash attribute.
 * Call this after the DOM is ready or after dynamic content is injected.
 *
 * Looks for: <img src="..." data-blurhash="..." data-dominant-color="#...">
 */
export function applyBlurHashToImages() {
    document.querySelectorAll('img[data-blurhash]').forEach((img) => {
        const hash = img.dataset.blurhash;
        const color = img.dataset.dominantColor || '#1a1a2e';
        const src = img.src || img.dataset.src;
        if (src && hash) {
            renderProgressiveImage(img, src, hash, color);
        }
    });
}

// ─── Upload Helpers ───────────────────────────────────────────────────────────

/**
 * Upload an avatar image file to the backend.
 * The backend uses Cloudinary when configured, base64 otherwise.
 *
 * @param {File} file  The image File object from an <input type="file">
 * @returns {Promise<{avatar_url, blurhash, dominant_color, cdn}>}
 */
export async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('konvo_token') || '';
    const response = await fetch(`${API_BASE_URL}/api/users/profile/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed: HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Upload a chat image file to the backend.
 *
 * @param {File}   file       The image File object
 * @param {number} partnerId  The chat partner's user ID
 * @returns {Promise<{image_url, blurhash, dominant_color, cdn}>}
 */
export async function uploadChatImage(file, partnerId) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('konvo_token') || '';
    const response = await fetch(
        `${API_BASE_URL}/api/chat/upload-image?partner_id=${partnerId}`,
        {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Image upload failed: HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Generate a responsive Cloudinary URL with custom transformations.
 * Only works for images already on Cloudinary (URL contains 'cloudinary.com').
 *
 * @param {string} src    Original Cloudinary secure_url
 * @param {number} width  Target width
 * @param {string} format Output format (default 'webp')
 * @returns {string} Transformed URL or original src if not a Cloudinary URL
 */
export function getResponsiveCdnUrl(src, width = 400, format = 'webp') {
    if (!src || !src.includes('cloudinary.com')) return src;
    // Insert transformation before the file path
    return src.replace('/upload/', `/upload/w_${width},f_${format},q_auto/`);
}
