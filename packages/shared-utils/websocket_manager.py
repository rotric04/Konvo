"""
packages/shared-utils/websocket_manager.py
Enhanced WebSocket connection manager with:
  - Per-connection user ID tracking
  - Ping/pong heartbeat support
  - User-targeted disconnect (forced logout)
  - Dead connection cleanup on broadcast failure

100% backward compatible with existing callers.
"""

from fastapi import WebSocket
from typing import Dict, Set, Optional
import json
import time
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # channel → set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket → metadata dict {user_id, connected_at, last_ping}
        self._connection_meta: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, channel: str, user_id: Optional[int] = None):
        """Accept a WebSocket connection and register it on the given channel."""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

        # Track metadata for heartbeat and forced disconnect
        self._connection_meta[websocket] = {
            "user_id": user_id,
            "channel": channel,
            "connected_at": time.time(),
            "last_ping": time.time(),
        }
        logger.debug(f"[WS] Client connected to channel '{channel}' (user_id={user_id})")

    def disconnect(self, websocket: WebSocket, channel: str):
        """Remove a WebSocket connection from its channel."""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]
        self._connection_meta.pop(websocket, None)
        logger.debug(f"[WS] Client disconnected from channel '{channel}'")

    def disconnect_user(self, user_id: int):
        """
        Forcibly close all connections for a specific user (e.g., on logout).
        Non-blocking: schedules close; actual teardown happens on next recv.
        """
        to_disconnect = [
            (ws, meta["channel"])
            for ws, meta in list(self._connection_meta.items())
            if meta.get("user_id") == user_id
        ]
        for ws, channel in to_disconnect:
            try:
                asyncio.create_task(ws.close(code=4001, reason="Session terminated"))
            except Exception:
                pass
            self.disconnect(ws, channel)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a single WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.debug(f"[WS] send_personal_message failed: {e}")

    async def broadcast(self, message: dict, channel: str):
        """
        Broadcast a message to all connections on the given channel.
        Dead connections are automatically cleaned up.
        """
        if channel not in self.active_connections:
            return

        payload = json.dumps(message)
        dead = []

        connections = list(self.active_connections[channel])
        for connection in connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)

        # Clean up dead connections
        for ws in dead:
            channel_meta = self._connection_meta.get(ws, {}).get("channel", channel)
            self.disconnect(ws, channel_meta)

    async def ping_all(self):
        """
        Send a ping to all connected clients to maintain presence and detect dead connections.
        Should be called periodically (e.g., every 25s via a background task).
        """
        ping_payload = json.dumps({"type": "ping", "timestamp": int(time.time())})
        dead = []

        for channel, connections in list(self.active_connections.items()):
            for ws in list(connections):
                try:
                    await ws.send_text(ping_payload)
                    if ws in self._connection_meta:
                        self._connection_meta[ws]["last_ping"] = time.time()
                except Exception:
                    dead.append((ws, channel))

        for ws, channel in dead:
            self.disconnect(ws, channel)

    def get_channel_count(self, channel: str) -> int:
        """Returns the number of active connections on a channel."""
        return len(self.active_connections.get(channel, set()))

    def get_total_connections(self) -> int:
        """Returns the total number of active WebSocket connections."""
        return sum(len(conns) for conns in self.active_connections.values())

    def get_user_channels(self, user_id: int) -> list:
        """Returns all channels a user is currently connected to."""
        return [
            meta["channel"]
            for ws, meta in self._connection_meta.items()
            if meta.get("user_id") == user_id
        ]


manager = ConnectionManager()
