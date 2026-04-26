from __future__ import annotations

from copy import deepcopy
from typing import Any

from .risk import score_risk


BASELINE_GRAPH: dict[str, list[dict[str, Any]]] = {
    "nodes": [
        {
            "id": "main_gate",
            "name": "Nord Hall",
            "x": 18,
            "y": 65,
            "base_risk": 0.2,
            "dynamic_risk": 0.0,
            "lighting_score": 0.78,
            "crowd_score": 0.52,
            "visibility_score": 0.78,
            "motion_score": 0.38,
            "obstruction_score": 0.05,
            "status": "open",
        },
        {
            "id": "library",
            "name": "Library",
            "x": 47,
            "y": 48,
            "base_risk": 0.14,
            "dynamic_risk": 0.0,
            "lighting_score": 0.88,
            "crowd_score": 0.72,
            "visibility_score": 0.82,
            "motion_score": 0.41,
            "obstruction_score": 0.04,
            "status": "open",
        },
        {
            "id": "student_center",
            "name": "Campus Center",
            "x": 71,
            "y": 30,
            "base_risk": 0.12,
            "dynamic_risk": 0.0,
            "lighting_score": 0.9,
            "crowd_score": 0.86,
            "visibility_score": 0.88,
            "motion_score": 0.52,
            "obstruction_score": 0.03,
            "status": "open",
        },
        {
            "id": "dorms",
            "name": "Dorms",
            "x": 70,
            "y": 90,
            "base_risk": 0.28,
            "dynamic_risk": 0.0,
            "lighting_score": 0.7,
            "crowd_score": 0.52,
            "visibility_score": 0.74,
            "motion_score": 0.34,
            "obstruction_score": 0.08,
            "status": "open",
        },
        {
            "id": "parking_lot",
            "name": "Quintyne Parking Lot",
            "x": 61,
            "y": 18,
            "base_risk": 0.42,
            "dynamic_risk": 0.0,
            "lighting_score": 0.5,
            "crowd_score": 0.22,
            "visibility_score": 0.6,
            "motion_score": 0.25,
            "obstruction_score": 0.12,
            "status": "warning",
        },
        {
            "id": "gym",
            "name": "Knapp Hall",
            "x": 52,
            "y": 56,
            "base_risk": 0.2,
            "dynamic_risk": 0.0,
            "lighting_score": 0.76,
            "crowd_score": 0.62,
            "visibility_score": 0.72,
            "motion_score": 0.55,
            "obstruction_score": 0.06,
            "status": "open",
        },
        {
            "id": "science_building",
            "name": "Quintyne Hall",
            "x": 61,
            "y": 32,
            "base_risk": 0.18,
            "dynamic_risk": 0.0,
            "lighting_score": 0.78,
            "crowd_score": 0.54,
            "visibility_score": 0.8,
            "motion_score": 0.32,
            "obstruction_score": 0.05,
            "status": "open",
        },
        {
            "id": "dining_hall",
            "name": "Hale Hall",
            "x": 45,
            "y": 37,
            "base_risk": 0.17,
            "dynamic_risk": 0.0,
            "lighting_score": 0.84,
            "crowd_score": 0.78,
            "visibility_score": 0.78,
            "motion_score": 0.5,
            "obstruction_score": 0.04,
            "status": "open",
        },
        {
            "id": "quad",
            "name": "Whitman Hall",
            "x": 62,
            "y": 50,
            "base_risk": 0.2,
            "dynamic_risk": 0.0,
            "lighting_score": 0.68,
            "crowd_score": 0.58,
            "visibility_score": 0.83,
            "motion_score": 0.36,
            "obstruction_score": 0.06,
            "status": "open",
        },
        {
            "id": "bus_stop",
            "name": "East Campus Path",
            "x": 99,
            "y": 58,
            "base_risk": 0.31,
            "dynamic_risk": 0.0,
            "lighting_score": 0.66,
            "crowd_score": 0.44,
            "visibility_score": 0.7,
            "motion_score": 0.45,
            "obstruction_score": 0.09,
            "status": "open",
        },
        {
            "id": "engineering_hall",
            "name": "Gleeson Hall",
            "x": 59,
            "y": 40,
            "base_risk": 0.16,
            "dynamic_risk": 0.0,
            "lighting_score": 0.81,
            "crowd_score": 0.6,
            "visibility_score": 0.81,
            "motion_score": 0.39,
            "obstruction_score": 0.05,
            "status": "open",
        },
        {
            "id": "security_office",
            "name": "Lupton Hall",
            "x": 33,
            "y": 45,
            "base_risk": 0.16,
            "dynamic_risk": 0.0,
            "lighting_score": 0.84,
            "crowd_score": 0.64,
            "visibility_score": 0.86,
            "motion_score": 0.3,
            "obstruction_score": 0.02,
            "status": "open",
        },
    ],
    "edges": [
        {"id": "e_gate_security", "from": "main_gate", "to": "security_office", "distance": 18, "base_risk": 0.12, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_gate_dining", "from": "main_gate", "to": "dining_hall", "distance": 38, "base_risk": 0.15, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_security_library", "from": "security_office", "to": "library", "distance": 14, "base_risk": 0.1, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_security_student", "from": "security_office", "to": "student_center", "distance": 41, "base_risk": 0.13, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_library_student", "from": "library", "to": "student_center", "distance": 31, "base_risk": 0.09, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_library_science", "from": "library", "to": "science_building", "distance": 21, "base_risk": 0.1, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_student_quad", "from": "student_center", "to": "quad", "distance": 22, "base_risk": 0.11, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_student_science", "from": "student_center", "to": "science_building", "distance": 11, "base_risk": 0.08, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_student_dining", "from": "student_center", "to": "dining_hall", "distance": 29, "base_risk": 0.09, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_dining_quad", "from": "dining_hall", "to": "quad", "distance": 19, "base_risk": 0.11, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_quad_gym", "from": "quad", "to": "gym", "distance": 12, "base_risk": 0.13, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_quad_engineering", "from": "quad", "to": "engineering_hall", "distance": 11, "base_risk": 0.1, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_science_engineering", "from": "science_building", "to": "engineering_hall", "distance": 9, "base_risk": 0.08, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_engineering_dorms", "from": "engineering_hall", "to": "dorms", "distance": 53, "base_risk": 0.2, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_engineering_bus", "from": "engineering_hall", "to": "bus_stop", "distance": 45, "base_risk": 0.19, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_bus_dorms", "from": "bus_stop", "to": "dorms", "distance": 43, "base_risk": 0.27, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_bus_parking", "from": "bus_stop", "to": "parking_lot", "distance": 55, "base_risk": 0.34, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_parking_gym", "from": "parking_lot", "to": "gym", "distance": 39, "base_risk": 0.31, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_gym_student", "from": "gym", "to": "student_center", "distance": 32, "base_risk": 0.16, "dynamic_risk": 0.0, "status": "open"},
        {"id": "e_parking_dorms", "from": "parking_lot", "to": "dorms", "distance": 73, "base_risk": 0.39, "dynamic_risk": 0.0, "status": "open"},
    ],
}


