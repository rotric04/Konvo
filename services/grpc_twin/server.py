import grpc
from concurrent import futures
import sys
import os

_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from services.grpc_twin.proto import twin_pb2_grpc
from services.grpc_twin.handler import TwinHandler

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    twin_pb2_grpc.add_TwinServiceServicer_to_server(
        TwinHandler(), server
    )
    port = "[::]:50052"
    server.add_insecure_port(port)
    server.start()
    print(f"gRPC Twin Service starting on {port}...")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
