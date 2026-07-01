"""
packages/shared-utils/perspective_client.py
Google Perspective API toxicity moderation service layer with Gemini API fallback.

Feature-flagged: if neither PERSPECTIVE_API_KEY nor GEMINI_API_KEY is set, analyze_toxicity() returns None
and all callers must treat None as "content passes through" (graceful fallback).

Docs: https://developers.perspectiveapi.com/s/docs-get-started
"""

import os
import logging
import asyncio
import json
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

PERSPECTIVE_API_KEY = os.getenv("PERSPECTIVE_API_KEY", "")
PERSPECTIVE_ENABLED = bool(PERSPECTIVE_API_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODERATION_ENABLED = bool(GEMINI_API_KEY)

# Thresholds (tuneable via env var)
TOXICITY_BLOCK_THRESHOLD  = float(os.getenv("TOXICITY_BLOCK_THRESHOLD",  "0.85"))
TOXICITY_WARN_THRESHOLD   = float(os.getenv("TOXICITY_WARN_THRESHOLD",   "0.70"))

PERSPECTIVE_API_URL = "https://commentanalyze.googleapis.com/v1alpha1/comments:analyze"


async def analyze_toxicity(text: str, timeout: float = 2.0) -> Optional[float]:
    """
    Asynchronously call the Perspective API to score content toxicity.
    Falls back to Gemini API if Perspective API is not configured.

    Args:
        text: The text content to analyze (message, post, comment, etc.)
        timeout: Max seconds to wait for Perspective API (default 2.0s)

    Returns:
        float in [0.0, 1.0]: probability of toxic content
        None if the API is unavailable, disabled, or returns an error.
             Callers MUST treat None as "allow content through" (fail open).
    """
    if not PERSPECTIVE_ENABLED:
        if GEMINI_MODERATION_ENABLED:
            return await analyze_toxicity_via_gemini(text, timeout)
        return None

    if not text or not text.strip():
        return 0.0

    # Truncate very long text to Perspective's limit (3000 bytes)
    truncated = text[:3000] if len(text) > 3000 else text

    payload = {
        "comment": {"text": truncated},
        "languages": ["en"],
        "requestedAttributes": {"TOXICITY": {}},
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                PERSPECTIVE_API_URL,
                params={"key": PERSPECTIVE_API_KEY},
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                score = (
                    data.get("attributeScores", {})
                    .get("TOXICITY", {})
                    .get("summaryScore", {})
                    .get("value")
                )
                if score is not None:
                    logger.debug(f"[PERSPECTIVE] Toxicity score: {score:.3f}")
                    return float(score)
                return None

            logger.warning(
                f"[PERSPECTIVE] Non-200 response: {resp.status_code} — {resp.text[:200]}"
            )
            return None

    except httpx.TimeoutException:
        logger.warning("[PERSPECTIVE] Toxicity check timed out — allowing content through.")
        return None
    except Exception as e:
        logger.warning(f"[PERSPECTIVE] Toxicity check failed: {e} — allowing content through.")
        return None


async def analyze_toxicity_via_gemini(text: str, timeout: float = 3.0) -> Optional[float]:
    """
    Asynchronously call the Gemini API to score content toxicity as a fallback.
    """
    if not text or not text.strip():
        return 0.0

    prompt = (
        "You are a content moderation assistant. Analyze the toxicity of the following user text. "
        "Toxicity is defined as rude, disrespectful, or unreasonable content that is likely to "
        "make someone leave a discussion.\n"
        "Rate the toxicity on a scale from 0.0 (completely clean/safe) to 1.0 (extremely toxic/hateful/abusive).\n"
        "Provide your response strictly as a JSON object containing a single key \"toxicity_score\" "
        "whose value is a float between 0.0 and 1.0. Do not include any markdown styling or extra text.\n\n"
        f"Text to analyze: {text}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                res_data = resp.json()
                
                # Check for prompt safety blocks
                if "promptFeedback" in res_data:
                    block_reason = res_data["promptFeedback"].get("blockReason")
                    if block_reason == "SAFETY":
                        logger.warning("[GEMINI-MODERATION] Content blocked by Gemini safety filters (prompt level). Treating as toxic.")
                        return 1.0
                
                candidates = res_data.get("candidates", [])
                if not candidates:
                    return None
                
                candidate = candidates[0]
                finish_reason = candidate.get("finishReason")
                if finish_reason == "SAFETY":
                    logger.warning("[GEMINI-MODERATION] Content blocked by Gemini safety filters (candidate level). Treating as toxic.")
                    return 1.0
                
                content = candidate.get("content", {})
                parts = content.get("parts", [])
                if parts and "text" in parts[0]:
                    text_resp = parts[0]["text"].strip()
                    if text_resp.startswith("```json"):
                        text_resp = text_resp[7:]
                    if text_resp.endswith("```"):
                        text_resp = text_resp[:-3]
                    
                    try:
                        res_json = json.loads(text_resp.strip())
                        score = float(res_json.get("toxicity_score", 0.0))
                        logger.debug(f"[GEMINI-MODERATION] Toxicity score: {score:.3f}")
                        return score
                    except Exception:
                        logger.warning(f"[GEMINI-MODERATION] Failed to parse JSON response: {text_resp[:200]}")
                        return None
            else:
                logger.warning(f"[GEMINI-MODERATION] Non-200 response: {resp.status_code} — {resp.text[:200]}")
                return None
    except httpx.TimeoutException:
        logger.warning("[GEMINI-MODERATION] Toxicity check timed out — allowing content through.")
        return None
    except Exception as e:
        logger.warning(f"[GEMINI-MODERATION] Toxicity check failed: {e} — allowing content through.")
        return None


def is_toxic(score: Optional[float]) -> bool:
    """
    Returns True if the toxicity score exceeds the block threshold.
    Always returns False if score is None (fail-open: no moderation).
    """
    if score is None:
        return False
    return score >= TOXICITY_BLOCK_THRESHOLD


def is_suspicious(score: Optional[float]) -> bool:
    """
    Returns True if the score is above the warn threshold but below block threshold.
    Used for soft warnings / flagging rather than hard blocks.
    """
    if score is None:
        return False
    return TOXICITY_WARN_THRESHOLD <= score < TOXICITY_BLOCK_THRESHOLD


def is_available() -> bool:
    """Check if toxicity moderation is configured."""
    return PERSPECTIVE_ENABLED or GEMINI_MODERATION_ENABLED
