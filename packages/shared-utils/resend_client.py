# packages/shared-utils/resend_client.py
import os
import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Konvo <onboarding@resend.dev>") # Default Resend sandbox domain email

class ResendClient:
    def __init__(self):
        self.api_key = RESEND_API_KEY
        self.from_email = FROM_EMAIL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.url = "https://api.resend.com/emails"

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        if not self.api_key:
            print(f"\n[MOCK RESEND] No API Key. Simulated email to {to_email}:")
            print(f"Subject: {subject}")
            print(f"Content Preview: {html_content[:200]}...\n")
            return True

        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }

        try:
            response = httpx.post(self.url, headers=self.headers, json=payload, timeout=5.0)
            if response.status_code in [200, 201]:
                print(f"[RESEND] Successfully sent email to {to_email}")
                return True
            else:
                print(f"[RESEND ERROR] Failed to send email: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"[RESEND EXCEPTION] Error connecting to Resend: {e}")
            return False

    def send_otp_email(self, to_email: str, otp_code: str) -> bool:
        subject = "Your Konvo Authentication Code"
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #0d9488; text-align: center;">Konvo Security Verification</h2>
            <p>Welcome to the world's first Behavioral Internet. Please use the verification code below to complete your registration or verify your identity.</p>
            <div style="background-color: #f4f4f5; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e4e4e7;">
                {otp_code}
            </div>
            <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 30px;">
                If you did not request this code, you can safely ignore this email.
            </p>
        </div>
        """
        return self.send_email(to_email, subject, html_content)

    def send_marketing_welcome_email(self, to_email: str, display_name: str) -> bool:
        subject = "Welcome to Konvo.Space — Human Intelligence Network"
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #6366f1;">Welcome to Konvo, {display_name}!</h2>
            <p>You have successfully initialized your sovereign node. You are now part of the world's first Behavioral Internet.</p>
            <p>Your unique MBTI type, astrology rotation, and behavioral fingerprints are being calibrated by our engines. Meet matches through direct agent simulation dates and see where your resonance scores align!</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://konvo.space" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Launch Dashboard</a>
            </div>
            <p style="font-size: 12px; color: #71717a; text-align: center;">
                Follow us on Twitter for development updates.
            </p>
        </div>
        """
        return self.send_email(to_email, subject, html_content)

    def send_user_guide_email(self, to_email: str, display_name: str) -> bool:
        subject = "Konvo.Space — Quickstart User Guide & Tips"
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #0d9488;">Getting Started with Konvo</h2>
            <p>Hello {display_name}, here is a quick guide to understanding the mechanics of your behavioral deck:</p>
            
            <h3 style="color: #0f172a;">1. The MBTI & DNA Profiler</h3>
            <p>Take the 50-question personality assessment to calibrate your behavioral twin. Our neural matching system updates your Curiousness, Listening, and Empathy scales based on your conversation logs.</p>
            
            <h3 style="color: #0f172a;">2. Swipe Discovery & Twin Simulation</h3>
            <p>Swipe interest on profiles you align with. When a mutual match occurs, our gRPC agents launch a virtual coffee shop date simulation. You can review the chat simulation before deciding to unlock real human chat.</p>
            
            <h3 style="color: #0f172a;">3. The Resonance Graph</h3>
            <p>Explore your svg topology network nodes and edges dynamically to find the strongest pathways in the behavioral web.</p>
            
            <p style="margin-top: 30px;">For any questions, reach out via the <b>Sovereign Feedback Loop</b> in your settings panel.</p>
        </div>
        """
        return self.send_email(to_email, subject, html_content)

resend_client = ResendClient()
