from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskResult:
    score: float
    category: str
    explanation: str


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def categorize_risk(score: float) -> str:
    if score < 0.25:
        return "low"
    if score < 0.5:
        return "medium"
    if score < 0.75:
        return "high"
    return "critical"


def score_risk(
    *,
    lighting_score: float,
    crowd_score: float,
    visibility_score: float,
    motion_score: float,
    obstruction_score: float,
    base_risk: float,
) -> RiskResult:
    """Combine perception features into one risk value.

    High lighting, crowd density, and visibility reduce risk. Obstruction raises
    risk directly. Motion is used in the explanation because high activity can
    be positive when crowds are present and suspicious when visibility is low.
    """
    lighting_score = clamp(lighting_score)
    crowd_score = clamp(crowd_score)
    visibility_score = clamp(visibility_score)
    motion_score = clamp(motion_score)
    obstruction_score = clamp(obstruction_score)
    base_risk = clamp(base_risk)

    risk = (
        base_risk * 0.20
        + (1.0 - lighting_score) * 0.25
        + (1.0 - crowd_score) * 0.20
        + (1.0 - visibility_score) * 0.20
        + obstruction_score * 0.15
    )
    score = clamp(risk)
    category = categorize_risk(score)
    explanation = explain_risk(
        score=score,
        lighting_score=lighting_score,
        crowd_score=crowd_score,
        visibility_score=visibility_score,
        motion_score=motion_score,
        obstruction_score=obstruction_score,
        base_risk=base_risk,
    )
    return RiskResult(score=round(score, 4), category=category, explanation=explanation)


def explain_risk(
    *,
    score: float,
    lighting_score: float,
    crowd_score: float,
    visibility_score: float,
    motion_score: float,
    obstruction_score: float,
    base_risk: float,
) -> str:
    causes: list[str] = []
    positives: list[str] = []

    if lighting_score < 0.45:
        causes.append("poor lighting")
    elif lighting_score > 0.75:
        positives.append("strong lighting")

    if crowd_score < 0.35:
        causes.append("low pedestrian density")
    elif crowd_score > 0.7:
        positives.append("higher pedestrian activity")

    if visibility_score < 0.45:
        causes.append("reduced visibility")
    elif visibility_score > 0.75:
        positives.append("clear visibility")

    if obstruction_score > 0.45:
        causes.append("possible obstruction")

    if motion_score > 0.75 and crowd_score < 0.35:
        causes.append("unusual motion in an isolated area")

    if base_risk > 0.55:
        causes.append("historically elevated baseline risk")

    if causes:
        return f"Risk increased because this area has {format_list(causes)}."
    if positives:
        return f"Risk remains controlled because this area has {format_list(positives)}."
    if score < 0.25:
        return "Risk is low because perception signals are balanced and no major hazards are present."
    return "Risk is moderate because perception signals are mixed, with no single dominant hazard."


def format_list(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"
