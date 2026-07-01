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

from fastapi import FastAPI, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional
from database import get_db
import models
import meilisearch
import json
from dotenv import load_dotenv

load_dotenv()

# ─── Search Client Imports ───────────────────────────────────────────────────
from typesense_client import typesense_client
from redis_client import redis_client

MEILISEARCH_URL        = os.getenv("MEILISEARCH_URL", "http://localhost:7700")
MEILISEARCH_MASTER_KEY = os.getenv("MEILISEARCH_MASTER_KEY", "konvo_meili_dev_key")

# Meilisearch client (fallback tier 2)
try:
    meili_client = meilisearch.Client(MEILISEARCH_URL, MEILISEARCH_MASTER_KEY)
except Exception as e:
    meili_client = None
    print(f"[SEARCH] Meilisearch client init failed: {e}")

app = FastAPI(title="Global Search Service", version="2.0.0")

SEARCH_CACHE_TTL = 30  # seconds


def _db_search(q: str, db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """Tier 3: Database ILIKE fallback search."""
    search_query = f"%{q}%"

    users = (
        db.query(models.User)
        .join(models.UserProfile)
        .filter(
            or_(
                models.User.konvo_id.ilike(search_query),
                models.UserProfile.display_name.ilike(search_query),
                models.UserProfile.bio.ilike(search_query),
            )
        )
        .limit(10)
        .all()
    )
    people_results = [
        {
            "id": u.id,
            "display_name": u.profile.display_name if u.profile else "User",
            "konvo_id": u.konvo_id,
            "bio": u.profile.bio if u.profile else "",
            "style": u.fingerprint.communication_style if u.fingerprint else "Analytical",
        }
        for u in users
    ]

    communities = (
        db.query(models.Community)
        .filter(
            or_(
                models.Community.name.ilike(search_query),
                models.Community.description.ilike(search_query),
            )
        )
        .limit(10)
        .all()
    )
    communities_results = [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "health_score": c.health_score,
        }
        for c in communities
    ]

    agents = (
        db.query(models.Agent)
        .filter(
            or_(
                models.Agent.name.ilike(search_query),
                models.Agent.role_type.ilike(search_query),
                models.Agent.prompt_template.ilike(search_query),
            )
        )
        .limit(10)
        .all()
    )
    agents_results = [
        {
            "id": a.id,
            "agent_id": a.agent_id,
            "name": a.name,
            "role_type": a.role_type,
            "creator_name": (
                a.creator.profile.display_name if a.creator and a.creator.profile else "System"
            ),
            "reputation": a.reputation,
        }
        for a in agents
    ]

    posts = (
        db.query(models.Post)
        .filter(
            or_(
                models.Post.title.ilike(search_query),
                models.Post.content.ilike(search_query),
            )
        )
        .limit(15)
        .all()
    )
    discussions_results = [
        {
            "id": p.id,
            "title": p.title,
            "content": (p.content[:150] + "..." if len(p.content) > 150 else p.content),
            "author_name": (
                p.author.profile.display_name
                if p.author and p.author.profile
                else "Unknown"
            ),
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]

    return {
        "people": people_results,
        "communities": communities_results,
        "agents": agents_results,
        "discussions": discussions_results,
    }


def _typesense_search(q: str) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """Tier 1: Typesense multi-search (typo-tolerant, fast)."""
    if not typesense_client.is_available():
        return None

    try:
        results = typesense_client.multi_search([
            {
                "collection": "users",
                "query": q,
                "query_by": "display_name,konvo_id,bio",
                "limit": 10,
                "label": "people",
            },
            {
                "collection": "communities",
                "query": q,
                "query_by": "name,description",
                "limit": 10,
                "label": "communities",
            },
            {
                "collection": "agents",
                "query": q,
                "query_by": "name,role_type,description",
                "limit": 10,
                "label": "agents",
            },
            {
                "collection": "posts",
                "query": q,
                "query_by": "title,content",
                "limit": 15,
                "label": "discussions",
            },
        ])

        # Normalize id fields to int for API consistency
        def safe_int(val):
            try:
                return int(val)
            except (TypeError, ValueError):
                return val

        return {
            "people": [
                {**doc, "id": safe_int(doc.get("id"))}
                for doc in results.get("people", [])
            ],
            "communities": [
                {**doc, "id": safe_int(doc.get("id"))}
                for doc in results.get("communities", [])
            ],
            "agents": [
                {**doc, "id": safe_int(doc.get("id"))}
                for doc in results.get("agents", [])
            ],
            "discussions": [
                {**doc, "id": safe_int(doc.get("id"))}
                for doc in results.get("discussions", [])
            ],
        }
    except Exception as e:
        print(f"[SEARCH] Typesense multi_search failed: {e}")
        return None


def _meilisearch_search(q: str) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """Tier 2: Meilisearch search (fuzzy, existing infrastructure)."""
    if not meili_client:
        return None

    try:
        people_res    = meili_client.index("users").search(q, {"limit": 10})
        comm_res      = meili_client.index("communities").search(q, {"limit": 10})
        agent_res     = meili_client.index("agents").search(q, {"limit": 10})
        post_res      = meili_client.index("posts").search(q, {"limit": 15})

        people_results = [
            {
                "id": int(h["id"]),
                "display_name": h.get("display_name", ""),
                "konvo_id": h.get("konvo_id", ""),
                "bio": h.get("bio", ""),
                "style": h.get("style", "Analytical"),
            }
            for h in people_res["hits"]
        ]
        communities_results = [
            {
                "id": int(h["id"]),
                "name": h.get("name", ""),
                "slug": h.get("slug", ""),
                "description": h.get("description", ""),
                "health_score": h.get("health_score", 80.0),
            }
            for h in comm_res["hits"]
        ]
        agents_results = [
            {
                "id": int(h["id"]),
                "agent_id": h.get("agent_id", ""),
                "name": h.get("name", ""),
                "role_type": h.get("role_type", ""),
                "creator_name": h.get("creator_name", "System"),
                "reputation": h.get("reputation", 70.0),
            }
            for h in agent_res["hits"]
        ]
        discussions_results = [
            {
                "id": int(h["id"]),
                "title": h.get("title", ""),
                "content": (
                    h.get("content", "")[:150] + "..."
                    if len(h.get("content", "")) > 150
                    else h.get("content", "")
                ),
                "author_name": h.get("author_name", "Unknown"),
                "created_at": h.get("created_at", ""),
            }
            for h in post_res["hits"]
        ]

        if people_results or communities_results or agents_results or discussions_results:
            return {
                "people": people_results,
                "communities": communities_results,
                "agents": agents_results,
                "discussions": discussions_results,
            }
        return None

    except Exception as e:
        print(f"[SEARCH] Meilisearch search failed: {e}. Falling back to DB.")
        return None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/search")
def global_search(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Global search with 3-tier waterfall:
    1. Typesense (typo-tolerant, multi-search, Redis cached 30s)
    2. Meilisearch (fuzzy, existing infrastructure)
    3. PostgreSQL ILIKE (guaranteed fallback)
    """
    cache_key = f"search:{q.lower().strip()}"

    # Check Redis cache first
    cached = redis_client.cache_get(cache_key)
    if cached:
        return cached

    # Tier 1: Typesense
    results = _typesense_search(q)

    # Tier 2: Meilisearch
    if results is None:
        results = _meilisearch_search(q)

    # Tier 3: Database fallback (always available)
    if results is None:
        results = _db_search(q, db)

    # Cache successful results
    if results:
        redis_client.cache_set(cache_key, results, ttl_seconds=SEARCH_CACHE_TTL)

    return results


@app.get("/api/search/suggest")
def search_suggest(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(5, ge=1, le=10),
) -> List[Dict[str, Any]]:
    """
    Fast autocomplete suggestions.
    Returns up to `limit` suggestions across users, communities, and agents.
    Optimized for <100ms response time via Typesense prefix search.
    """
    if len(q) < 1:
        return []

    cache_key = f"suggest:{q.lower().strip()}:{limit}"
    cached = redis_client.cache_get(cache_key)
    if cached:
        return cached

    suggestions = typesense_client.suggest(
        query=q,
        collections=["users", "communities", "agents"],
        limit=limit,
    )

    if suggestions:
        redis_client.cache_set(cache_key, suggestions, ttl_seconds=60)

    return suggestions


@app.post("/api/search/reindex")
def reindex_all(
    passphrase: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint: bulk re-index all content into Typesense.
    Requires the ADMIN_PASSPHRASE to execute.
    """
    stored_pass = os.getenv("ADMIN_PASSPHRASE", "supersecureadminpass123")
    if passphrase != stored_pass:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not typesense_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Typesense is not available. Configure TYPESENSE_URL and TYPESENSE_API_KEY.",
        )

    # Ensure all collections exist
    typesense_client.ensure_all_collections()

    # Index users
    users = db.query(models.User).join(models.UserProfile).all()
    user_docs = [
        {
            "id": str(u.id),
            "display_name": u.profile.display_name if u.profile else "",
            "konvo_id": u.konvo_id or "",
            "bio": u.profile.bio or "" if u.profile else "",
            "mbti_type": u.profile.mbti_type or "" if u.profile else "",
            "gender": u.profile.gender or "" if u.profile else "",
            "interests": u.profile.interests or [] if u.profile else [],
            "style": (
                u.fingerprint.communication_style if u.fingerprint else "Analytical"
            ),
        }
        for u in users
    ]
    users_indexed = typesense_client.bulk_index("users", user_docs)

    # Index communities
    communities = db.query(models.Community).all()
    comm_docs = [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "description": c.description or "",
            "health_score": c.health_score or 80.0,
        }
        for c in communities
    ]
    comms_indexed = typesense_client.bulk_index("communities", comm_docs)

    # Index agents
    agents = db.query(models.Agent).all()
    agent_docs = [
        {
            "id": str(a.id),
            "agent_id": a.agent_id,
            "name": a.name,
            "role_type": a.role_type,
            "description": a.description or "",
            "creator_name": (
                a.creator.profile.display_name
                if a.creator and a.creator.profile
                else "System"
            ),
            "reputation": a.reputation or 70.0,
        }
        for a in agents
    ]
    agents_indexed = typesense_client.bulk_index("agents", agent_docs)

    # Index posts
    posts = db.query(models.Post).all()
    post_docs = [
        {
            "id": str(p.id),
            "title": p.title,
            "content": p.content[:500] if p.content else "",
            "author_name": (
                p.author.profile.display_name
                if p.author and p.author.profile
                else "Unknown"
            ),
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in posts
    ]
    posts_indexed = typesense_client.bulk_index("posts", post_docs)

    return {
        "success": True,
        "indexed": {
            "users": users_indexed,
            "communities": comms_indexed,
            "agents": agents_indexed,
            "posts": posts_indexed,
        },
    }
