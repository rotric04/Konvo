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

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import crud
from auth_helper import get_current_user
from websocket_manager import manager
import json

# ─── Optional service integrations (feature-flagged) ─────────────────────────
try:
    from perspective_client import analyze_toxicity, is_toxic, is_suspicious
    _perspective_available = True
except ImportError:
    _perspective_available = False
    async def analyze_toxicity(text, timeout=2.0):
        return None
    def is_toxic(score):
        return False
    def is_suspicious(score):
        return False

try:
    from cloudinary_client import cloudinary_client as _cloudinary
except ImportError:
    _cloudinary = None

try:
    from blurhash_helper import process_image as _process_image
except ImportError:
    _process_image = None

from redis_client import redis_client

app = FastAPI(title="Human Chat Service", version="2.0.0")


@app.get("/api/chat/messages/{partner_id}", response_model=List[schemas.ChatMessageResponse])
def get_chat_messages(
    partner_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify date approvals
    sim = db.query(models.AgentDateSimulation).filter(
        ((models.AgentDateSimulation.user_a_id == current_user.id) & (models.AgentDateSimulation.user_b_id == partner_id)) |
        ((models.AgentDateSimulation.user_a_id == partner_id) & (models.AgentDateSimulation.user_b_id == current_user.id))
    ).first()

    if not sim or sim.approval_user_a != "approved" or sim.approval_user_b != "approved":
        raise HTTPException(status_code=403, detail="Human conversation remains locked until both approve the simulated date.")

    messages = db.query(models.ChatMessage).filter(
        ((models.ChatMessage.sender_id == current_user.id) & (models.ChatMessage.receiver_id == partner_id)) |
        ((models.ChatMessage.sender_id == partner_id) & (models.ChatMessage.receiver_id == current_user.id))
    ).order_by(models.ChatMessage.timestamp.asc()).all()

    # Mark messages as read
    unread = [m for m in messages if m.receiver_id == current_user.id and not m.read_status]
    for m in unread:
        m.read_status = True  # type: ignore
    if unread:
        db.commit()

    return messages


@app.post("/api/chat/messages/{partner_id}", response_model=schemas.ChatMessageResponse)
async def send_chat_message(
    partner_id: int,
    msg_req: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ── Toxicity moderation (Perspective API) ─────────────────────────────────
    if msg_req.content and msg_req.content.strip():
        try:
            toxicity_score = await analyze_toxicity(msg_req.content)
            if is_toxic(toxicity_score):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Your message was blocked because it may contain harmful content. "
                        f"(Toxicity score: {toxicity_score:.2f}). "
                        "Please revise your message and try again."
                    )
                )
            if is_suspicious(toxicity_score):
                # Soft warning: allow through but flag for moderation
                print(f"[MODERATION] Suspicious message from user {current_user.id} "
                      f"(score={toxicity_score:.2f}): {msg_req.content[:100]}")
        except HTTPException:
            raise
        except Exception as e:
            # Perspective API failure: fail open (allow message through)
            print(f"[MODERATION] Toxicity check failed: {e} — allowing message through.")

    try:
        msg = crud.create_chat_message(db, current_user.id, partner_id, msg_req.content)  # type: ignore

        # Broadcast via WebSocket to both participants
        payload = {
            "type": "chat_message",
            "message": {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "receiver_id": msg.receiver_id,
                "content": msg.content,
                "reactions": msg.reactions,
                "read_status": msg.read_status,
                "timestamp": msg.timestamp.isoformat()
            }
        }
        await manager.broadcast(payload, f"chat_feed_{partner_id}")
        await manager.broadcast(payload, f"chat_feed_{current_user.id}")

        return msg
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@app.post("/api/chat/upload-image")
async def upload_chat_image(
    partner_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a chat image to Cloudinary CDN. Returns the CDN URL and BlurHash placeholder.
    Falls back to base64 if Cloudinary is unavailable.
    """
    # Validate chat is unlocked
    sim = db.query(models.AgentDateSimulation).filter(
        ((models.AgentDateSimulation.user_a_id == current_user.id) & (models.AgentDateSimulation.user_b_id == partner_id)) |
        ((models.AgentDateSimulation.user_a_id == partner_id) & (models.AgentDateSimulation.user_b_id == current_user.id))
    ).first()

    if not sim or sim.approval_user_a != "approved" or sim.approval_user_b != "approved":
        raise HTTPException(status_code=403, detail="Chat is locked. Both users must approve the simulated date first.")

    # Validate content type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, and GIF images are allowed.")

    try:
        image_bytes = file.file.read()

        # Enforce 15MB limit for chat images
        if len(image_bytes) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum size is 15MB.")

        # Generate BlurHash placeholder
        blurhash_str = None
        dominant_color = None
        if _process_image:
            try:
                blurhash_str, dominant_color = _process_image(image_bytes)
            except Exception:
                pass

        # Build conversation ID (always smaller user ID first for consistency)
        conv_id = f"{min(current_user.id, partner_id)}_{max(current_user.id, partner_id)}"

        # Try Cloudinary upload
        image_url = None
        if _cloudinary and _cloudinary.is_available():
            cdn_result = _cloudinary.upload_chat_image(image_bytes, conv_id)
            if cdn_result:
                image_url = cdn_result["secure_url"]

        # Fallback to base64
        if not image_url:
            b64 = __import__("base64").b64encode(image_bytes).decode("utf-8")
            content_type = file.content_type or "image/jpeg"
            image_url = f"data:{content_type};base64,{b64}"

        return {
            "success": True,
            "image_url": image_url,
            "cdn": "cloudinary.com" in (image_url or ""),
            "blurhash": blurhash_str,
            "dominant_color": dominant_color,
        }

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to upload image: {str(e)}"}
        )


@app.websocket("/api/chat/ws")
async def chat_websocket_handler(websocket: WebSocket, user_token: str = None):
    """
    Chat WebSocket handler. Supports:
    - typing indicators
    - read receipts (read_receipt event)
    - emoji reactions (reaction_added event)
    - ping/pong heartbeat
    """
    from auth_helper import SECRET_KEY, ALGORITHM
    from sqlalchemy.orm import sessionmaker
    from database import engine
    import jwt

    if not user_token:
        await websocket.accept()
        await websocket.close(code=4003)
        return

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        payload = jwt.decode(user_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            await websocket.accept()
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.accept()
        await websocket.close(code=4003)
        return

    channel = f"chat_feed_{user.id}"
    # Pass user_id for connection tracking and forced-disconnect support
    await manager.connect(websocket, channel, user_id=user.id)

    # Set Redis presence and notify gateway
    import httpx

    async def notify_gateway_presence(user_id: int, status: str):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8000/api/realtime/presence",
                    json={"user_id": user.id, "status": status},
                    timeout=1.0
                )
        except Exception as e:
            print(f"[WS] Failed to notify gateway presence: {e}")

    redis_client.set_presence(user.id, "online")
    await notify_gateway_presence(user.id, "online")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")

            # ── Typing indicator ──────────────────────────────────────────────
            if event_type == "typing":
                partner_id = event.get("partner_id")
                if partner_id:
                    payload_out = {
                        "type": "typing",
                        "sender_id": user.id,
                        "typing": event.get("typing", False)
                    }
                    await manager.broadcast(payload_out, f"chat_feed_{partner_id}")

            # ── Read receipt ──────────────────────────────────────────────────
            elif event_type == "read_receipt":
                partner_id = event.get("partner_id")
                message_ids = event.get("message_ids", [])
                if partner_id and message_ids:
                    # Mark messages as read in DB
                    try:
                        msgs = db.query(models.ChatMessage).filter(
                            models.ChatMessage.id.in_(message_ids),
                            models.ChatMessage.receiver_id == user.id,
                        ).all()
                        for m in msgs:
                            m.read_status = True
                        db.commit()

                        # Broadcast receipt to sender
                        receipt_payload = {
                            "type": "read_receipt",
                            "reader_id": user.id,
                            "message_ids": [m.id for m in msgs],
                        }
                        await manager.broadcast(receipt_payload, f"chat_feed_{partner_id}")
                    except Exception as e:
                        print(f"[WS] Read receipt DB update failed: {e}")

            # ── Reaction ──────────────────────────────────────────────────────
            elif event_type == "reaction_added":
                message_id = event.get("message_id")
                emoji = event.get("emoji")
                partner_id = event.get("partner_id")
                if message_id and emoji and partner_id:
                    try:
                        msg = db.query(models.ChatMessage).filter(
                            models.ChatMessage.id == message_id
                        ).first()
                        if msg:
                            reactions = msg.reactions or []
                            # Remove existing reaction from this user (toggle)
                            reactions = [r for r in reactions if r.get("user_id") != user.id]
                            reactions.append({"user_id": user.id, "emoji": emoji})
                            msg.reactions = reactions
                            db.commit()

                            reaction_payload = {
                                "type": "reaction_added",
                                "message_id": message_id,
                                "user_id": user.id,
                                "emoji": emoji,
                            }
                            await manager.broadcast(reaction_payload, f"chat_feed_{partner_id}")
                            await manager.broadcast(reaction_payload, f"chat_feed_{user.id}")
                    except Exception as e:
                        print(f"[WS] Reaction update failed: {e}")

            # ── Ping/pong heartbeat ───────────────────────────────────────────
            elif event_type == "ping":
                # Extend presence TTL on heartbeat
                redis_client.extend_presence(user.id, ttl_seconds=300)
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": event.get("timestamp")
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        redis_client.set_presence(user.id, "offline")
        await notify_gateway_presence(user.id, "offline")
    finally:
        db.close()
