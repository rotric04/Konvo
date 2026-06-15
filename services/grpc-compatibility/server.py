import grpc
from concurrent import futures
import sys
import os

_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from services.grpc_compatibility.proto import compatibility_pb2_grpc
from services.grpc_compatibility.handler import CompatibilityHandler

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    compatibility_pb2_grpc.add_CompatibilityServiceServicer_to_server(
        CompatibilityHandler(), server
    )
    port = "[::]:50051"
    server.add_insecure_port(port)
    server.start()
    print(f"gRPC Compatibility Service starting on {port}...")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
