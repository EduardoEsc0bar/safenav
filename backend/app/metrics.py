from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MetricsStore:
    last_route_compute_time_ms: float = 0.0
    dijkstra_compute_time_ms: float = 0.0
    astar_compute_time_ms: float = 0.0
    reroutes: int = 0
    current_route_cost: float = 0.0
    current_risk_weight: float = 5.0
    frame_processing_latency_ms: float = 0.0
    perception_update_latency_ms: float = 0.0
    slam_processing_latency_ms: float = 0.0
    map_confidence: float = 0.0
    last_route_node_ids: list[str] = field(default_factory=list)
    live_mode: bool = False
    route_changed: bool = False

    def reset(self) -> None:
        self.last_route_compute_time_ms = 0.0
        self.dijkstra_compute_time_ms = 0.0
        self.astar_compute_time_ms = 0.0
        self.reroutes = 0
        self.current_route_cost = 0.0
        self.current_risk_weight = 5.0
        self.frame_processing_latency_ms = 0.0
        self.perception_update_latency_ms = 0.0
        self.slam_processing_latency_ms = 0.0
        self.map_confidence = 0.0
        self.last_route_node_ids = []
        self.live_mode = False
        self.route_changed = False

    def record_route(self, result: Any, risk_weight: float) -> None:
        previous_route = self.last_route_node_ids
        self.last_route_compute_time_ms = result.compute_time_ms
        if result.algorithm == "dijkstra":
            self.dijkstra_compute_time_ms = result.compute_time_ms
        if result.algorithm == "astar":
            self.astar_compute_time_ms = result.compute_time_ms
        self.current_route_cost = result.total_cost
        self.current_risk_weight = risk_weight
        self.route_changed = bool(previous_route and previous_route != result.route_node_ids)
        if self.route_changed:
            self.reroutes += 1
        self.last_route_node_ids = list(result.route_node_ids)

    def as_dict(self) -> dict[str, Any]:
        return {
            "last_route_compute_time_ms": self.last_route_compute_time_ms,
            "dijkstra_compute_time_ms": self.dijkstra_compute_time_ms,
            "astar_compute_time_ms": self.astar_compute_time_ms,
            "reroutes": self.reroutes,
            "current_route_cost": self.current_route_cost,
            "current_risk_weight": self.current_risk_weight,
            "frame_processing_latency_ms": self.frame_processing_latency_ms,
            "perception_update_latency_ms": self.perception_update_latency_ms,
            "slam_processing_latency_ms": self.slam_processing_latency_ms,
            "map_confidence": self.map_confidence,
            "live_mode": self.live_mode,
            "route_changed": self.route_changed,
        }
