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

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
import schemas
from websocket_manager import manager
from sentiment_helper import calculate_live_sentiment_stats

app = FastAPI(title="Sentiment Engine Service", version="1.0.0")

@app.get("/api/sentiment/live-ratios", response_model=schemas.LiveSentimentRatios)
def get_live_ratios(db: Session = Depends(get_db)):
    return calculate_live_sentiment_stats(db)

@app.websocket("/api/sentiment/ws/live-sentiment")
async def ws_live_sentiment(websocket: WebSocket, db: Session = Depends(get_db)):
    channel = "global_sentiment"
    await manager.connect(websocket, channel)
    initial_stats = calculate_live_sentiment_stats(db)
    await manager.send_personal_message(initial_stats, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            live_stats = calculate_live_sentiment_stats(db)
            await manager.send_personal_message(live_stats, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
