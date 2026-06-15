# packages/shared-utils/linotp_client.py
import os
import httpx

LINOTP_API_URL = os.getenv("LINOTP_API_URL", "")

class LinOTPClient:
    def __init__(self):
        self.api_url = LINOTP_API_URL.rstrip('/')
        self.client = httpx.Client(timeout=5.0)

    def validate_otp(self, username: str, otp_code: str) -> bool:
        """
        Validate OTP code against LinOTP API `/validate/check` endpoint.
        Returns True if successful, False otherwise.
        """
        if not self.api_url:
            print(f"[LINOTP MOCK] No LINOTP_API_URL configured. Falling back to local verification.")
            return False

        # In LinOTP, /validate/check expects 'user' and 'pass' (where 'pass' is the OTP value)
        url = f"{self.api_url}/validate/check"
        params = {
            "user": username,
            "pass": otp_code
        }

        try:
            response = self.client.post(url, data=params)
            if response.status_code == 200:
                res_data = response.json()
                # LinOTP returns JSON structure with "result" key:
                # {"jsonrpc": "2.0", "result": {"status": true, "value": true}}
                result = res_data.get("result", {})
                status = result.get("status", False)
                value = result.get("value", False)
                
                if status and value:
                    print(f"[LINOTP] Validation succeeded for user {username}")
                    return True
                else:
                    print(f"[LINOTP] Validation failed for user {username}: {res_data}")
                    return False
            else:
                print(f"[LINOTP ERROR] HTTP Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            print(f"[LINOTP EXCEPTION] Failed to connect to LinOTP server: {e}")
            return False

linotp_client = LinOTPClient()
