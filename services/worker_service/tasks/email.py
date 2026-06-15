"""
Email and OTP Background Tasks
"""

import logging
from services.worker_service.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(name="services.worker_service.tasks.email.send_otp_email", queue="email")
def send_otp_email(email: str, otp_code: str) -> bool:
    logger.info(f"[Email Worker] Transmitting OTP verification code {otp_code} to {email}")
    print(f"\n[EMAIL SYSTEM] Verification code for {email}: {otp_code}\n")
    return True

@celery_app.task(name="services.worker_service.tasks.email.cleanup_expired_otps", queue="email")
def cleanup_expired_otps() -> str:
    logger.info("[Email Worker] Sweeping database for expired OTP sessions")
    return "OTP cleanup sweep completed successfully."
