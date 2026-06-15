from sqlalchemy.orm import Session
from datetime import datetime
from models import User, Post, Comment, BehavioralFingerprint, BehavioralLedger

def recalculate_fingerprint(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    posts = db.query(Post).filter(Post.author_id == user_id).all()
    comments = db.query(Comment).filter(Comment.author_id == user_id).all()
    total_items = len(posts) + len(comments)

    fingerprint = db.query(BehavioralFingerprint).filter(BehavioralFingerprint.user_id == user_id).first()
    if not fingerprint:
        fingerprint = BehavioralFingerprint(
            user_id=user_id, communication_style="Analytical", debate_style="Constructive",
            listening_score=70.0, empathy_index=70.0, curiosity_index=70.0, creativity_index=70.0,
            leadership_index=70.0, consistency_index=70.0, trust_index=70.0, contribution_score=30.0
        )
        db.add(fingerprint)
        db.commit()
        db.refresh(fingerprint)

    old_values = {
        "listening_score": fingerprint.listening_score, "empathy_index": fingerprint.empathy_index,
        "curiosity_index": fingerprint.curiosity_index, "creativity_index": fingerprint.creativity_index,
        "leadership_index": fingerprint.leadership_index, "consistency_index": fingerprint.consistency_index,
        "trust_index": fingerprint.trust_index, "contribution_score": fingerprint.contribution_score,
        "communication_style": fingerprint.communication_style, "debate_style": fingerprint.debate_style
    }

    if total_items == 0:
        interests_count = len(user.profile.interests) if user.profile and user.profile.interests else 0
        fingerprint.creativity_index = min(100.0, 50.0 + interests_count * 4.0)
        fingerprint.contribution_score = min(100.0, 30.0 + interests_count * 2.0)
        db.commit()
        return

    sum_pos = sum_neu = sum_neg = sum_sup = sum_cur = sum_agg = sum_con = sum_ana = sum_emo = sum_hum = sum_ins = sum_constructiveness = sum_fact_density = sum_toxicity = 0.0

    all_content = posts + comments
    for item in all_content:
        sum_pos += item.sentiment_positive
        sum_neu += item.sentiment_neutral
        sum_neg += item.sentiment_negative
        sum_sup += item.trait_supportive
        sum_cur += item.trait_curious
        sum_agg += item.trait_aggressive
        sum_con += item.trait_constructive
        sum_ana += item.trait_analytical
        sum_emo += item.trait_emotional
        sum_hum += item.trait_humorous
        sum_ins += item.trait_inspirational
        sum_constructiveness += item.constructiveness
        sum_fact_density += item.fact_density
        sum_toxicity += item.toxicity_risk

    n = len(all_content)
    avg_pos = sum_pos / n
    avg_neu = sum_neu / n
    avg_neg = sum_neg / n
    avg_sup = sum_sup / n
    avg_cur = sum_cur / n
    avg_agg = sum_agg / n
    avg_con = sum_con / n
    avg_ana = sum_ana / n
    avg_emo = sum_emo / n
    avg_hum = sum_hum / n
    avg_ins = sum_ins / n
    avg_constructiveness = sum_constructiveness / n
    avg_fact_density = sum_fact_density / n
    avg_toxicity = sum_toxicity / n

    comment_ratio = len(comments) / (len(posts) + 1)
    listening = 40.0 + min(30.0, comment_ratio * 15.0) + (avg_sup * 30.0)
    fingerprint.listening_score = round(max(0.0, min(100.0, listening)), 1)

    empathy = 35.0 + (avg_sup * 50.0) + (avg_pos * 15.0) - (avg_agg * 20.0)
    fingerprint.empathy_index = round(max(0.0, min(100.0, empathy)), 1)

    curiosity = 35.0 + (avg_cur * 50.0) + min(15.0, len(comments) * 1.5)
    fingerprint.curiosity_index = round(max(0.0, min(100.0, curiosity)), 1)

    interests_count = len(user.profile.interests) if user.profile and user.profile.interests else 0
    creativity = 40.0 + (avg_hum * 25.0) + (avg_ins * 25.0) + min(10.0, interests_count * 2.0)
    fingerprint.creativity_index = round(max(0.0, min(100.0, creativity)), 1)

    leadership = 35.0 + min(15.0, len(posts) * 2.0) + (avg_ins * 30.0) + (avg_con * 20.0)
    fingerprint.leadership_index = round(max(0.0, min(100.0, leadership)), 1)

    consistency = 50.0 + min(40.0, n * 2.5) + (10.0 if len(posts) > 0 and len(comments) > 0 else 0.0)
    fingerprint.consistency_index = round(max(0.0, min(100.0, consistency)), 1)

    trust = 50.0 + (avg_constructiveness * 0.3) + (avg_fact_density * 0.2) - (avg_toxicity * 0.6)
    fingerprint.trust_index = round(max(0.0, min(100.0, trust)), 1)

    contribution = 30.0 + (len(posts) * 4.0) + (len(comments) * 1.5)
    fingerprint.contribution_score = round(max(0.0, min(100.0, contribution)), 1)

    if avg_agg > 0.35:
        debate = "Combative"
    elif avg_con > 0.45:
        debate = "Constructive"
    elif avg_cur > 0.45:
        debate = "Socratic"
    else:
        debate = "Balanced"
    fingerprint.debate_style = debate

    styles_map = {
        "Analytical": avg_ana, "Emotional": avg_emo, "Supportive": avg_sup,
        "Humorous": avg_hum, "Inspirational": avg_ins, "Informational": avg_pos + avg_neu * 0.5
    }
    communication = max(styles_map, key=styles_map.get)
    fingerprint.communication_style = communication

    db.commit()

    metrics_to_check = [
        ("listening_score", "Listening Score"), ("empathy_index", "Empathy Index"),
        ("curiosity_index", "Curiosity Index"), ("creativity_index", "Creativity Index"),
        ("leadership_index", "Leadership Index"), ("consistency_index", "Consistency Index"),
        ("trust_index", "Trust Index"), ("contribution_score", "Contribution Score")
    ]

    for metric_key, metric_name in metrics_to_check:
        old_val = old_values[metric_key]
        new_val = getattr(fingerprint, metric_key)
        diff = new_val - old_val
        if abs(diff) >= 1.0:
            reason = f"Recalculated based on total activity counts ({len(posts)} posts, {len(comments)} comments). "
            if diff > 0:
                reason += f"Observed higher levels of associated text patterns (+{round(diff, 1)})."
            else:
                reason += f"Observed lower frequencies of associated text patterns ({round(diff, 1)})."
            
            ledger = BehavioralLedger(
                user_id=user_id, metric_changed=metric_name, previous_value=old_val,
                new_value=new_val, delta=round(diff, 1), reason=reason, timestamp=datetime.utcnow()
            )
            db.add(ledger)

    if old_values["communication_style"] != fingerprint.communication_style:
        ledger = BehavioralLedger(
            user_id=user_id, metric_changed="Communication Style", previous_value=0.0, new_value=1.0, delta=1.0,
            reason=f"Shifted from {old_values['communication_style']} to {fingerprint.communication_style} based on dominant traits.",
            timestamp=datetime.utcnow()
        )
        db.add(ledger)

    if old_values["debate_style"] != fingerprint.debate_style:
        ledger = BehavioralLedger(
            user_id=user_id, metric_changed="Debate Style", previous_value=0.0, new_value=1.0, delta=1.0,
            reason=f"Shifted from {old_values['debate_style']} to {fingerprint.debate_style} based on constructiveness/aggression ratios.",
            timestamp=datetime.utcnow()
        )
        db.add(ledger)

    db.commit()
