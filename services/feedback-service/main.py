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

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from database import get_db, Base, engine
from auth_helper import get_current_user
import models
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Float

app = FastAPI(title="Feedback Service", version="1.0.0")

class FeedbackEntry(Base):
    __tablename__ = "feedback_entries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    severity = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    category = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    rating = Column(Integer, nullable=True)
    steps = Column(Text, nullable=True)
    page = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Ensure table is created
Base.metadata.create_all(bind=engine)

class FeedbackCreate(BaseModel):
    type: str
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    rating: Optional[int] = None
    steps: Optional[str] = None
    page: Optional[str] = None
    browser: Optional[str] = None
    email: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    type: str
    title: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

@app.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(
    request: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = FeedbackEntry(
        user_id=current_user.id,
        type=request.type,
        title=request.title,
        description=request.description,
        severity=request.severity,
        priority=request.priority,
        category=request.category,
        tags=request.tags or [],
        rating=request.rating,
        steps=request.steps,
        page=request.page,
        browser=request.browser,
        email=request.email
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@app.post("/api/feedback/anonymous")
def submit_feedback_anonymous(request: FeedbackCreate, db: Session = Depends(get_db)):
    entry = FeedbackEntry(
        user_id=None,
        type=request.type,
        title=request.title,
        description=request.description,
        severity=request.severity,
        priority=request.priority,
        category=request.category,
        tags=request.tags or [],
        rating=request.rating,
        steps=request.steps,
        page=request.page,
        browser=request.browser,
        email=request.email
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "received", "message": "Feedback recorded. Thank you!"}

@app.get("/api/feedback", response_model=List[FeedbackResponse])
def list_feedback(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(FeedbackEntry).order_by(FeedbackEntry.created_at.desc()).all()
