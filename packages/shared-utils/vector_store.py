import os
import json
import math
import hashlib

class VectorStore:
    def __init__(self):
        self.fallback_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data", "vector-db", "embeddings_store.json"
        )
        os.makedirs(os.path.dirname(self.fallback_file), exist_ok=True)
        
        # Load local vector indexes
        if os.path.exists(self.fallback_file):
            try:
                with open(self.fallback_file, "r") as f:
                    self.registry = json.load(f)
            except Exception:
                self.registry = []
        else:
            self.registry = []

    def _generate_embedding(self, text: str) -> list:
        # Generates a deterministic 128-dimensional float embedding vector
        # by hashing sliding windows of characters to distribute floats.
        dimensions = 128
        embedding = [0.0] * dimensions
        
        # Use sliding character combinations to distribute indices
        text_clean = text.lower().strip()
        if not text_clean:
            return embedding
            
        for i in range(len(text_clean) - 2):
            trigram = text_clean[i:i+3]
            h = int(hashlib.md5(trigram.encode()).hexdigest(), 16)  # nosec B324
            idx = h % dimensions
            weight = (h % 10) / 10.0
            embedding[idx] += weight
            
        # Normalize the embedding vector to unit length (L2 norm = 1.0)
        sq_sum = sum(v * v for v in embedding)
        if sq_sum > 0:
            norm = math.sqrt(sq_sum)
            embedding = [v / norm for v in embedding]
        else:
            embedding = [1.0 / math.sqrt(dimensions)] * dimensions
            
        return embedding

    def upsert(self, item_id: str, text: str, category: str, metadata: dict = None):
        # category can be: semantic_search, agent_memory, discussion_embeddings, recommendation_retrieval
        vector = self._generate_embedding(text)
        
        # Remove existing if updates
        self.registry = [item for item in self.registry if item["id"] != item_id]
        
        self.registry.append({
            "id": item_id,
            "text": text,
            "category": category,
            "vector": vector,
            "metadata": metadata or {}
        })
        
        self.save_store()

    def query_similarity(self, query_text: str, category: str, top_k: int = 5) -> list:
        query_vector = self._generate_embedding(query_text)
        
        results = []
        for item in self.registry:
            if item["category"] != category:
                continue
                
            # Compute cosine similarity: Dot product of unit vectors
            item_vector = item["vector"]
            similarity = sum(qv * iv for qv, iv in zip(query_vector, item_vector))
            
            results.append({
                "id": item["id"],
                "text": item["text"],
                "metadata": item["metadata"],
                "score": round(similarity, 4)
            })
            
        # Sort by similarity descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def save_store(self):
        try:
            with open(self.fallback_file, "w") as f:
                json.dump(self.registry, f, indent=4)
        except Exception as e:
            print("Error writing vector db log:", e)

vector_store = VectorStore()
