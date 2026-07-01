import sys
import os

# Resolve parent directory to inject path
_curr = os.path.abspath(__file__)
_root = None
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

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

# ─── Optional service integrations (feature-flagged) ─────────────────────────
try:
    from typesense_client import typesense_client as _typesense
except ImportError:
    _typesense = None

try:
    from perspective_client import analyze_toxicity, is_toxic, is_suspicious
    _perspective_available = True
except ImportError:
    _perspective_available = False
    async def analyze_toxicity(text, timeout=2.0):
        return None
    def is_toxic(score):
        return False
    def is_suspicious(score):
        return False

app = FastAPI(title="Community Service", version="2.0.0")


@app.get("/api/communities", response_model=list[schemas.CommunityResponse])
def get_communities(db: Session = Depends(get_db)):
    return db.query(models.Community).all()


@app.post("/api/communities", response_model=schemas.CommunityResponse)
def create_community(comm: schemas.CommunityCreate, db: Session = Depends(get_db)):
    # Simple slug generation
    slug = comm.name.lower().replace(" ", "-").replace("&", "and")

    # Check if slug exists
    exists = db.query(models.Community).filter(models.Community.slug == slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Community domain already registered")

    db_comm = models.Community(
        name=comm.name,
        slug=slug,
        description=comm.description,
        health_score=80.0,
        quality_index=80.0,
        top_contributors=[]
    )
    db.add(db_comm)
    db.commit()
    db.refresh(db_comm)

    # ── Index new community in Typesense ─────────────────────────────────────
    if _typesense and _typesense.is_available():
        try:
            _typesense.upsert_document("communities", {
                "id": str(db_comm.id),
                "name": db_comm.name,
                "slug": db_comm.slug,
                "description": db_comm.description or "",
                "health_score": db_comm.health_score or 80.0,
            })
        except Exception as e:
            print(f"[COMMUNITY] Typesense indexing failed (non-critical): {e}")

    return db_comm


@app.post("/api/communities/{community_id}/posts")
async def create_community_post(
    community_id: int,
    post: schemas.PostCreate,
    db: Session = Depends(get_db)
):
    """
    Create a community post with optional toxicity moderation.
    Posts with toxicity > 0.85 are blocked.
    Posts with toxicity 0.70-0.85 are stored but flagged.
    """
    community = db.query(models.Community).filter(models.Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # ── Toxicity moderation ───────────────────────────────────────────────────
    toxicity_risk = 0.0
    content_to_check = f"{post.title or ''} {post.content or ''}"

    if content_to_check.strip():
        try:
            score = await analyze_toxicity(content_to_check)
            if is_toxic(score):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Your post was blocked because it may contain harmful content. "
                        "Please review our community guidelines and revise your post."
                    )
                )
            if score is not None:
                toxicity_risk = score
                if is_suspicious(score):
                    print(f"[COMMUNITY] Suspicious post flagged for review "
                          f"(community={community_id}, score={score:.2f})")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[COMMUNITY] Toxicity check failed: {e} — allowing post through.")

    # Create the post
    db_post = models.Post(
        title=post.title,
        content=post.content,
        author_id=getattr(post, "author_id", None),
        community_id=community_id,
        toxicity_risk=toxicity_risk,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)

    # ── Index post in Typesense ───────────────────────────────────────────────
    if _typesense and _typesense.is_available():
        try:
            author_name = "Unknown"
            if db_post.author_id:
                author = db.query(models.User).filter(models.User.id == db_post.author_id).first()
                if author and author.profile:
                    author_name = author.profile.display_name

            _typesense.upsert_document("posts", {
                "id": str(db_post.id),
                "title": db_post.title or "",
                "content": (db_post.content or "")[:500],
                "author_name": author_name,
                "community_id": str(community_id),
                "created_at": db_post.created_at.isoformat() if db_post.created_at else "",
            })
        except Exception as e:
            print(f"[COMMUNITY] Post Typesense indexing failed (non-critical): {e}")

    return {
        "id": db_post.id,
        "title": db_post.title,
        "content": db_post.content,
        "community_id": community_id,
        "toxicity_risk": toxicity_risk,
        "created_at": db_post.created_at.isoformat() if db_post.created_at else None,
    }
