from __future__ import annotations

import random
import time
from typing import Any

try:
    import cv2  # type: ignore
    import numpy as np
except Exception:  # pragma: no cover - allows the API to start before optional deps are installed.
    cv2 = None
    np = None

from .risk import score_risk


class PerceptionProcessor:
    def __init__(self) -> None:
        self.previous_gray: Any | None = None

    def process_image_bytes(self, image_bytes: bytes) -> dict[str, float]:
        if cv2 is None or np is None:
            return self.demo_features()

        start = time.perf_counter()
        image_array = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Uploaded file could not be decoded as an image.")
        features = self.extract_features(frame)
        features["latency_ms"] = round((time.perf_counter() - start) * 1000.0, 3)
        return features

    def extract_features(self, frame: Any) -> dict[str, float]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Lighting: average grayscale brightness normalized to [0, 1].
        lighting_score = float(gray.mean() / 255.0)

        # Visibility: Laplacian variance is high when edges are sharp, low when blurred.
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        visibility_score = min(1.0, laplacian_var / 500.0)

        # Motion: compare the current grayscale frame to the previous frame.
        motion_score = 0.0
        if self.previous_gray is not None and self.previous_gray.shape == gray.shape:
            diff = cv2.absdiff(gray, self.previous_gray)
            motion_score = min(1.0, float(diff.mean() / 55.0))
        self.previous_gray = gray

        crowd_score = self.estimate_crowd_score(frame)

        # Obstruction uncertainty rises when frames are dark, blurry, or rapidly changing.
        obstruction_score = min(1.0, max(0.0, (1.0 - lighting_score) * 0.35 + (1.0 - visibility_score) * 0.35 + motion_score * 0.2))
        confidence = min(1.0, max(0.35, (lighting_score + visibility_score + (1.0 - obstruction_score)) / 3.0))
        return {
            "lighting_score": round(lighting_score, 3),
            "visibility_score": round(visibility_score, 3),
            "motion_score": round(motion_score, 3),
            "crowd_score": round(crowd_score, 3),
            "obstruction_score": round(obstruction_score, 3),
            "confidence": round(confidence, 3),
            "latency_ms": 0.0,
        }

    def estimate_crowd_score(self, frame: Any) -> float:
        try:
            hog = cv2.HOGDescriptor()
            hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            rects, _weights = hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.05)
            return min(1.0, len(rects) / 5.0)
        except Exception:
            return random.uniform(0.35, 0.65)

    @staticmethod
    def demo_features() -> dict[str, float]:
        start = time.perf_counter()
        lighting = random.uniform(0.2, 0.85)
        visibility = random.uniform(0.25, 0.9)
        crowd = random.uniform(0.15, 0.8)
        motion = random.uniform(0.05, 0.75)
        obstruction = min(1.0, (1.0 - lighting) * 0.25 + (1.0 - visibility) * 0.35 + random.uniform(0.0, 0.2))
        return {
            "lighting_score": round(lighting, 3),
            "visibility_score": round(visibility, 3),
            "motion_score": round(motion, 3),
            "crowd_score": round(crowd, 3),
            "obstruction_score": round(obstruction, 3),
            "confidence": round(random.uniform(0.68, 0.94), 3),
            "latency_ms": round((time.perf_counter() - start) * 1000.0, 3),
        }


def perception_risk(features: dict[str, float], base_risk: float = 0.25) -> dict[str, Any]:
    result = score_risk(
        lighting_score=features.get("lighting_score", 0.5),
        crowd_score=features.get("crowd_score", 0.5),
        visibility_score=features.get("visibility_score", 0.5),
        motion_score=features.get("motion_score", 0.0),
        obstruction_score=features.get("obstruction_score", 0.0),
        base_risk=base_risk,
    )
    return {"risk_score": result.score, "risk_category": result.category, "risk_explanation": result.explanation}
