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

from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any
from database import get_db
import models
import meilisearch
from dotenv import load_dotenv

load_dotenv()

MEILISEARCH_URL = os.getenv("MEILISEARCH_URL", "http://localhost:7700")
MEILISEARCH_MASTER_KEY = os.getenv("MEILISEARCH_MASTER_KEY", "konvo_meili_dev_key")

try:
    meili_client = meilisearch.Client(MEILISEARCH_URL, MEILISEARCH_MASTER_KEY)
except Exception as e:
    meili_client = None
    print(f"Failed to initialize Meilisearch client: {e}")

app = FastAPI(title="Global Search Service", version="1.0.0")

@app.get("/api/search")
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)) -> Dict[str, List[Dict[str, Any]]]:
    # Try using Meilisearch first
    if meili_client:
        try:
            # 1. Search people
            people_res = meili_client.index("users").search(q, {"limit": 10})
            people_results = [{"id": int(hit["id"]), "display_name": hit.get("display_name", ""), "konvo_id": hit.get("konvo_id", ""), "bio": hit.get("bio", ""), "style": hit.get("style", "Analytical")} for hit in people_res["hits"]]

            # 2. Search communities
            comm_res = meili_client.index("communities").search(q, {"limit": 10})
            communities_results = [{"id": int(hit["id"]), "name": hit.get("name", ""), "slug": hit.get("slug", ""), "description": hit.get("description", ""), "health_score": hit.get("health_score", 80.0)} for hit in comm_res["hits"]]

            # 3. Search agents
            agent_res = meili_client.index("agents").search(q, {"limit": 10})
            agents_results = [{"id": int(hit["id"]), "agent_id": hit.get("agent_id", ""), "name": hit.get("name", ""), "role_type": hit.get("role_type", ""), "creator_name": hit.get("creator_name", "System"), "reputation": hit.get("reputation", 70.0)} for hit in agent_res["hits"]]

            # 4. Search discussions (posts)
            post_res = meili_client.index("posts").search(q, {"limit": 15})
            discussions_results = [{"id": int(hit["id"]), "title": hit.get("title", ""), "content": hit.get("content", "")[:150] + "..." if len(hit.get("content", "")) > 150 else hit.get("content", ""), "author_name": hit.get("author_name", "Unknown"), "created_at": hit.get("created_at", "")} for hit in post_res["hits"]]

            # If we got hits, return them
            if people_results or communities_results or agents_results or discussions_results:
                return {
                    "people": people_results,
                    "communities": communities_results,
                    "agents": agents_results,
                    "discussions": discussions_results
                }
        except Exception as meili_exc:
            print(f"Meilisearch query failed: {meili_exc}. Falling back to DB search.")

    # Database Search Fallback
    search_query = f"%{q}%"

    users = db.query(models.User).join(models.UserProfile).filter(
        or_(
            models.User.konvo_id.ilike(search_query),
            models.UserProfile.display_name.ilike(search_query),
            models.UserProfile.bio.ilike(search_query)
        )
    ).limit(10).all()
    people_results = [{"id": u.id, "display_name": u.profile.display_name if u.profile else "User", "konvo_id": u.konvo_id, "bio": u.profile.bio if u.profile else "", "style": u.fingerprint.communication_style if u.fingerprint else "Analytical"} for u in users]

    communities = db.query(models.Community).filter(
        or_(
            models.Community.name.ilike(search_query),
            models.Community.description.ilike(search_query)
        )
    ).limit(10).all()
    communities_results = [{"id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "health_score": c.health_score} for c in communities]

    agents = db.query(models.Agent).filter(
        or_(
            models.Agent.name.ilike(search_query),
            models.Agent.role_type.ilike(search_query),
            models.Agent.prompt_template.ilike(search_query)
        )
    ).limit(10).all()
    agents_results = [{"id": a.id, "agent_id": a.agent_id, "name": a.name, "role_type": a.role_type, "creator_name": a.creator.profile.display_name if a.creator and a.creator.profile else "System", "reputation": a.reputation} for a in agents]

    posts = db.query(models.Post).filter(
        or_(
            models.Post.title.ilike(search_query),
            models.Post.content.ilike(search_query)
        )
    ).limit(15).all()
    discussions_results = [{"id": p.id, "title": p.title, "content": p.content[:150] + "..." if len(p.content) > 150 else p.content, "author_name": p.author.profile.display_name if p.author and p.author.profile else "Unknown", "created_at": p.created_at.isoformat() if p.created_at else None} for p in posts]

    return {
        "people": people_results,
        "communities": communities_results,
        "agents": agents_results,
        "discussions": discussions_results
    }
