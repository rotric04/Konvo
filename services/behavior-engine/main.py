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

sys.path.append(_root)
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, cast
from database import get_db
import models
import schemas
import crud
from auth_helper import get_current_user
from algorithms.compatibility import calculate_compatibility
import json

app = FastAPI(title="Behavior & Compatibility Engine", version="1.0.0")

def _calculate_compatibility_grpc(user_a, user_b, db) -> dict:
    try:
        import grpc
        from services.grpc_compatibility.proto import compatibility_pb2, compatibility_pb2_grpc
        channel = grpc.insecure_channel("localhost:50051")
        stub = compatibility_pb2_grpc.CompatibilityServiceStub(channel)
        req = compatibility_pb2.CompatibilityRequest(user_id=user_a.id, partner_id=user_b.id)
        resp = stub.CalculateCompatibility(req, timeout=2.0)
        return json.loads(resp.details_json)
    except Exception as e:
        print(f"[gRPC Fallback in Behavior Engine] gRPC call failed: {e}. Calculating locally.")
        return calculate_compatibility(user_a, user_b, db)

@app.get("/api/compatibility/calculate/{target_user_id}")
def get_user_compatibility(
    target_user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot calculate compatibility with yourself.")
    target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")
    return _calculate_compatibility_grpc(current_user, target_user, db)

@app.get("/api/compatibility/discovery", response_model=List[schemas.DiscoveryCard])
def get_discovery_feed(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve active user IDs whom the user has already swiped
    swiped_ids = db.query(models.Swipe.swipee_id).filter(models.Swipe.swiper_id == current_user.id).all()
    swiped_ids = [s[0] for s in swiped_ids]
    
    # Query candidate users (exclude self and already swiped)
    candidates = db.query(models.User).filter(
        models.User.id != current_user.id,
        ~models.User.id.in_(swiped_ids)
    ).all()
    
    cards = []
    for u in candidates:
        if not u.profile or not u.agent_twin:
            continue # twin agent must exist
            
        res = _calculate_compatibility_grpc(current_user, u, db)
        
        cards.append({
            "user_id": u.id,
            "konvo_id": u.konvo_id,
            "display_name": u.profile.display_name,
            "relationship_intent": u.profile.relationship_intent,
            "mbti_type": u.profile.mbti_type,
            "sun_sign": u.profile.sun_sign,
            "compatibility_score": res["overall_compatibility"],
            "compatibility_tier": res["compatibility_tier"],
            "interests": u.profile.interests,
            "bio": u.profile.bio,
            "avatar": u.agent_twin.avatar,
            "voice_style": u.agent_twin.voice_style,
            "emoji_style": u.agent_twin.emoji_style,
            "digipin": u.profile.digipin
        })
        
    # Sort card recommendations using Gale-Shapley stable matching algorithm
    from algorithms.matching_dsa import run_gale_shapley_matching
    cards = run_gale_shapley_matching(cards)
    
    # Sort to prioritize candidates in the same DIGIPIN geographic region
    def get_region_digit(dp):
        if not dp:
            return ""
        c = dp.upper().replace("GP-", "").replace("DIGIPIN-", "").replace("-", "").strip()
        return c[0] if c else ""

    curr_dp = current_user.profile.digipin if current_user.profile else ""
    curr_reg = get_region_digit(curr_dp)
    
    if curr_reg:
        cards.sort(key=lambda x: 0 if get_region_digit(x.get("digipin")) == curr_reg else 1)
        
    return cards

@app.post("/api/compatibility/swipe", response_model=schemas.SwipeResponse)
def swipe_user(
    request: schemas.SwipeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res = crud.execute_swipe(db, cast(int, current_user.id), request)
    return res
