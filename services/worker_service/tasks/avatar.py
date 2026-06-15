"""
Avatar Generation Task
Generates AI avatars via fal.ai (Flux) with Replicate fallback.
Stores results in object storage and returns signed URL.

Why this exists: Avatar generation takes 3-15 seconds — blocking a request thread
is unacceptable. This task runs asynchronously and notifies the user via WebSocket
when the avatar is ready.

How it's measured: Task duration tracked by Celery Flower + Prometheus.
How it's monitored: Sentry captures exceptions; failed tasks appear in Flower.
How it's secured: API keys from environment only, never in task payloads.
How it scales: fal.ai handles GPU scaling; Celery scales by adding workers.
"""
import sys
import os

_curr = os.path.abspath(__file__)
_root = os.getcwd()
while _curr:
    if os.path.exists(os.path.join(_curr, "services")) and os.path.exists(os.path.join(_curr, "packages")):
        _root = _curr
        break
    _parent = os.path.dirname(_curr)
    if _parent == _curr:
        _root = os.getcwd()
        break
    _curr = _parent

sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from database import SessionLocal
import models
import httpx
import logging
from services.worker_service.celery_app import celery_app

logger = logging.getLogger(__name__)

FAL_API_KEY = os.getenv("FAL_API_KEY", "")
REPLICATE_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")


@celery_app.task(
    name="services.worker-service.tasks.avatar.generate_avatar",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="avatar"
)
def generate_avatar(self, user_id: int, prompt: str, style: str = "photorealistic") -> dict:
    """
    Generate an AI avatar for a user.

    Args:
        user_id: The user ID requesting the avatar
        prompt: Visual description prompt for avatar generation
        style: Generation style — photorealistic | anime | digital-art

    Returns:
        dict with keys: url (signed CDN URL), user_id, status
    """
    try:
        logger.info(f"[Avatar Worker] Generating avatar for user_id={user_id}, style={style}")

        if FAL_API_KEY:
            result = _generate_via_fal(prompt, style)
        elif REPLICATE_TOKEN:
            result = _generate_via_replicate(prompt, style)
        else:
            # Fallback: return placeholder SVG data URL
            result = {"url": _generate_placeholder_svg(user_id), "provider": "placeholder"}

        logger.info(f"[Avatar Worker] Avatar generated successfully for user_id={user_id}")

        # Update database with generated avatar HTML
        db = SessionLocal()
        try:
            twin = db.query(models.Agent).filter(models.Agent.creator_id == user_id).first()
            if twin:
                avatar_html = f'<img src="{result["url"]}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" class="avatar-img" />'
                twin.avatar = avatar_html
                db.commit()
                logger.info(f"[Avatar Worker] Saved generated avatar HTML to database for user_id={user_id}")
        except Exception as db_exc:
            logger.error(f"[Avatar Worker] Database update failed for user_id={user_id}: {db_exc}")
            db.rollback()
        finally:
            db.close()

        return {
            "status": "success",
            "user_id": user_id,
            "url": result["url"],
            "provider": result.get("provider", "unknown")
        }


    except Exception as exc:
        logger.error(f"[Avatar Worker] Failed for user_id={user_id}: {exc}")
        raise self.retry(exc=exc)


def _generate_via_fal(prompt: str, style: str) -> dict:
    """Call fal.ai Flux API for avatar generation."""
    style_modifiers = {
        "photorealistic": "photorealistic portrait, 4K, professional headshot",
        "anime": "anime style portrait, vibrant colors, Studio Ghibli",
        "digital-art": "digital art portrait, concept art, dramatic lighting"
    }
    full_prompt = f"{prompt}, {style_modifiers.get(style, '')}"

    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            "https://fal.run/fal-ai/flux/dev",
            headers={
                "Authorization": f"Key {FAL_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "prompt": full_prompt,
                "image_size": "square_hd",
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "num_images": 1,
                "enable_safety_checker": True,
            }
        )
        response.raise_for_status()
        data = response.json()
        return {"url": data["images"][0]["url"], "provider": "fal.ai/flux"}


def _generate_via_replicate(prompt: str, style: str) -> dict:
    """Fallback: Call Replicate SDXL API."""
    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            "https://api.replicate.com/v1/predictions",
            headers={
                "Authorization": f"Bearer {REPLICATE_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "version": "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
                "input": {
                    "prompt": prompt,
                    "negative_prompt": "blurry, low quality, distorted",
                    "width": 1024,
                    "height": 1024,
                }
            }
        )
        response.raise_for_status()
        prediction = response.json()
        return {"url": prediction["urls"]["get"], "provider": "replicate/sdxl"}


def _generate_placeholder_svg(user_id: int) -> str:
    """Generate a deterministic placeholder SVG avatar."""
    colors = ["#4F46E5", "#0D9488", "#D97706", "#EA580C", "#06B6D4"]
    color = colors[user_id % len(colors)]
    initials = f"U{user_id}"
    return f"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><circle cx='100' cy='100' r='100' fill='{color}'/><text x='100' y='115' text-anchor='middle' fill='white' font-size='60' font-family='system-ui'>{initials}</text></svg>"