class CampusGraph:
    def __init__(self) -> None:
        self._graph = deepcopy(BASELINE_GRAPH)
        self.recompute_all_risk()

    def as_dict(self) -> dict[str, list[dict[str, Any]]]:
        return deepcopy(self._graph)

    def reset(self) -> dict[str, list[dict[str, Any]]]:
        self._graph = deepcopy(BASELINE_GRAPH)
        self.recompute_all_risk()
        return self.as_dict()

    @property
    def nodes(self) -> list[dict[str, Any]]:
        return self._graph["nodes"]

    @property
    def edges(self) -> list[dict[str, Any]]:
        return self._graph["edges"]

    def node_map(self) -> dict[str, dict[str, Any]]:
        return {node["id"]: node for node in self.nodes}

    def edge_map(self) -> dict[str, dict[str, Any]]:
        return {edge["id"]: edge for edge in self.edges}

    def recompute_all_risk(self) -> None:
        for node in self.nodes:
            risk = score_risk(
                lighting_score=node["lighting_score"],
                crowd_score=node["crowd_score"],
                visibility_score=node["visibility_score"],
                motion_score=node["motion_score"],
                obstruction_score=node.get("obstruction_score", 0.0),
                base_risk=node["base_risk"],
            )
            node["dynamic_risk"] = risk.score
            node["risk_category"] = risk.category
            node["risk_explanation"] = risk.explanation

        nodes = self.node_map()
        for edge in self.edges:
            start = nodes[edge["from"]]
            end = nodes[edge["to"]]
            edge_risk = (edge["base_risk"] + start["dynamic_risk"] + end["dynamic_risk"]) / 3.0
            edge["dynamic_risk"] = round(edge_risk, 4)
            edge["risk_category"] = self.edge_category(edge)

    def update_node_features(self, node_id: str, features: dict[str, float]) -> dict[str, Any]:
        nodes = self.node_map()
        if node_id not in nodes:
            raise KeyError(f"Unknown node '{node_id}'")
        node = nodes[node_id]
        for key in ("lighting_score", "crowd_score", "visibility_score", "motion_score", "obstruction_score"):
            if key in features:
                node[key] = max(0.0, min(1.0, float(features[key])))
        self.recompute_all_risk()
        return deepcopy(node)

    def update_edge_status(self, edge_ids: list[str], status: str) -> None:
        edges = self.edge_map()
        for edge_id in edge_ids:
            if edge_id in edges:
                edges[edge_id]["status"] = status
        self.recompute_all_risk()

    def summary_metrics(self) -> dict[str, float]:
        count = max(1, len(self.nodes))
        return {
            "lighting_score": round(sum(node["lighting_score"] for node in self.nodes) / count, 3),
            "crowd_score": round(sum(node["crowd_score"] for node in self.nodes) / count, 3),
            "visibility_score": round(sum(node["visibility_score"] for node in self.nodes) / count, 3),
            "motion_score": round(sum(node["motion_score"] for node in self.nodes) / count, 3),
            "obstruction_score": round(sum(node.get("obstruction_score", 0.0) for node in self.nodes) / count, 3),
            "overall_risk": round(sum(node["dynamic_risk"] for node in self.nodes) / count, 3),
        }

    @staticmethod
    def edge_category(edge: dict[str, Any]) -> str:
        if edge["status"] == "blocked":
            return "blocked"
        risk = edge["dynamic_risk"]
        if risk < 0.25:
            return "low"
        if risk < 0.5:
            return "medium"
        if risk < 0.75:
            return "high"
        return "critical"
