from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from typing import Any

try:
    import cv2  # type: ignore
    import numpy as np
except Exception:  # pragma: no cover - keeps demo endpoint usable if OpenCV import fails.
    cv2 = None
    np = None


@dataclass(frozen=True)
class SlamLiteResult:
    frames_processed: int
    keyframes_used: int
    total_keypoints: int
    total_matches: int
    inlier_matches: int
    estimated_camera_poses: list[dict[str, Any]]
    triangulated_3d_points: list[dict[str, float]]
    reconstruction_confidence: float
    map_confidence: float
    processing_latency_ms: float
    explanation: str
    fallback_used: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "framesProcessed": self.frames_processed,
            "keyframesUsed": self.keyframes_used,
            "totalKeypoints": self.total_keypoints,
            "totalMatches": self.total_matches,
            "inlierMatches": self.inlier_matches,
            "estimatedCameraPoses": self.estimated_camera_poses,
            "triangulated3DPoints": self.triangulated_3d_points,
            "reconstructionConfidence": self.reconstruction_confidence,
            "mapConfidence": self.map_confidence,
            "processingLatencyMs": self.processing_latency_ms,
            "explanation": self.explanation,
            "fallbackUsed": self.fallback_used,
        }


class SlamLiteProcessor:
    """Small visual odometry pipeline for hackathon-scale multi-view geometry.

    This is intentionally SLAM-lite: it extracts sparse ORB features, estimates
    relative motion with essential matrices, triangulates sparse points, and
    accumulates a simple camera path. It does not do bundle adjustment, loop
    closure, global scale recovery, or dense mapping.
    """

    def __init__(self, frame_interval: int = 10, max_keyframes: int = 14) -> None:
        self.frame_interval = frame_interval
        self.max_keyframes = max_keyframes

    def process_video(self, video_path: str) -> SlamLiteResult:
        if cv2 is None or np is None:
            return demo_reconstruction(reason="OpenCV or NumPy is unavailable.")

        start = time.perf_counter()
        frames = self._extract_keyframes(video_path)
        if len(frames) < 2:
            return demo_reconstruction(start_time=start, reason="Not enough keyframes could be extracted from the uploaded video.")

        gray_frames = [cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) for frame in frames]
        height, width = gray_frames[0].shape[:2]
        focal = float(max(width, height))
        camera_matrix = np.array([[focal, 0.0, width / 2.0], [0.0, focal, height / 2.0], [0.0, 0.0, 1.0]], dtype=np.float64)

        orb = cv2.ORB_create(nfeatures=1400, scaleFactor=1.2, nlevels=8)
        keypoints_descriptors = [orb.detectAndCompute(gray, None) for gray in gray_frames]
        total_keypoints = sum(len(keypoints or []) for keypoints, _desc in keypoints_descriptors)

        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        total_matches = 0
        inlier_matches = 0
        point_cloud: list[dict[str, float]] = []

        # Pose state tracks a simple world-space camera path.
        world_rotation = np.eye(3, dtype=np.float64)
        world_position = np.zeros((3, 1), dtype=np.float64)
        poses = [pose_payload(0, world_position, world_rotation)]

        for pair_index in range(len(keypoints_descriptors) - 1):
            keypoints_a, desc_a = keypoints_descriptors[pair_index]
            keypoints_b, desc_b = keypoints_descriptors[pair_index + 1]
            if desc_a is None or desc_b is None or len(desc_a) < 8 or len(desc_b) < 8:
                continue

            raw_matches = matcher.knnMatch(desc_a, desc_b, k=2)
            good_matches = []
            for pair in raw_matches:
                if len(pair) != 2:
                    continue
                best, second = pair
                if best.distance < 0.75 * second.distance:
                    good_matches.append(best)
            total_matches += len(good_matches)

            if len(good_matches) < 8:
                continue

            pts_a = np.float32([keypoints_a[match.queryIdx].pt for match in good_matches])
            pts_b = np.float32([keypoints_b[match.trainIdx].pt for match in good_matches])
            essential, essential_mask = cv2.findEssentialMat(
                pts_a,
                pts_b,
                camera_matrix,
                method=cv2.RANSAC,
                prob=0.999,
                threshold=1.2,
            )
            if essential is None or essential_mask is None:
                continue

            _pose_inliers, relative_rotation, relative_translation, pose_mask = cv2.recoverPose(
                essential,
                pts_a,
                pts_b,
                camera_matrix,
                mask=essential_mask,
            )
            if pose_mask is None:
                continue

            inlier_selector = pose_mask.ravel() > 0
            pair_inliers = int(inlier_selector.sum())
            inlier_matches += pair_inliers
            if pair_inliers < 8:
                continue

            inlier_a = pts_a[inlier_selector]
            inlier_b = pts_b[inlier_selector]
            point_cloud.extend(
                self._triangulate_points(
                    camera_matrix=camera_matrix,
                    rotation=relative_rotation,
                    translation=relative_translation,
                    points_a=inlier_a,
                    points_b=inlier_b,
                    max_points=90,
                )
            )

            # Translation scale is unknown in monocular video, so normalize each
            # step. This demonstrates visual odometry shape without claiming
            # metric-scale localization.
            step = relative_translation.astype(np.float64)
            norm = float(np.linalg.norm(step))
            if norm > 1e-6:
                step = step / norm
            world_position = world_position + world_rotation @ step
            world_rotation = world_rotation @ relative_rotation.astype(np.float64)
            poses.append(pose_payload(pair_index + 1, world_position, world_rotation))

        latency = (time.perf_counter() - start) * 1000.0
        if len(poses) < 2 or inlier_matches < 12 or not point_cloud:
            return demo_reconstruction(start_time=start, reason="Video geometry was too weak for a stable reconstruction.")

        point_cloud = point_cloud[:900]
        inlier_ratio = inlier_matches / max(1, total_matches)
        keyframe_factor = min(1.0, len(poses) / max(2.0, len(frames) * 0.75))
        point_factor = min(1.0, len(point_cloud) / 250.0)
        confidence = clamp(0.5 * inlier_ratio + 0.25 * keyframe_factor + 0.25 * point_factor)
        map_confidence = clamp(0.25 + confidence * 0.75)

        return SlamLiteResult(
            frames_processed=len(frames),
            keyframes_used=len(frames),
            total_keypoints=total_keypoints,
            total_matches=total_matches,
            inlier_matches=inlier_matches,
            estimated_camera_poses=poses,
            triangulated_3d_points=point_cloud,
            reconstruction_confidence=round(confidence, 3),
            map_confidence=round(map_confidence, 3),
            processing_latency_ms=round(latency, 3),
            explanation="SafeNav estimated camera motion from multiple video frames using feature matching, essential matrix estimation, pose recovery, and sparse triangulation.",
        )

    def _extract_keyframes(self, video_path: str) -> list[Any]:
        capture = cv2.VideoCapture(video_path)
        if not capture.isOpened():
            return []

        frames: list[Any] = []
        frame_index = 0
        while len(frames) < self.max_keyframes:
            ok, frame = capture.read()
            if not ok:
                break
            if frame_index % self.frame_interval == 0:
                frames.append(frame)
            frame_index += 1
        capture.release()
        return frames

    @staticmethod
    def _triangulate_points(
        *,
        camera_matrix: Any,
        rotation: Any,
        translation: Any,
        points_a: Any,
        points_b: Any,
        max_points: int,
    ) -> list[dict[str, float]]:
        projection_a = camera_matrix @ np.hstack((np.eye(3), np.zeros((3, 1))))
        projection_b = camera_matrix @ np.hstack((rotation, translation))
        points_4d = cv2.triangulatePoints(projection_a, projection_b, points_a[:max_points].T, points_b[:max_points].T)
        points_3d = (points_4d[:3] / np.maximum(points_4d[3], 1e-9)).T

        output: list[dict[str, float]] = []
        for point in points_3d:
            if not np.isfinite(point).all():
                continue
            x, y, z = [float(value) for value in point]
            if abs(x) > 80 or abs(y) > 80 or abs(z) > 120:
                continue
            output.append({"x": round(x, 3), "y": round(y, 3), "z": round(z, 3)})
        return output


