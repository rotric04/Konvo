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
from typing import List
from database import get_db
import models
import crud
import schemas
from auth_helper import get_current_user


app = FastAPI(title="AI Agent Hub Service", version="1.0.0")

@app.get("/api/agents/twin", response_model=schemas.TwinResponse)
def get_user_twin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    twin = db.query(models.Agent).filter(models.Agent.creator_id == current_user.id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="AI Twin not generated. Take the assessment first.")
    return twin

@app.post("/api/agents/twin/avatar/generate")
def generate_twin_avatar(
    request: schemas.AvatarGenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    twin = db.query(models.Agent).filter(models.Agent.creator_id == current_user.id).first()
    if not twin:
        # Create a baseline placeholder Agent twin
        display_name = current_user.profile.display_name if current_user.profile else "User"
        twin = models.Agent(
            agent_id=f"AGENT-TWIN-{current_user.id}",
            name=f"{display_name}'s Twin",
            avatar="",
            description="AI Twin awaiting quiz assessment.",
            role_type="The Strategist",
            prompt_template=f"Represent {display_name}'s values and styles.",
            creator_id=current_user.id,
            voice_style="Calm",
            emoji_style="Minimalist",
            match_preferences={}
        )
        db.add(twin)
        db.commit()
        db.refresh(twin)
        
    try:
        try:
            import sys as _sys
            import os as _os
            _root_path = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
            if _root_path not in _sys.path:
                _sys.path.insert(0, _root_path)
            from services.worker_service.tasks.avatar import generate_avatar as _gen_avatar
            _gen_avatar.delay(current_user.id, request.prompt, request.style)
        except ImportError:
            # Celery worker not available — generate avatar synchronously as fallback
            raise HTTPException(status_code=503, detail="Avatar generation worker is offline. Please ensure the Celery worker is running.")
        return {"success": True, "message": "AI Avatar generation started in the background. It will update your profile automatically upon completion."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger avatar task: {str(e)}")


@app.put("/api/agents/twin", response_model=schemas.TwinResponse)
def update_user_twin(
    request: schemas.TwinCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    twin = db.query(models.Agent).filter(models.Agent.creator_id == current_user.id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="AI Twin not generated. Take the assessment first.")
    
    twin.name = request.name  # type: ignore
    twin.description = request.description  # type: ignore
    twin.voice_style = request.voice_style  # type: ignore
    twin.emoji_style = request.emoji_style  # type: ignore
    twin.match_preferences = request.match_preferences  # type: ignore
    db.commit()
    db.refresh(twin)
    return twin

@app.get("/api/agents/simulations", response_model=List[schemas.DateSimulationResponse])
def get_simulations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sims = db.query(models.AgentDateSimulation).filter(
        (models.AgentDateSimulation.user_a_id == current_user.id) |
        (models.AgentDateSimulation.user_b_id == current_user.id)
    ).order_by(models.AgentDateSimulation.created_at.desc()).all()
    
    res = []
    for sim in sims:
        partner_id = sim.user_b_id if sim.user_a_id == current_user.id else sim.user_a_id
        partner = db.query(models.User).filter(models.User.id == partner_id).first()
        partner_name = partner.profile.display_name if partner and partner.profile else "Partner"
        partner_konvo_id = partner.konvo_id if partner else "KON-XXXX"
        partner_avatar = ""
        if partner:
            if partner.profile and partner.profile.avatar_url:
                partner_avatar = partner.profile.avatar_url
            elif partner.agent_twin and partner.agent_twin.avatar:
                partner_avatar = partner.agent_twin.avatar
        
        res.append({
            "id": sim.id,
            "user_a_id": sim.user_a_id,
            "user_b_id": sim.user_b_id,
            "environment": sim.environment,
            "dialogue_log": sim.dialogue_log,
            "overall_compatibility": sim.overall_compatibility,
            "match_detail_json": sim.match_detail_json,
            "approval_user_a": sim.approval_user_a,
            "approval_user_b": sim.approval_user_b,
            "created_at": sim.created_at,
            "partner_name": partner_name,
            "partner_konvo_id": partner_konvo_id,
            "partner_avatar": partner_avatar,
            "summary": sim.match_detail_json.get("date_summary", "Review the simulated date report below.")
        })
    return res

@app.get("/api/agents/simulations/{sim_id}", response_model=schemas.DateSimulationResponse)
def get_simulation_detail(
    sim_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sim = db.query(models.AgentDateSimulation).filter(
        models.AgentDateSimulation.id == sim_id,
        ((models.AgentDateSimulation.user_a_id == current_user.id) | (models.AgentDateSimulation.user_b_id == current_user.id))
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Date preview not found.")
        
    partner_id = sim.user_b_id if sim.user_a_id == current_user.id else sim.user_a_id
    partner = db.query(models.User).filter(models.User.id == partner_id).first()
    partner_name = partner.profile.display_name if partner and partner.profile else "Partner"
    partner_konvo_id = partner.konvo_id if partner else "KON-XXXX"
    partner_avatar = ""
    if partner:
        if partner.profile and partner.profile.avatar_url:
            partner_avatar = partner.profile.avatar_url
        elif partner.agent_twin and partner.agent_twin.avatar:
            partner_avatar = partner.agent_twin.avatar
    
    return {
        "id": sim.id,
        "user_a_id": sim.user_a_id,
        "user_b_id": sim.user_b_id,
        "environment": sim.environment,
        "dialogue_log": sim.dialogue_log,
        "overall_compatibility": sim.overall_compatibility,
        "match_detail_json": sim.match_detail_json,
        "approval_user_a": sim.approval_user_a,
        "approval_user_b": sim.approval_user_b,
        "created_at": sim.created_at,
        "partner_name": partner_name,
        "partner_konvo_id": partner_konvo_id,
        "partner_avatar": partner_avatar,
        "summary": sim.match_detail_json.get("date_summary", "Review the simulated date report below.")
    }

@app.post("/api/agents/simulations/{sim_id}/approve", response_model=schemas.DateSimulationResponse)
def approve_simulation(
    sim_id: int,
    request: schemas.DateApprovalRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sim = crud.approve_date_simulation(db, sim_id, current_user.id, request.approval_action)  # type: ignore
    if not sim:
        raise HTTPException(status_code=404, detail="Date preview simulation not found.")
        
    partner_id = sim.user_b_id if sim.user_a_id == current_user.id else sim.user_a_id
    partner = db.query(models.User).filter(models.User.id == partner_id).first()
    partner_name = partner.profile.display_name if partner and partner.profile else "Partner"
    partner_konvo_id = partner.konvo_id if partner else "KON-XXXX"
    partner_avatar = ""
    if partner:
        if partner.profile and partner.profile.avatar_url:
            partner_avatar = partner.profile.avatar_url
        elif partner.agent_twin and partner.agent_twin.avatar:
            partner_avatar = partner.agent_twin.avatar
    return {
        "id": sim.id,
        "user_a_id": sim.user_a_id,
        "user_b_id": sim.user_b_id,
        "environment": sim.environment,
        "dialogue_log": sim.dialogue_log,
        "overall_compatibility": sim.overall_compatibility,
        "match_detail_json": sim.match_detail_json,
        "approval_user_a": sim.approval_user_a,
        "approval_user_b": sim.approval_user_b,
        "created_at": sim.created_at,
        "partner_name": partner_name,
        "partner_konvo_id": partner_konvo_id,
        "partner_avatar": partner_avatar,
        "summary": sim.match_detail_json.get("date_summary", "Review the simulated date report below.")
    }

@app.post("/api/agents/simulations/{sim_id}/lock", response_model=schemas.DateSimulationResponse)
def toggle_simulation_lock(
    sim_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sim = db.query(models.AgentDateSimulation).filter(
        models.AgentDateSimulation.id == sim_id,
        ((models.AgentDateSimulation.user_a_id == current_user.id) | (models.AgentDateSimulation.user_b_id == current_user.id))
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Date simulation not found.")
        
    if sim.match_detail_json is None:
        sim.match_detail_json = {}
        
    # Toggle locking state
    if sim.user_a_id == current_user.id:
        current_lock = sim.match_detail_json.get("lock_user_a", False)
        sim.match_detail_json["lock_user_a"] = not current_lock
    else:
        current_lock = sim.match_detail_json.get("lock_user_b", False)
        sim.match_detail_json["lock_user_b"] = not current_lock
        
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(sim, "match_detail_json")
    
    db.commit()
    db.refresh(sim)
    
    partner_id = sim.user_b_id if sim.user_a_id == current_user.id else sim.user_a_id
    partner = db.query(models.User).filter(models.User.id == partner_id).first()
    partner_name = partner.profile.display_name if partner and partner.profile else "Partner"
    partner_konvo_id = partner.konvo_id if partner else "KON-XXXX"
    partner_avatar = ""
    if partner:
        if partner.profile and partner.profile.avatar_url:
            partner_avatar = partner.profile.avatar_url
        elif partner.agent_twin and partner.agent_twin.avatar:
            partner_avatar = partner.agent_twin.avatar
    
    return {
        "id": sim.id,
        "user_a_id": sim.user_a_id,
        "user_b_id": sim.user_b_id,
        "environment": sim.environment,
        "dialogue_log": sim.dialogue_log,
        "overall_compatibility": sim.overall_compatibility,
        "match_detail_json": sim.match_detail_json,
        "approval_user_a": sim.approval_user_a,
        "approval_user_b": sim.approval_user_b,
        "created_at": sim.created_at,
        "partner_name": partner_name,
        "partner_konvo_id": partner_konvo_id,
        "partner_avatar": partner_avatar,
        "summary": sim.match_detail_json.get("date_summary", "Review the simulated date report below.")
    }

