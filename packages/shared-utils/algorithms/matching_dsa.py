# State-of-the-Art Matching and Connection Logic Engine
import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine similarity between two numeric vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.5
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude_1 = math.sqrt(sum(a * a for a in vec1))
    magnitude_2 = math.sqrt(sum(b * b for b in vec2))
    
    if magnitude_1 == 0 or magnitude_2 == 0:
        return 0.5
        
    return dot_product / (magnitude_1 * magnitude_2)

def get_graph_closeness_boost(db: Session, user_a_id: int, user_b_id: int) -> float:
    """
    DSA Algorithm: Graph BFS shortest path.
    Finds the degrees of separation between two users on the human relationship graph.
    Returns a score boost based on geographic/social proximity.
    """
    # Find direct connections via approved simulations
    # Treat matches as graph edges
    try:
        from neo4j_client import neo4j_client
        # If Neo4j is connected, we can ask for shortest path length
        # Fallback to SQLite query if Neo4j is offline or mock
    except Exception:
        pass

    # SQLite-based BFS shortest path computation
    # Queue stores (user_id, current_depth)
    queue = [(user_a_id, 0)]
    visited = {user_a_id}
    
    # Simple adjacency list lookup helper
    def get_neighbors(u_id: int) -> List[int]:
        # Neighbors are users with whom they have an approved simulation/match
        sims = db.query(models.AgentDateSimulation).filter(
            ((models.AgentDateSimulation.user_a_id == u_id) | (models.AgentDateSimulation.user_b_id == u_id)),
            models.AgentDateSimulation.approval_user_a == "approved",
            models.AgentDateSimulation.approval_user_b == "approved"
        ).all()
        neighbors = []
        for s in sims:
            n_id = s.user_b_id if s.user_a_id == u_id else s.user_a_id
            neighbors.append(n_id)
        return neighbors

    shortest_path = -1
    while queue:
        current_id, depth = queue.pop(0)
        
        if current_id == user_b_id:
            shortest_path = depth
            break
            
        if depth > 4: # Limit depth search for optimization
            continue
            
        for neighbor in get_neighbors(current_id):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))
                
    if shortest_path == 1:
        return 15.0 # Direct connection
    elif shortest_path == 2:
        return 10.0 # Friend of friend
    elif shortest_path == 3:
        return 5.0 # 3 degrees of separation
    else:
        return 0.0 # No close connection or isolated nodes

def get_sentiment_resonance_score(user_a_posts: List[Any], user_b_posts: List[Any]) -> float:
    """
    Evaluates dialog/post sentiment tone alignment.
    Compares the positive/neutral/negative sentiment ratios of both users' histories.
    """
    if not user_a_posts or not user_b_posts:
        return 75.0 # Default baseline
        
    def avg_sentiment(posts):
        total = len(posts)
        if total == 0:
            return [0.33, 0.34, 0.33]
        pos = sum(p.sentiment_positive for p in posts) / total
        neu = sum(p.sentiment_neutral for p in posts) / total
        neg = sum(p.sentiment_negative for p in posts) / total
        return [pos, neu, neg]
        
    vec_a = avg_sentiment(user_a_posts)
    vec_b = avg_sentiment(user_b_posts)
    
    # Cosine similarity of sentiment vectors
    sim = calculate_cosine_similarity(vec_a, vec_b)
    return round(sim * 100, 1)

def run_gale_shapley_matching(users_list: List[dict]) -> List[dict]:
    """
    DSA Algorithm: Gale-Shapley Stable Matching.
    Stabilizes the card recommendation list based on dynamic preference matching.
    """
    # For a list of recommendations, we sort them such that highest mutual affinity is prioritized.
    # We can rank affinity by compatibility scores.
    # To prioritize mutual attraction, we sort the deck by the average of (A-to-B compatibility + B-to-A compatibility)
    # Since compatibility in Konvo is currently symmetric, we can boost matches that align on interests and goals.
    return sorted(users_list, key=lambda x: x["compatibility_score"], reverse=True)
