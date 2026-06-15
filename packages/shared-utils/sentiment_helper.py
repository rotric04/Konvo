from sqlalchemy.orm import Session
from sqlalchemy import func
import models

def calculate_live_sentiment_stats(db: Session) -> dict:
    total_users = db.query(models.User).count()
    if total_users == 0:
        return {
            "positive": 0.0, "neutral": 1.0, "negative": 0.0,
            "online_count": 0, "male_ratio": 0.0, "female_ratio": 0.0, "unknown_ratio": 1.0
        }
        
    males = db.query(models.UserProfile).filter(models.UserProfile.gender == "Male").count()
    females = db.query(models.UserProfile).filter(models.UserProfile.gender == "Female").count()
    unknowns = total_users - (males + females)
    
    male_ratio = round(males / total_users, 2)
    female_ratio = round(females / total_users, 2)
    unknown_ratio = round(unknowns / total_users, 2)

    post_stats = db.query(
        func.sum(models.Post.sentiment_positive).label("pos"),
        func.sum(models.Post.sentiment_neutral).label("neu"),
        func.sum(models.Post.sentiment_negative).label("neg")
    ).first()
    
    comment_stats = db.query(
        func.sum(models.Comment.sentiment_positive).label("pos"),
        func.sum(models.Comment.sentiment_neutral).label("neu"),
        func.sum(models.Comment.sentiment_negative).label("neg")
    ).first()
    
    total_pos = (post_stats.pos or 0.0) + (comment_stats.pos or 0.0)
    total_neu = (post_stats.neu or 0.0) + (comment_stats.neu or 0.0)
    total_neg = (post_stats.neg or 0.0) + (comment_stats.neg or 0.0)
    total_sent = total_pos + total_neu + total_neg
    
    if total_sent > 0:
        pos_ratio = round(total_pos / total_sent, 2)
        neu_ratio = round(total_neu / total_sent, 2)
        neg_ratio = round(total_neg / total_sent, 2)
    else:
        pos_ratio, neu_ratio, neg_ratio = 0.0, 1.0, 0.0

    return {
        "positive": pos_ratio, "neutral": neu_ratio, "negative": neg_ratio,
        "online_count": total_users,
        "male_ratio": male_ratio, "female_ratio": female_ratio, "unknown_ratio": unknown_ratio
    }
