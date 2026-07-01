"""
packages/shared-utils/typesense_client.py
Enhanced Typesense client for typo-tolerant global search.

Additions over original:
  - multi_search()  — single-request multi-collection search
  - bulk_index()    — batch document ingestion
  - Collection schemas for users, communities, agents, posts, messages, interests
  - Async-safe HTTP calls via httpx
  - Proper error logging instead of bare prints

Feature-flagged: if TYPESENSE_API_KEY is empty, all operations no-op gracefully.
"""

import os
import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

TYPESENSE_URL     = os.getenv("TYPESENSE_URL", "http://localhost:8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "")

# ─── Collection Schemas ──────────────────────────────────────────────────────

COLLECTION_SCHEMAS: Dict[str, Dict] = {
    "users": {
        "name": "users",
        "fields": [
            {"name": "id",           "type": "string"},
            {"name": "display_name", "type": "string"},
            {"name": "konvo_id",     "type": "string"},
            {"name": "bio",          "type": "string",  "optional": True},
            {"name": "mbti_type",    "type": "string",  "optional": True, "facet": True},
            {"name": "gender",       "type": "string",  "optional": True, "facet": True},
            {"name": "interests",    "type": "string[]","optional": True, "facet": True},
            {"name": "style",        "type": "string",  "optional": True},
        ],
    },
    "communities": {
        "name": "communities",
        "fields": [
            {"name": "id",           "type": "string"},
            {"name": "name",         "type": "string"},
            {"name": "slug",         "type": "string"},
            {"name": "description",  "type": "string",  "optional": True},
            {"name": "health_score", "type": "float",   "optional": True},
        ],
    },
    "agents": {
        "name": "agents",
        "fields": [
            {"name": "id",           "type": "string"},
            {"name": "agent_id",     "type": "string"},
            {"name": "name",         "type": "string"},
            {"name": "role_type",    "type": "string"},
            {"name": "description",  "type": "string",  "optional": True},
            {"name": "creator_name", "type": "string",  "optional": True},
            {"name": "reputation",   "type": "float",   "optional": True},
        ],
    },
    "posts": {
        "name": "posts",
        "fields": [
            {"name": "id",           "type": "string"},
            {"name": "title",        "type": "string"},
            {"name": "content",      "type": "string"},
            {"name": "author_name",  "type": "string",  "optional": True},
            {"name": "created_at",   "type": "string",  "optional": True},
            {"name": "community_id", "type": "string",  "optional": True},
        ],
    },
    "interests": {
        "name": "interests",
        "fields": [
            {"name": "id",           "type": "string"},
            {"name": "name",         "type": "string"},
            {"name": "category",     "type": "string",  "optional": True, "facet": True},
        ],
    },
}


class TypesenseClient:
    def __init__(self):
        self.url = TYPESENSE_URL.rstrip("/")
        self.api_key = TYPESENSE_API_KEY
        self.headers = {
            "X-TYPESENSE-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }
        self.enabled = bool(self.api_key)
        self.initialized_collections: set = set()

    def is_available(self) -> bool:
        """Quick health check — used before every search call."""
        if not self.enabled:
            return False
        try:
            response = httpx.get(
                f"{self.url}/health", headers=self.headers, timeout=1.0
            )
            return response.status_code == 200 and response.json().get("ok") is True
        except Exception:
            return False

    def init_collection(
        self,
        name: str,
        fields: List[Dict[str, Any]],
        default_sorting_field: Optional[str] = None,
    ) -> bool:
        """Create a collection if it doesn't already exist."""
        if not self.is_available():
            return False
        if name in self.initialized_collections:
            return True

        # Check if already exists on server
        try:
            res = httpx.get(
                f"{self.url}/collections/{name}", headers=self.headers, timeout=2.0
            )
            if res.status_code == 200:
                self.initialized_collections.add(name)
                return True
        except Exception:
            pass

        schema: dict = {"name": name, "fields": fields}
        if default_sorting_field:
            schema["default_sorting_field"] = default_sorting_field

        try:
            res = httpx.post(
                f"{self.url}/collections", headers=self.headers, json=schema, timeout=3.0
            )
            if res.status_code in [200, 201]:
                self.initialized_collections.add(name)
                logger.info(f"[TYPESENSE] Created collection: {name}")
                return True
            else:
                logger.error(
                    f"[TYPESENSE] Failed to create collection {name}: "
                    f"{res.status_code} — {res.text[:200]}"
                )
                return False
        except Exception as e:
            logger.error(f"[TYPESENSE] Exception creating collection {name}: {e}")
            return False

    def ensure_all_collections(self):
        """Ensure all standard Konvo collections are initialized."""
        for name, schema in COLLECTION_SCHEMAS.items():
            self.init_collection(name, schema["fields"])

    def upsert_document(self, collection: str, document: Dict[str, Any]) -> bool:
        """Insert or update a single document. Casts id to string."""
        if not self.enabled:
            return False
        if "id" in document:
            document = {**document, "id": str(document["id"])}

        try:
            url = f"{self.url}/collections/{collection}/documents?action=upsert"
            res = httpx.post(url, headers=self.headers, json=document, timeout=2.0)
            if res.status_code in [200, 201]:
                return True
            logger.warning(
                f"[TYPESENSE] Upsert failed in {collection}: "
                f"{res.status_code} — {res.text[:200]}"
            )
            return False
        except Exception as e:
            logger.error(f"[TYPESENSE] Upsert exception in {collection}: {e}")
            return False

    def bulk_index(self, collection: str, documents: List[Dict[str, Any]]) -> int:
        """
        Batch import documents using Typesense's JSONL import endpoint.
        Returns the number of successfully indexed documents.
        """
        if not self.enabled or not documents:
            return 0

        # Cast all ids to string
        docs_clean = [{**d, "id": str(d["id"])} if "id" in d else d for d in documents]
        jsonl = "\n".join(
            __import__("json").dumps(doc) for doc in docs_clean
        )

        try:
            url = f"{self.url}/collections/{collection}/documents/import?action=upsert"
            res = httpx.post(
                url,
                headers={**self.headers, "Content-Type": "text/plain"},
                content=jsonl.encode("utf-8"),
                timeout=10.0,
            )
            if res.status_code in [200, 201]:
                # Parse JSONL response to count successes
                lines = res.text.strip().split("\n")
                success_count = sum(
                    1 for line in lines
                    if __import__("json").loads(line).get("success") is True
                )
                logger.info(
                    f"[TYPESENSE] Bulk indexed {success_count}/{len(documents)} "
                    f"docs into '{collection}'"
                )
                return success_count
            logger.warning(
                f"[TYPESENSE] Bulk import failed for {collection}: "
                f"{res.status_code} — {res.text[:200]}"
            )
            return 0
        except Exception as e:
            logger.error(f"[TYPESENSE] Bulk import exception in {collection}: {e}")
            return 0

    def delete_document(self, collection: str, document_id: str) -> bool:
        """Delete a document from a collection by its id."""
        if not self.enabled:
            return False
        try:
            url = f"{self.url}/collections/{collection}/documents/{document_id}"
            res = httpx.delete(url, headers=self.headers, timeout=2.0)
            return res.status_code == 200
        except Exception as e:
            logger.error(f"[TYPESENSE] Delete exception in {collection}: {e}")
            return False

    def search_documents(
        self,
        collection: str,
        query: str,
        query_by: str,
        filter_by: Optional[str] = None,
        sort_by: Optional[str] = None,
        limit: int = 10,
        num_typos: int = 2,
    ) -> List[Dict[str, Any]]:
        """
        Search a single collection with typo tolerance.

        Args:
            collection: Collection name
            query: Search query string
            query_by: Comma-separated list of fields to search
            filter_by: Optional filter expression (e.g., "gender:=male")
            sort_by: Optional sort expression (e.g., "reputation:desc")
            limit: Max results (default 10)
            num_typos: Typo tolerance level 0-2 (default 2)
        """
        if not self.is_available():
            return []

        params: dict = {
            "q": query,
            "query_by": query_by,
            "per_page": limit,
            "num_typos": num_typos,
            "prefix": "true",
        }
        if filter_by:
            params["filter_by"] = filter_by
        if sort_by:
            params["sort_by"] = sort_by

        try:
            url = f"{self.url}/collections/{collection}/documents/search"
            res = httpx.get(url, headers=self.headers, params=params, timeout=2.0)
            if res.status_code == 200:
                hits = res.json().get("hits", [])
                return [hit["document"] for hit in hits]
            logger.warning(
                f"[TYPESENSE] Search failed for {collection}: "
                f"{res.status_code} — {res.text[:200]}"
            )
            return []
        except Exception as e:
            logger.error(f"[TYPESENSE] Search exception for {collection}: {e}")
            return []

    def multi_search(
        self,
        searches: List[Dict[str, Any]],
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Run multiple searches in a single HTTP request.

        Args:
            searches: List of search dicts, each with:
                      {collection, query, query_by, limit, filter_by, label}
                      'label' is the key in the returned dict.

        Returns:
            Dict mapping label → list of document dicts
        """
        if not self.is_available() or not searches:
            return {s.get("label", s["collection"]): [] for s in searches}

        searches_payload = []
        for s in searches:
            search_params: dict = {
                "collection": s["collection"],
                "q": s.get("query", "*"),
                "query_by": s.get("query_by", ""),
                "per_page": s.get("limit", 10),
                "num_typos": s.get("num_typos", 2),
                "prefix": "true",
            }
            if s.get("filter_by"):
                search_params["filter_by"] = s["filter_by"]
            if s.get("sort_by"):
                search_params["sort_by"] = s["sort_by"]
            searches_payload.append(search_params)

        try:
            url = f"{self.url}/multi_search"
            res = httpx.post(
                url,
                headers=self.headers,
                json={"searches": searches_payload},
                timeout=3.0,
            )
            if res.status_code == 200:
                results_data = res.json().get("results", [])
                output = {}
                for i, s in enumerate(searches):
                    label = s.get("label", s["collection"])
                    if i < len(results_data):
                        hits = results_data[i].get("hits", [])
                        output[label] = [hit["document"] for hit in hits]
                    else:
                        output[label] = []
                return output
            logger.warning(
                f"[TYPESENSE] multi_search failed: {res.status_code} — {res.text[:200]}"
            )
            return {s.get("label", s["collection"]): [] for s in searches}
        except Exception as e:
            logger.error(f"[TYPESENSE] multi_search exception: {e}")
            return {s.get("label", s["collection"]): [] for s in searches}

    def suggest(
        self,
        query: str,
        collections: Optional[List[str]] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Fast autocomplete suggestions across multiple collections.
        Returns a flat list of suggestion objects with {text, type, id}.
        """
        if not self.is_available() or not query:
            return []

        target_collections = collections or ["users", "communities", "agents"]
        searches = [
            {
                "collection": col,
                "query": query,
                "query_by": {
                    "users": "display_name,konvo_id",
                    "communities": "name,description",
                    "agents": "name,role_type",
                    "posts": "title,content",
                }.get(col, "name"),
                "limit": limit,
                "label": col,
            }
            for col in target_collections
        ]

        results = self.multi_search(searches)
        suggestions = []
        for col, docs in results.items():
            for doc in docs:
                suggestions.append({
                    "type": col.rstrip("s"),  # "user", "community", "agent"
                    "id": doc.get("id"),
                    "text": doc.get("display_name") or doc.get("name") or doc.get("title", ""),
                    "subtitle": doc.get("konvo_id") or doc.get("description", "")[:60],
                })
        return suggestions[:limit]

    def is_available_flag(self) -> bool:
        """Alias for health checks."""
        return self.enabled


typesense_client = TypesenseClient()
