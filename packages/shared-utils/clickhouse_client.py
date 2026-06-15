import os
import json
import time
import socket

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")

class ClickHouseClient:
    def __init__(self):
        self.connected = False
        self.client = None
        self.fallback_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data", "clickhouse", "analytics_log.json"
        )
        os.makedirs(os.path.dirname(self.fallback_file), exist_ok=True)

        try:
            host = CLICKHOUSE_HOST
            if host == "localhost":
                host = "127.0.0.1"
                
            # ClickHouse TCP protocol defaults to port 9000
            s = socket.create_connection((host, 9000), timeout=1.0)
            s.close()
            
            from clickhouse_driver import Client
            self.client = Client(host=CLICKHOUSE_HOST, connect_timeout=1.0)
            # test query
            self.client.execute("SELECT 1")
            self.connected = True
            print("Connected to ClickHouse successfully!")
        except Exception:
            print("Warning: ClickHouse connection failed. Initializing local JSON fallback analytics registry.")

    def log_event(self, event_type: str, details: dict):
        event_record = {
            "timestamp": time.time(),
            "event_type": event_type,
            "details": details
        }
        
        if self.connected:
            try:
                # In real ClickHouse, we insert into the matching table:
                # self.client.execute('INSERT INTO events (event_type, details) VALUES', [event_record])
                return
            except Exception:
                self.connected = False

        # Fallback to local file logging
        try:
            # We append in a simple jsonl style
            with open(self.fallback_file, "a") as f:
                f.write(json.dumps(event_record) + "\n")
        except Exception as e:
            print("Error appending analytics log:", e)

    def log_sentiment(self, text_length: int, positive: float, neutral: float, negative: float):
        self.log_event("SentimentMetric", {
            "text_length": text_length,
            "positive": positive,
            "neutral": neutral,
            "negative": negative
        })

    def log_behavioral_change(self, user_id: int, metric: str, old_val: float, new_val: float):
        self.log_event("BehavioralMetric", {
            "user_id": user_id,
            "metric": metric,
            "old_value": old_val,
            "new_value": new_val
        })

    def log_agent_usage(self, agent_id: str, prompt_length: int, response_length: int):
        self.log_event("AgentAnalytics", {
            "agent_id": agent_id,
            "prompt_length": prompt_length,
            "response_length": response_length
        })

clickhouse_client = ClickHouseClient()
