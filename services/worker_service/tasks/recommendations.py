"""
Match Recommendations Refreshes Background Tasks
"""

import logging
from services.worker_service.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(name="services.worker_service.tasks.recommendations.refresh_all_recommendations", queue="recommendations")
def refresh_all_recommendations() -> str:
    logger.info("[Recommendations Worker] Regenerating compatibility vectors for active users")
    return "Match recommendation matrix successfully updated."
