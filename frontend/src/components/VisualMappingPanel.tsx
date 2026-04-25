import { Box, Upload, Wand2 } from "lucide-react";
import type { SlamLiteResult } from "../types";

export function VisualMappingPanel({
  slam,
  isProcessing,
  onUpload,
  onDemo
}: {
  slam: SlamLiteResult | null;
  isProcessing: boolean;
  onUpload: (file: File) => void;
  onDemo: () => void;
}) {
  return (
    <section className="panel mappingPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">SLAM-lite</p>
          <h2>Visual Mapping Mode</h2>
        </div>
        <Box size={18} />
      </div>
      <p className="panelCopy">
        SLAM-lite visual odometry and sparse mapping.
      </p>
      <div className="buttonGrid compact">
        <label className="uploadButton" title="Upload iPhone video">
          <Upload size={16} />
          <span>Upload Video</span>
          <input type="file" accept="video/*,.mov,.mp4" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
        </label>
        <button onClick={onDemo} disabled={isProcessing} title="Run simulated SLAM-lite demo">
          <Wand2 size={16} />
          <span>Demo Map</span>
        </button>
      </div>
      {isProcessing && <div className="processing">Processing visual odometry...</div>}
      <MappingViz slam={slam} />
      <div className="featureGrid">
        <Metric label="Frames" value={slam?.framesProcessed ?? "-"} />
        <Metric label="Keyframes" value={slam?.keyframesUsed ?? "-"} />
        <Metric label="Keypoints" value={slam?.totalKeypoints ?? "-"} />
        <Metric label="Matches" value={slam?.totalMatches ?? "-"} />
        <Metric label="Inliers" value={slam?.inlierMatches ?? "-"} />
        <Metric label="Confidence" value={slam ? slam.reconstructionConfidence.toFixed(2) : "-"} />
      </div>
      <p className="panelCopy">
        {slam?.explanation ?? "SafeNav estimates camera motion from multiple video frames using feature matching, essential matrix estimation, pose recovery, and sparse triangulation."}
      </p>
      {slam?.fallbackUsed && <p className="fallbackNote">Fallback demo data is active.</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MappingViz({ slam }: { slam: SlamLiteResult | null }) {
  const points = slam?.triangulated3DPoints.slice(0, 180) ?? [];
  const poses = slam?.estimatedCameraPoses ?? [];
  const allX = [...points.map((point) => point.x), ...poses.map((pose) => pose.x)];
  const allZ = [...points.map((point) => point.z), ...poses.map((pose) => pose.z)];
  const minX = Math.min(...allX, -1);
  const maxX = Math.max(...allX, 1);
  const minZ = Math.min(...allZ, -1);
  const maxZ = Math.max(...allZ, 1);

  const project = (x: number, z: number) => ({
    x: 14 + ((x - minX) / Math.max(0.001, maxX - minX)) * 292,
    y: 166 - ((z - minZ) / Math.max(0.001, maxZ - minZ)) * 146
  });

  const path = poses
    .map((pose, index) => {
      const projected = project(pose.x, pose.z);
      return `${index === 0 ? "M" : "L"} ${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="mappingViz" viewBox="0 0 320 180" role="img" aria-label="Sparse 3D reconstruction projected top down">
      <rect x="0" y="0" width="320" height="180" rx="8" />
      {points.length === 0 && <text x="160" y="92" textAnchor="middle">Upload video or run demo</text>}
      {points.map((point, index) => {
        const projected = project(point.x, point.z);
        return <circle key={`${point.x}-${point.y}-${point.z}-${index}`} cx={projected.x} cy={projected.y} r="1.45" className="mapPoint" />;
      })}
      {path && <path d={path} className="cameraPath" />}
      {poses.map((pose) => {
        const projected = project(pose.x, pose.z);
        return <circle key={pose.index} cx={projected.x} cy={projected.y} r="3.2" className="cameraPose" />;
      })}
    </svg>
  );
}
