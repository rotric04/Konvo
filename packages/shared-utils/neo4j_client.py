import os
import json
import socket
from urllib.parse import urlparse

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

class Neo4jClient:
    def __init__(self):
        self.connected = False
        self.driver = None
        self.fallback_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data", "neo4j", "graph_db.json"
        )
        
        # Load local graph memory fallback
        os.makedirs(os.path.dirname(self.fallback_file), exist_ok=True)
        if os.path.exists(self.fallback_file):
            try:
                with open(self.fallback_file, "r") as f:
                    self.local_graph = json.load(f)
            except Exception:
                self.local_graph = {"nodes": [], "edges": []}
        else:
            self.local_graph = {"nodes": [], "edges": []}

        # Try to connect
        try:
            parsed = urlparse(NEO4J_URI)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 7687
            if host == "localhost":
                host = "127.0.0.1"
                
            # Fast socket check
            s = socket.create_connection((host, port), timeout=1.0)
            s.close()
            
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD), connection_timeout=1.0)
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            self.connected = True
            print("Connected to Neo4j successfully!")
        except Exception:
            print("Warning: Neo4j connection failed. Initializing local JSON fallback graph database.")

    def add_relationship(self, source_id: int, target_id: int, rtype: str, weight: float = 1.0):
        # rtype can be: HumanRelationship, MentorRelationship, StartupRelationship, LearningRelationship, InfluenceRelationship
        if self.connected:
            try:
                with self.driver.session() as session:
                    session.run(
                        f"MERGE (a:User {{id: $source_id}}) "
                        f"MERGE (b:User {{id: $target_id}}) "
                        f"MERGE (a)-[r:{rtype}]->(b) "
                        f"SET r.weight = $weight",
                        source_id=source_id, target_id=target_id, weight=weight
                    )
                return
            except Exception:
                self.connected = False

        # Fallback to local JSON graph database
        nodes = self.local_graph["nodes"]
        edges = self.local_graph["edges"]
        
        if source_id not in nodes: nodes.append(source_id)
        if target_id not in nodes: nodes.append(target_id)
        
        # Check if edge exists
        found = False
        for edge in edges:
            if edge["source"] == source_id and edge["target"] == target_id and edge["type"] == rtype:
                edge["weight"] = weight
                found = True
                break
        if not found:
            edges.append({
                "source": source_id,
                "target": target_id,
                "type": rtype,
                "weight": weight
            })
        
        self.save_local_graph()

    def get_user_graph(self, rtype: str = None) -> dict:
        if self.connected:
            try:
                nodes_list = []
                edges_list = []
                # Query Neo4j
                query = "MATCH (a:User)-[r]->(b:User) RETURN a.id, b.id, type(r), r.weight"
                if rtype:
                    query = f"MATCH (a:User)-[r:{rtype}]->(b:User) RETURN a.id, b.id, type(r), r.weight"
                with self.driver.session() as session:
                    res = session.run(query)
                    for record in res:
                        src = record[0]
                        tgt = record[1]
                        edge_type = record[2]
                        weight = record[3]
                        
                        if src not in nodes_list: nodes_list.append(src)
                        if tgt not in nodes_list: nodes_list.append(tgt)
                        edges_list.append({
                            "source": src,
                            "target": tgt,
                            "type": edge_type,
                            "weight": weight
                        })
                return {"nodes": nodes_list, "edges": edges_list}
            except Exception:
                self.connected = False

        # Fallback
        if rtype:
            filtered_edges = [e for e in self.local_graph["edges"] if e["type"] == rtype]
            return {"nodes": self.local_graph["nodes"], "edges": filtered_edges}
        return self.local_graph

    def save_local_graph(self):
        try:
            with open(self.fallback_file, "w") as f:
                json.dump(self.local_graph, f, indent=4)
        except Exception as e:
            print("Error writing fallback graph log:", e)

neo4j_client = Neo4jClient()
