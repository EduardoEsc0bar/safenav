from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    start_id: str = "student_center"
    end_id: str = "dorms"
    algorithm: Literal["dijkstra", "astar"] = "astar"
    risk_weight: float = Field(default=5.0, ge=0.0, le=50.0)


class SimulationRequest(BaseModel):
    event: Literal["night_mode", "low_visibility", "crowd_dispersal", "path_blocked", "high_activity_zone"]


class PerceptionFeatures(BaseModel):
    lighting_score: float = Field(ge=0.0, le=1.0)
    visibility_score: float = Field(ge=0.0, le=1.0)
    crowd_score: float = Field(ge=0.0, le=1.0)
    motion_score: float = Field(ge=0.0, le=1.0)
    obstruction_score: float = Field(default=0.0, ge=0.0, le=1.0)


class ApplyPerceptionRequest(BaseModel):
    node_id: str
    features: PerceptionFeatures
