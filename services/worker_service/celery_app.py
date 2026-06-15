"""
Konvo Worker Service — Celery Application
Handles all asynchronous background processing: avatar generation,
email delivery, content moderation, and scheduled match refreshes.

Broker: Redis (db 1)
Result Backend: Redis (db 2)
"""

import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Initialize Celery application
celery_app = Celery(
    "konvo_worker",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "services.worker_service.tasks.avatar",
        "services.worker_service.tasks.email",
        "services.worker_service.tasks.moderation",
        "services.worker_service.tasks.recommendations",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task routing — keeps heavy tasks on separate queues
    task_routes={
        "services.worker_service.tasks.avatar.*": {"queue": "avatar"},
        "services.worker_service.tasks.email.*": {"queue": "email"},
        "services.worker_service.tasks.moderation.*": {"queue": "moderation"},
        "services.worker_service.tasks.recommendations.*": {"queue": "recommendations"},
    },

    # Retry defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_max_retries=3,
    task_default_retry_delay=60,  # seconds

    # Result expiry
    result_expires=3600,  # 1 hour

    # Visibility timeout (match with Redis maxmemory-policy)
    broker_transport_options={"visibility_timeout": 3600},

    # Scheduled tasks (Celery Beat)
    beat_schedule={
        "refresh-match-recommendations-hourly": {
            "task": "services.worker_service.tasks.recommendations.refresh_all_recommendations",
            "schedule": crontab(minute=0),  # Every hour
        },
        "run-content-moderation-sweep": {
            "task": "services.worker_service.tasks.moderation.moderate_recent_posts",
            "schedule": crontab(minute="*/15"),  # Every 15 min
        },
        "cleanup-expired-otp-codes": {
            "task": "services.worker_service.tasks.email.cleanup_expired_otps",
            "schedule": crontab(minute=30, hour="*/6"),  # Every 6 hours
        },
    }
)

if __name__ == "__main__":
    celery_app.start()
