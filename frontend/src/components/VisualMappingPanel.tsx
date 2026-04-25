import { useState } from "react";
import { Box, X, Upload, Wand2 } from "lucide-react";
import type { KeyframeInstance, SceneSafety, SlamLiteResult } from "../types";

export function VisualMappingPanel({
  slam,
  isProcessing,
  status,
  uploadedFileName,
  onUpload,
  onDemo
}: {
  slam: SlamLiteResult | null;
  isProcessing: boolean;
  status: string;
  uploadedFileName: string;
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
          <input
            type="file"
            accept="video/*,.mov,.mp4"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
        <button onClick={onDemo} disabled={isProcessing} title="Run simulated SLAM-lite demo">
          <Wand2 size={16} />
          <span>Demo Map</span>
        </button>
      </div>
      {(isProcessing || status || uploadedFileName) && (
        <div className="processing">
          <strong>{isProcessing ? "Processing visual odometry..." : status || "Ready"}</strong>
          {uploadedFileName && <span>{uploadedFileName}</span>}
        </div>
      )}
      <MappingViz slam={slam} />
      <div className="featureGrid">
        <Metric label="Frames" value={slam?.framesProcessed ?? "-"} />
        <Metric label="Keyframes" value={slam?.keyframesUsed ?? "-"} />
        <Metric label="Keypoints" value={slam?.totalKeypoints ?? "-"} />
        <Metric label="Matches" value={slam?.totalMatches ?? "-"} />
        <Metric label="Inliers" value={slam?.inlierMatches ?? "-"} />
        <Metric label="Confidence" value={slam ? slam.reconstructionConfidence.toFixed(2) : "-"} />
        <Metric label="Map conf." value={slam ? slam.mapConfidence.toFixed(2) : "-"} />
        <Metric label="Latency" value={slam ? `${slam.processingLatencyMs.toFixed(0)} ms` : "-"} />
      </div>
      <p className="panelCopy">
        {slam?.explanation ?? "SafeNav estimates camera motion from multiple video frames using feature matching, essential matrix estimation, pose recovery, and sparse triangulation."}
      </p>
      <KeyframeInstances instances={slam?.keyframeInstances ?? []} />
      {slam && (
        <p className={slam.fallbackUsed ? "fallbackNote" : "successNote"}>
          {slam.fallbackUsed ? "Fallback demo data is active; the upload could not produce stable geometry." : "Uploaded video produced a sparse visual-odometry reconstruction."}
          {slam.fallbackReason && <span>{slam.fallbackReason}</span>}
        </p>
      )}
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
      {points.length === 0 && poses.length === 0 && <text x="160" y="92" textAnchor="middle">Upload video or run demo</text>}
      {points.length === 0 && poses.length > 0 && <text x="160" y="92" textAnchor="middle">Camera path estimated; sparse points were limited</text>}
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

function KeyframeInstances({ instances }: { instances: KeyframeInstance[] }) {
  const [selectedInstance, setSelectedInstance] = useState<KeyframeInstance | null>(null);

  if (instances.length === 0) {
    return null;
  }

  return (
    <>
      <div className="instanceStrip">
        <div className="instanceHeader">
          <span>Video Instances</span>
          <strong>{instances.length}</strong>
        </div>
        {instances.map((instance) => (
          <button
            className={`instanceCard ${selectedInstance?.index === instance.index ? "activeInstance" : ""}`}
            key={`${instance.title}-${instance.index}`}
            onClick={() => setSelectedInstance(instance)}
            type="button"
            aria-label={`Inspect ${instance.title}`}
          >
            <span className="inspectHint">Click to inspect</span>
            {instance.imageDataUrl ? (
              <img src={instance.imageDataUrl} alt={`${instance.title} with ORB keypoints`} />
            ) : (
              <span className="instancePlaceholder">Demo instance</span>
            )}
            <span className="instanceBody">
              <strong>{instance.title}</strong>
              <span className="instanceMetrics">
                <span>KP {instance.keypoints}</span>
                <span>Matches {instance.matchesToNext}</span>
                <span>Inliers {instance.inliersToNext}</span>
                <span className={`riskBadge ${instance.sceneSafety?.sceneRiskCategory ?? "medium"}`}>
                  Risk {instance.sceneSafety?.sceneRiskCategory ?? "medium"}
                </span>
              </span>
              <span className="instanceDecision">{instance.decision}</span>
            </span>
          </button>
        ))}
      </div>
      {selectedInstance && <KeyframeInspectionModal instance={selectedInstance} onClose={() => setSelectedInstance(null)} />}
    </>
  );
}

function KeyframeInspectionModal({ instance, onClose }: { instance: KeyframeInstance; onClose: () => void }) {
  const inspection = getInspectionModel(instance);
  const scene = instance.sceneSafety ?? defaultSceneSafety();

  return (
    <div className="keyframeModalBackdrop" role="presentation" onClick={onClose}>
      <div className="keyframeModal" role="dialog" aria-modal="true" aria-label={`${instance.title} inspection`} onClick={(event) => event.stopPropagation()}>
        <div className="keyframeModalHeader">
          <div>
            <p className="eyebrow">Keyframe Inspection</p>
            <h3>{instance.title}</h3>
          </div>
          <button className="iconButton" onClick={onClose} title="Close keyframe inspection" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="keyframeModalGrid">
          <div className="keyframePreviewPane">
            {instance.imageDataUrl ? (
              <img src={instance.imageDataUrl} alt={`${instance.title} with ORB keypoints`} />
            ) : (
              <div className="instancePlaceholder">Demo instance</div>
            )}
            <div className={`riskCallout ${scene.sceneRiskCategory}`}>
              <strong>Scene Risk: {scene.sceneRiskCategory} ({scene.sceneRiskScore.toFixed(2)})</strong>
              <span>{scene.safetySummary}</span>
            </div>
          </div>
          <div className="keyframeDetailPane">
            <section>
              <h4>What SafeNav Sees</h4>
              <div className="inspectionGrid">
                <Metric label="Feature quality" value={inspection.featureQuality} />
                <Metric label="Geometry quality" value={inspection.geometryQuality} />
                <Metric label="Inlier ratio" value={`${Math.round(inspection.matchSupport * 100)}%`} />
                <Metric label="Pose signal" value={instance.inliersToNext >= 25 ? "accepted" : "uncertain"} />
              </div>
            </section>
            <section>
              <h4>Scene Risk Signals</h4>
              <div className="inspectionGrid sceneGrid">
                <Metric label="Lighting" value={scene.lightingScore.toFixed(2)} />
                <Metric label="Visibility" value={scene.visibilityScore.toFixed(2)} />
                <Metric label="Obstruction" value={scene.obstructionScore.toFixed(2)} />
                <Metric label="Motion" value={scene.motionScore.toFixed(2)} />
                <Metric label="Pedestrian proxy" value={scene.crowdScore.toFixed(2)} />
                <Metric label="Risk score" value={scene.sceneRiskScore.toFixed(2)} />
              </div>
            </section>
            <section className="reasoningBlock">
              <h4>Why SafeNav Thinks This Risk Is {scene.sceneRiskCategory}</h4>
              <p>{scene.sceneRiskExplanation}</p>
              <p>{inspection.safetySignal}</p>
              <p>{inspection.geometryExplanation}</p>
              <p>Decision: {instance.decision}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function getInspectionModel(instance: KeyframeInstance) {
  const matchSupport = instance.matchesToNext > 0 ? instance.inliersToNext / instance.matchesToNext : 0;
  const featureQuality = instance.keypoints >= 900 ? "high" : instance.keypoints >= 450 ? "moderate" : "low";
  const geometryQuality = matchSupport >= 0.45 ? "strong" : matchSupport >= 0.2 ? "usable" : "weak";
  const safetySignal =
    geometryQuality === "strong"
      ? "Mapping confidence is strong here, so SafeNav can trust the local camera motion estimate and avoid adding uncertainty-based risk."
      : geometryQuality === "usable"
        ? "Mapping confidence is usable but not perfect, so SafeNav treats this area as observable while still watching for uncertainty."
        : "Mapping confidence is weak here, so SafeNav treats this segment as more uncertain and may increase visibility or obstruction risk.";
  const geometryExplanation = "ORB keypoints measure visible texture and corners. Matches connect this frame to the next sampled view. RANSAC inliers are the matches that agree with one camera-motion model, which is why they drive pose reliability.";

  return { matchSupport, featureQuality, geometryQuality, safetySignal, geometryExplanation };
}

function defaultSceneSafety(): SceneSafety {
  return {
    lightingScore: 0.5,
    visibilityScore: 0.5,
    motionScore: 0.0,
    crowdScore: 0.5,
    obstructionScore: 0.2,
    sceneRiskScore: 0.35,
    sceneRiskCategory: "medium",
    sceneRiskExplanation: "This keyframe does not include scene-risk fields, so SafeNav treats it as moderate uncertainty instead of overclaiming safety.",
    safetySummary: "Scene-risk proxy is unavailable for this keyframe; SafeNav keeps a conservative medium-risk interpretation."
  };
}