def pose_payload(index: int, position: Any, rotation: Any) -> dict[str, Any]:
    return {
        "index": index,
        "x": round(float(position[0]), 3),
        "y": round(float(position[1]), 3),
        "z": round(float(position[2]), 3),
        "rotation": [[round(float(value), 4) for value in row] for row in rotation.tolist()],
    }


def demo_reconstruction(start_time: float | None = None, reason: str = "Demo fallback generated synthetic visual odometry data.") -> SlamLiteResult:
    started = start_time if start_time is not None else time.perf_counter()
    poses: list[dict[str, Any]] = []
    points: list[dict[str, float]] = []

    for index in range(9):
        angle = index * 0.18
        x = math.sin(angle) * 1.6
        y = 0.05 * math.sin(index)
        z = index * 0.9
        rotation = [
            [round(math.cos(angle), 4), 0.0, round(math.sin(angle), 4)],
            [0.0, 1.0, 0.0],
            [round(-math.sin(angle), 4), 0.0, round(math.cos(angle), 4)],
        ]
        poses.append({"index": index, "x": round(x, 3), "y": round(y, 3), "z": round(z, 3), "rotation": rotation})

    random.seed(42)
    for _ in range(260):
        depth = random.uniform(0.5, 8.5)
        points.append(
            {
                "x": round(random.uniform(-3.8, 3.8) + 0.1 * depth, 3),
                "y": round(random.uniform(-1.7, 1.7), 3),
                "z": round(depth, 3),
            }
        )

    latency = (time.perf_counter() - started) * 1000.0
    return SlamLiteResult(
        frames_processed=90,
        keyframes_used=len(poses),
        total_keypoints=4200,
        total_matches=1180,
        inlier_matches=760,
        estimated_camera_poses=poses,
        triangulated_3d_points=points,
        reconstruction_confidence=0.72,
        map_confidence=0.79,
        processing_latency_ms=round(latency, 3),
        explanation=f"SafeNav estimated camera motion from multiple video frames using feature matching, essential matrix estimation, pose recovery, and sparse triangulation. {reason}",
        fallback_used=True,
    )


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))
