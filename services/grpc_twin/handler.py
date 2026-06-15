import json
import sys
import os
import grpc

_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from database import SessionLocal
import models
from algorithms.date_simulator import simulate_date
from services.grpc_twin.proto import twin_pb2
from services.grpc_twin.proto import twin_pb2_grpc

class TwinHandler(twin_pb2_grpc.TwinServiceServicer):
    def SimulateDate(self, request, context):
        db = SessionLocal()
        try:
            user_a = db.query(models.User).filter(models.User.id == request.user_a_id).first()
            user_b = db.query(models.User).filter(models.User.id == request.user_b_id).first()
            
            if not user_a or not user_b:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("User A or User B not found")
                return twin_pb2.TwinSimulateResponse()
                
            agent_a = user_a.agent_twin
            agent_b = user_b.agent_twin
            
            if not agent_a or not agent_b:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Agent twin for User A or B not generated")
                return twin_pb2.TwinSimulateResponse()
                
            resonance = {"overall_compatibility": request.compatibility_score}
            sim_data = simulate_date(agent_a, agent_b, resonance)
            
            return twin_pb2.TwinSimulateResponse(
                environment=sim_data.get("environment", "Virtual Café"),
                dialogue_log_json=json.dumps(sim_data.get("dialogue_log", [])),
                match_detail_json=json.dumps(sim_data.get("match_detail_json", {}))
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return twin_pb2.TwinSimulateResponse()
        finally:
            db.close()
