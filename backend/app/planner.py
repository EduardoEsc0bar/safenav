from __future__ import annotations

import heapq
import math
import time
from dataclasses import dataclass
from typing import Any, Callable


BLOCKED_PENALTY = 1_000_000.0


@dataclass(frozen=True)
class PlannerResult:
    route_node_ids: list[str]
    route_names: list[str]
    total_distance: float
    total_risk: float
    total_cost: float
    algorithm: str
    compute_time_ms: float
    visited_nodes: int
    explanation: str


class PathPlanner:
    def __init__(self, graph: Any) -> None:
        self.graph = graph

    def compute_dijkstra(self, start_id: str, end_id: str, risk_weight: float = 5.0, distance_weight: float = 1.0) -> PlannerResult:
        """Dijkstra expands the lowest known accumulated route cost first."""
        return self._search(
            start_id=start_id,
            end_id=end_id,
            algorithm="dijkstra",
            risk_weight=risk_weight,
            distance_weight=distance_weight,
            heuristic=lambda _node_id: 0.0,
        )

    def compute_astar(self, start_id: str, end_id: str, risk_weight: float = 5.0, distance_weight: float = 1.0) -> PlannerResult:
        """A* adds a Euclidean lower-bound estimate to focus search toward the goal."""
        nodes = self.graph.node_map()

        def heuristic(node_id: str) -> float:
            node = nodes[node_id]
            goal = nodes[end_id]
            return distance_weight * math.dist((node["x"], node["y"]), (goal["x"], goal["y"]))

        return self._search(
            start_id=start_id,
            end_id=end_id,
            algorithm="astar",
            risk_weight=risk_weight,
            distance_weight=distance_weight,
            heuristic=heuristic,
        )

    def _search(
        self,
        *,
        start_id: str,
        end_id: str,
        algorithm: str,
        risk_weight: float,
        distance_weight: float,
        heuristic: Callable[[str], float],
    ) -> PlannerResult:
        start_time = time.perf_counter()
        nodes = self.graph.node_map()
        if start_id not in nodes or end_id not in nodes:
            raise ValueError("Start and destination must be valid campus node IDs.")
        if nodes[start_id]["status"] == "blocked" or nodes[end_id]["status"] == "blocked":
            raise ValueError("Start and destination must be open nodes.")

        adjacency = self._adjacency()
        frontier: list[tuple[float, str]] = [(0.0, start_id)]
        came_from: dict[str, tuple[str, dict[str, Any]]] = {}
        cost_so_far: dict[str, float] = {start_id: 0.0}
        visited = 0

        while frontier:
            _, current = heapq.heappop(frontier)
            visited += 1
            if current == end_id:
                break

            for neighbor, edge in adjacency.get(current, []):
                if not self._is_traversable(neighbor, edge):
                    continue
                edge_cost = self._edge_cost(edge=edge, neighbor=nodes[neighbor], risk_weight=risk_weight, distance_weight=distance_weight)
                new_cost = cost_so_far[current] + edge_cost
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    priority = new_cost + heuristic(neighbor)
                    heapq.heappush(frontier, (priority, neighbor))
                    came_from[neighbor] = (current, edge)

        compute_time_ms = (time.perf_counter() - start_time) * 1000.0
        if end_id not in cost_so_far:
            return PlannerResult([], [], 0.0, 0.0, BLOCKED_PENALTY, algorithm, round(compute_time_ms, 3), visited, "No route is currently available because all viable paths are blocked.")

        route_ids, route_edges = self._reconstruct(start_id, end_id, came_from)
        total_distance = round(sum(edge["distance"] for edge in route_edges), 3)
        total_risk = round(sum(edge["dynamic_risk"] for edge in route_edges), 4)
        total_cost = round(cost_so_far[end_id], 4)
        route_names = [nodes[node_id]["name"] for node_id in route_ids]
        explanation = self._explain_route(route_ids, route_edges, nodes)
        return PlannerResult(route_ids, route_names, total_distance, total_risk, total_cost, algorithm, round(compute_time_ms, 3), visited, explanation)

    def _adjacency(self) -> dict[str, list[tuple[str, dict[str, Any]]]]:
        adjacency: dict[str, list[tuple[str, dict[str, Any]]]] = {}
        for edge in self.graph.edges:
            adjacency.setdefault(edge["from"], []).append((edge["to"], edge))
            adjacency.setdefault(edge["to"], []).append((edge["from"], edge))
        return adjacency

    def _is_traversable(self, neighbor_id: str, edge: dict[str, Any]) -> bool:
        nodes = self.graph.node_map()
        return edge["status"] != "blocked" and nodes[neighbor_id]["status"] != "blocked"

    @staticmethod
    def _edge_cost(edge: dict[str, Any], neighbor: dict[str, Any], risk_weight: float, distance_weight: float) -> float:
        blocked_penalty = BLOCKED_PENALTY if edge["status"] == "blocked" or neighbor["status"] == "blocked" else 0.0
        risk = (edge["dynamic_risk"] + neighbor["dynamic_risk"]) / 2.0
        return distance_weight * edge["distance"] + risk_weight * risk + blocked_penalty

    @staticmethod
    def _reconstruct(start_id: str, end_id: str, came_from: dict[str, tuple[str, dict[str, Any]]]) -> tuple[list[str], list[dict[str, Any]]]:
        current = end_id
        route_ids = [current]
        route_edges: list[dict[str, Any]] = []
        while current != start_id:
            previous, edge = came_from[current]
            route_edges.append(edge)
            current = previous
            route_ids.append(current)
        route_ids.reverse()
        route_edges.reverse()
        return route_ids, route_edges

    @staticmethod
    def _explain_route(route_ids: list[str], route_edges: list[dict[str, Any]], nodes: dict[str, dict[str, Any]]) -> str:
        if not route_ids:
            return "No route is available under the current graph constraints."
        warnings = [nodes[node_id]["name"] for node_id in route_ids if nodes[node_id].get("risk_category") in {"high", "critical"}]
        blocked_edges = [edge for edge in route_edges if edge["status"] == "blocked"]
        route_text = " -> ".join(nodes[node_id]["name"] for node_id in route_ids)
        if blocked_edges:
            return f"SafeNav selected {route_text} while avoiding blocked paths."
        if warnings:
            return f"SafeNav selected {route_text}; monitor {', '.join(warnings)} because risk remains elevated there."
        return f"SafeNav selected {route_text} because it balances distance with better-lit, higher-visibility areas."
