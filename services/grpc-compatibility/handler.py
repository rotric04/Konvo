import json
import sys
import os
import grpc

_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from database import SessionLocal
import models
from algorithms.compatibility import calculate_compatibility
from services.grpc_compatibility.proto import compatibility_pb2
from services.grpc_compatibility.proto import compatibility_pb2_grpc

class CompatibilityHandler(compatibility_pb2_grpc.CompatibilityServiceServicer):
    def CalculateCompatibility(self, request, context):
        db = SessionLocal()
        try:
            user_a = db.query(models.User).filter(models.User.id == request.user_id).first()
            user_b = db.query(models.User).filter(models.User.id == request.partner_id).first()
            
            if not user_a or not user_b:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("User or partner not found")
                return compatibility_pb2.CompatibilityResponse()
                
            res = calculate_compatibility(user_a, user_b, db)
            overall = res.get("overall_compatibility", 0.0)
            details = json.dumps(res)
            
            return compatibility_pb2.CompatibilityResponse(
                overall_compatibility=overall,
                details_json=details
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return compatibility_pb2.CompatibilityResponse()
        finally:
            db.close()
