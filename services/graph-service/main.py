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
import models
import schemas
from websocket_manager import manager

app = FastAPI(title="Real-Time Network Graph Service", version="1.0.0")

def get_network_graph_data(db: Session) -> dict:
    users = db.query(models.User).all()
    from neo4j_client import neo4j_client
    graph_data = neo4j_client.get_user_graph()
    edges = graph_data.get("edges", [])

    nodes_list = []
    edges_list = []

    for user in users:
        display_name = user.profile.display_name if user.profile else "User"
        style = user.fingerprint.communication_style if user.fingerprint else "Analytical"
        debate = user.fingerprint.debate_style if user.fingerprint else "Constructive"
        trust = user.fingerprint.trust_index if user.fingerprint else 70.0
        
        nodes_list.append({
            "id": f"USER-{user.id}", "label": display_name, "type": "user",
            "details": {
                "konvo_id": user.konvo_id, "style": style, "debate": debate, "trust": trust
            }
        })

    for edge in edges:
        edges_list.append({
            "source": f"USER-{edge['source']}", "target": f"USER-{edge['target']}",
            "type": edge['type'], "weight": edge['weight']
        })

    return {"nodes": nodes_list, "edges": edges_list}

@app.get("/api/graph", response_model=schemas.NetworkGraphResponse)
def get_graph(db: Session = Depends(get_db)):
    return get_network_graph_data(db)

@app.websocket("/api/graph/ws/live-graph")
async def ws_live_graph(websocket: WebSocket, db: Session = Depends(get_db)):
    channel = "global_graph"
    await manager.connect(websocket, channel)
    initial_data = get_network_graph_data(db)
    await manager.send_personal_message(initial_data, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            updated_data = get_network_graph_data(db)
            await manager.send_personal_message(updated_data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
