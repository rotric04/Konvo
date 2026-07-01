"""
packages/shared-utils/blurhash_helper.py
BlurHash image placeholder generation helper.

Generates compact BlurHash strings and dominant colors from image bytes.
BlurHash strings are stored alongside CDN URLs and rendered client-side
as a canvas placeholder while the real image loads — zero layout shift,
instant visual feedback.

Docs: https://blurha.sh/
"""

import io
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# BlurHash grid components: (x_components, y_components)
# 4x3 gives a good balance of detail vs string length (~30 chars)
BLURHASH_X_COMPONENTS = 4
BLURHASH_Y_COMPONENTS = 3

# Thumbnail size for hashing (small = fast, large = more detail)
HASH_THUMBNAIL_SIZE = (64, 64)


def _get_pil_image(image_bytes: bytes):
    """Open image bytes with PIL, returning None on failure."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB for consistent hashing (strip alpha, handle palette)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        elif img.mode == "RGBA":
            # Composite onto white background
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        return img
    except Exception as e:
        logger.debug(f"[BLURHASH] Failed to open image: {e}")
        return None


def generate_blurhash(image_bytes: bytes) -> Optional[str]:
    """
    Generate a BlurHash string from raw image bytes.

    Args:
        image_bytes: Raw bytes of any PIL-supported image format

    Returns:
        BlurHash string (e.g. "LGF5?xYk^6#M@-5c,1J5@[or[Q6.")
        None if the image cannot be processed or blurhash lib is unavailable.
    """
    try:
        import blurhash as bh
        img = _get_pil_image(image_bytes)
        if img is None:
            return None

        # Resize to thumbnail for faster hashing
        img_thumb = img.copy()
        img_thumb.thumbnail(HASH_THUMBNAIL_SIZE)

        # Ensure RGB for blurhash
        if img_thumb.mode != "RGB":
            img_thumb = img_thumb.convert("RGB")

        hash_str = bh.encode(img_thumb, BLURHASH_X_COMPONENTS, BLURHASH_Y_COMPONENTS)
        logger.debug(f"[BLURHASH] Generated: {hash_str}")
        return hash_str

    except ImportError:
        logger.warning("[BLURHASH] blurhash-python not installed — skipping placeholder generation.")
        return None
    except Exception as e:
        logger.warning(f"[BLURHASH] Hash generation failed: {e}")
        return None


def get_dominant_color(image_bytes: bytes) -> Optional[str]:
    """
    Extract the dominant color from an image as a hex string.
    Used as a CSS background fallback while BlurHash canvas renders.

    Returns:
        Hex color string (e.g. "#3a2f5b")
        None on failure
    """
    try:
        img = _get_pil_image(image_bytes)
        if img is None:
            return None

        # Quantize to 1 color for dominant color extraction
        img_small = img.copy()
        img_small.thumbnail((50, 50))
        img_rgb = img_small.convert("RGB")

        quantized = img_rgb.quantize(colors=1)
        palette = quantized.getpalette()
        if palette and len(palette) >= 3:
            r, g, b = palette[0], palette[1], palette[2]
            return f"#{r:02x}{g:02x}{b:02x}"

        # Fallback: average color
        import struct
        pixels = list(img_rgb.getdata())
        if pixels:
            avg_r = int(sum(p[0] for p in pixels) / len(pixels))
            avg_g = int(sum(p[1] for p in pixels) / len(pixels))
            avg_b = int(sum(p[2] for p in pixels) / len(pixels))
            return f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"

        return None

    except Exception as e:
        logger.warning(f"[BLURHASH] Dominant color extraction failed: {e}")
        return None


def process_image(image_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """
    Convenience function: returns (blurhash, dominant_color) together.
    Both can be None if the image processing fails.

    Usage:
        blurhash, color = process_image(image_bytes)
        # Store both with the CDN URL in DB or return to client
    """
    bh = generate_blurhash(image_bytes)
    color = get_dominant_color(image_bytes)
    return bh, color
