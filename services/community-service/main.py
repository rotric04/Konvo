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

app = FastAPI(title="Community Service", version="1.0.0")

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
    return db_comm
