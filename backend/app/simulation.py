from __future__ import annotations

from typing import Any


def apply_simulation_event(graph: Any, event: str) -> str:
    event = event.strip().lower()
    if event == "night_mode":
        for node in graph.nodes:
            node["lighting_score"] = max(0.12, round(node["lighting_score"] * 0.58, 3))
        explanation = "Night Mode lowered campus lighting scores, increasing risk on darker paths."
    elif event == "low_visibility":
        for node in graph.nodes:
            node["visibility_score"] = max(0.18, round(node["visibility_score"] * 0.62, 3))
            node["obstruction_score"] = min(1.0, round(node.get("obstruction_score", 0.0) + 0.12, 3))
        explanation = "Low Visibility reduced camera confidence and raised obstruction uncertainty."
    elif event == "crowd_dispersal":
        for node in graph.nodes:
            node["crowd_score"] = max(0.08, round(node["crowd_score"] * 0.5, 3))
        explanation = "Crowd Dispersal lowered pedestrian density, making isolated segments riskier."
    elif event == "path_blocked":
        graph.update_edge_status(["e_engineering_dorms", "e_bus_parking", "e_parking_dorms", "e_parking_gym"], "blocked")
        for node in graph.nodes:
            if node["id"] == "parking_lot":
                node["status"] = "blocked"
        explanation = "Path Blocked closed the Parking Lot connector and east dorm approach, forcing the planner to reroute."
    elif event == "high_activity_zone":
        center = "student_center"
        neighbor_ids = {center, "quad", "dining_hall", "library"}
        for node in graph.nodes:
            if node["id"] in neighbor_ids:
                node["motion_score"] = min(1.0, round(node["motion_score"] + 0.28, 3))
                node["crowd_score"] = min(1.0, round(node["crowd_score"] + 0.18, 3))
                node["lighting_score"] = min(1.0, round(node["lighting_score"] + 0.04, 3))
        explanation = "High Activity Zone increased motion and crowd signals near the Student Center."
    else:
        raise ValueError(f"Unsupported simulation event '{event}'.")

    graph.recompute_all_risk()
    return explanation
