"""
packages/shared-utils/cloudinary_client.py
Cloudinary CDN service layer for avatar and chat image uploads.

Feature-flagged: if CLOUDINARY_CLOUD_NAME is not set, all methods return None
and callers fall back to their existing behavior (e.g., base64 storage).
"""

import os
import io
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

# Lazy import — only load the heavy SDK when the feature is enabled
_cloudinary_configured = False

def _ensure_configured():
    """Lazily configure Cloudinary SDK on first use."""
    global _cloudinary_configured
    if _cloudinary_configured or not CLOUDINARY_ENABLED:
        return CLOUDINARY_ENABLED
    try:
        import cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
        _cloudinary_configured = True
        logger.info("[CLOUDINARY] SDK configured successfully.")
        return True
    except Exception as e:
        logger.warning(f"[CLOUDINARY] Failed to configure SDK: {e}")
        return False


def upload_avatar(image_bytes: bytes, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Upload a user avatar to Cloudinary with auto-quality and responsive transformations.

    Returns:
        Dict with keys: url, secure_url, public_id, width, height
        None if Cloudinary is unavailable (caller uses base64 fallback)
    """
    if not _ensure_configured():
        return None

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            image_bytes,
            folder=f"konvo/avatars",
            public_id=f"user_{user_id}",
            overwrite=True,
            transformation=[
                {"width": 512, "height": 512, "crop": "fill", "gravity": "face"},
                {"quality": "auto:good", "fetch_format": "auto"},
            ],
            resource_type="image",
            tags=[f"user:{user_id}", "avatar"],
        )
        return {
            "url": result.get("secure_url", result.get("url", "")),
            "secure_url": result.get("secure_url", ""),
            "public_id": result.get("public_id", ""),
            "width": result.get("width", 512),
            "height": result.get("height", 512),
        }
    except Exception as e:
        logger.error(f"[CLOUDINARY] Avatar upload failed for user {user_id}: {e}")
        return None


def upload_chat_image(image_bytes: bytes, conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Upload a chat image to Cloudinary with CDN delivery and auto-optimization.

    Returns:
        Dict with keys: url, secure_url, public_id, width, height
        None if Cloudinary is unavailable
    """
    if not _ensure_configured():
        return None

    try:
        import cloudinary.uploader
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        result = cloudinary.uploader.upload(
            image_bytes,
            folder=f"konvo/chat/{conversation_id}",
            public_id=f"msg_{unique_id}",
            overwrite=False,
            transformation=[
                {"quality": "auto:good", "fetch_format": "auto"},
                {"width": 1200, "height": 1200, "crop": "limit"},
            ],
            resource_type="image",
            tags=[f"chat:{conversation_id}", "message"],
        )
        return {
            "url": result.get("secure_url", result.get("url", "")),
            "secure_url": result.get("secure_url", ""),
            "public_id": result.get("public_id", ""),
            "width": result.get("width", 0),
            "height": result.get("height", 0),
        }
    except Exception as e:
        logger.error(f"[CLOUDINARY] Chat image upload failed for conversation {conversation_id}: {e}")
        return None


def delete_image(public_id: str) -> bool:
    """
    Delete an image from Cloudinary by its public_id.

    Returns True on success, False on failure (safe to ignore).
    """
    if not _ensure_configured() or not public_id:
        return False

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        return result.get("result") == "ok"
    except Exception as e:
        logger.warning(f"[CLOUDINARY] Failed to delete image {public_id}: {e}")
        return False


def get_responsive_url(public_id: str, width: int = 400, format: str = "webp") -> str:
    """
    Generate a responsive CDN URL for an existing Cloudinary image.
    Useful for generating thumbnail variants without re-uploading.
    """
    if not CLOUDINARY_CLOUD_NAME or not public_id:
        return ""
    return (
        f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/image/upload"
        f"/w_{width},f_{format},q_auto/{public_id}"
    )


# Module-level singleton flag for health checks
def is_available() -> bool:
    """Check if Cloudinary is configured and ready."""
    return CLOUDINARY_ENABLED


# Compatibility alias for: from cloudinary_client import cloudinary_client
import sys
cloudinary_client = sys.modules[__name__]
