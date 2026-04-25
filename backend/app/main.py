from __future__ import annotations

from dataclasses import asdict
import os
import tempfile
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .graph import CampusGraph
from .metrics import MetricsStore
from .models import ApplyPerceptionRequest, RouteRequest, SimulationRequest
from .perception import PerceptionProcessor, perception_risk
from .planner import PathPlanner, PlannerResult
from .slam_lite import SlamLiteProcessor, demo_reconstruction
from .simulation import apply_simulation_event


app = FastAPI(title="SafeNav API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = CampusGraph()
metrics = MetricsStore()
perception = PerceptionProcessor()
slam_lite = SlamLiteProcessor()
last_route_request = RouteRequest()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "safenav-api"}


@app.get("/api/graph")
def get_graph() -> dict[str, Any]:
    return {"graph": graph.as_dict(), "summary": graph.summary_metrics()}


@app.post("/api/route")
def post_route(request: RouteRequest) -> dict[str, Any]:
    global last_route_request
    last_route_request = request
    result = _compute_route(request)
    return {"route": result_to_dict(result), "metrics": metrics.as_dict(), "summary": graph.summary_metrics()}


@app.post("/api/simulate")
def post_simulate(request: SimulationRequest) -> dict[str, Any]:
    try:
        explanation = apply_simulation_event(graph, request.event)
        route = _recompute_last_route()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "graph": graph.as_dict(),
        "summary": graph.summary_metrics(),
        "explanation": explanation,
        "route": result_to_dict(route) if route else None,
        "metrics": metrics.as_dict(),
    }


@app.post("/api/reset")
def post_reset() -> dict[str, Any]:
    graph.reset()
    metrics.reset()
    route = _recompute_last_route()
    return {
        "graph": graph.as_dict(),
        "summary": graph.summary_metrics(),
        "explanation": "Simulation reset restored the baseline campus graph and perception features.",
        "route": result_to_dict(route) if route else None,
        "metrics": metrics.as_dict(),
    }


@app.get("/api/metrics")
def get_metrics() -> dict[str, Any]:
    return {"metrics": metrics.as_dict(), "summary": graph.summary_metrics()}


@app.post("/api/perception/frame")
async def post_perception_frame(file: UploadFile = File(...)) -> dict[str, Any]:
    image_bytes = await file.read()
    try:
        features = perception.process_image_bytes(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    metrics.frame_processing_latency_ms = features.get("latency_ms", 0.0)
    metrics.perception_update_latency_ms = features.get("latency_ms", 0.0)
    risk = perception_risk(features)
    return {"features": features, **risk}


@app.get("/api/perception/demo")
def get_perception_demo() -> dict[str, Any]:
    features = perception.demo_features()
    metrics.perception_update_latency_ms = features.get("latency_ms", 0.0)
    risk = perception_risk(features)
    return {"features": features, **risk}


@app.post("/api/perception/apply")
def post_perception_apply(request: ApplyPerceptionRequest) -> dict[str, Any]:
    try:
        node = graph.update_node_features(request.node_id, request.features.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    route = _recompute_last_route()
    return {
        "updated_node": node,
        "graph": graph.as_dict(),
        "summary": graph.summary_metrics(),
        "route": result_to_dict(route) if route else None,
        "metrics": metrics.as_dict(),
        "explanation": f"Perception features were applied to {node['name']} and graph risk was recomputed.",
    }


@app.post("/api/slam/upload-video")
async def post_slam_upload_video(file: UploadFile = File(...), selected_node_id: str = Form("parking_lot")) -> dict[str, Any]:
    suffix = os.path.splitext(file.filename or "upload.mov")[1] or ".mov"
    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            temp_file.write(await file.read())
        try:
            result = slam_lite.process_video(temp_path)
        except Exception as exc:
            result = demo_reconstruction(reason=f"Video processing failed, so demo data was used instead: {exc}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

    route = _apply_slam_result_to_risk(result.as_dict(), selected_node_id)
    return {
        "slam": result.as_dict(),
        "graph": graph.as_dict(),
        "summary": graph.summary_metrics(),
        "route": result_to_dict(route) if route else None,
        "metrics": metrics.as_dict(),
    }


@app.get("/api/slam/demo")
def get_slam_demo(selected_node_id: str = "parking_lot") -> dict[str, Any]:
    result = demo_reconstruction(reason="No uploaded video was used; this is demo data for reliable presentations.")
    route = _apply_slam_result_to_risk(result.as_dict(), selected_node_id)
    return {
        "slam": result.as_dict(),
        "graph": graph.as_dict(),
        "summary": graph.summary_metrics(),
        "route": result_to_dict(route) if route else None,
        "metrics": metrics.as_dict(),
    }


def _compute_route(request: RouteRequest) -> PlannerResult:
    planner = PathPlanner(graph)
    try:
        if request.algorithm == "dijkstra":
            result = planner.compute_dijkstra(request.start_id, request.end_id, request.risk_weight)
        else:
            result = planner.compute_astar(request.start_id, request.end_id, request.risk_weight)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    metrics.record_route(result, request.risk_weight)
    return result


def _recompute_last_route() -> PlannerResult | None:
    if not last_route_request.start_id or not last_route_request.end_id:
        return None
    return _compute_route(last_route_request)


def _apply_slam_result_to_risk(slam_result: dict[str, Any], selected_node_id: str | None = None) -> PlannerResult | None:
    confidence = float(slam_result.get("reconstructionConfidence", 0.0))
    map_confidence = float(slam_result.get("mapConfidence", confidence))
    metrics.slam_processing_latency_ms = float(slam_result.get("processingLatencyMs", 0.0))
    metrics.map_confidence = map_confidence

    # Low visual-odometry confidence means the selected area is hard to map, so
    # route risk increases. Strong matches imply usable map confidence without
    # perturbing the graph.
    if confidence < 0.45:
        target_node_id = selected_node_id or last_route_request.start_id or "parking_lot"
        try:
            node = graph.node_map()[target_node_id]
            graph.update_node_features(
                target_node_id,
                {
                    "visibility_score": min(node["visibility_score"], 0.42),
                    "obstruction_score": max(node.get("obstruction_score", 0.0), 0.38),
                },
            )
        except KeyError:
            pass
    graph.recompute_all_risk()
    return _recompute_last_route()


def result_to_dict(result: PlannerResult) -> dict[str, Any]:
    data = asdict(result)
    data["routeNodeIds"] = data.pop("route_node_ids")
    data["routeNames"] = data.pop("route_names")
    data["totalDistance"] = data.pop("total_distance")
    data["totalRisk"] = data.pop("total_risk")
    data["totalCost"] = data.pop("total_cost")
    data["computeTimeMs"] = data.pop("compute_time_ms")
    data["visitedNodes"] = data.pop("visited_nodes")
    return data
