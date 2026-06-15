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

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import crud
from auth_helper import get_current_user
from websocket_manager import manager
import json

app = FastAPI(title="Human Chat Service", version="1.0.0")

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
    db.commit()
    
    return messages

@app.post("/api/chat/messages/{partner_id}", response_model=schemas.ChatMessageResponse)
async def send_chat_message(
    partner_id: int,
    msg_req: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        msg = crud.create_chat_message(db, current_user.id, partner_id, msg_req.content)  # type: ignore
        
        # Broadcast via websocket if connected
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

@app.websocket("/api/chat/ws")
async def chat_websocket_handler(websocket: WebSocket, user_token: str):
    # Authenticate manually since WS path headers differ
    # For testing, user_token parameter contains the JWT token
    from auth_helper import SECRET_KEY, ALGORITHM
    from sqlalchemy.orm import sessionmaker
    from database import engine
    import jwt
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        payload = jwt.decode(user_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4003)
        return
        
    channel = f"chat_feed_{user.id}"
    await manager.connect(websocket, channel)
    
    # Track presence in Redis and notify gateway for broadcast
    from redis_client import redis_client
    import httpx
    
    async def notify_gateway_presence(user_id: int, status: str):
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8000/api/realtime/presence", # Gateway endpoint
                    json={"user_id": user.id, "status": status}
                )
        except Exception as e:
            print(f"Failed to notify gateway of presence update: {e}")

    redis_client.set_presence(user.id, "online")
    await notify_gateway_presence(user.id, "online")
    
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # Handles real-time typing indicators
            if event.get("type") == "typing":
                partner_id = event.get("partner_id")
                payload = {"type": "typing", "sender_id": user.id, "typing": event.get("typing", False)}
                await manager.broadcast(payload, f"chat_feed_{partner_id}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        redis_client.set_presence(user.id, "offline")
        await notify_gateway_presence(user.id, "offline")
    finally:
        db.close()
