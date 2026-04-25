import { Camera, Play, Square, Upload } from "lucide-react";
import type { CampusNode, PerceptionFeatures } from "../types";

export function PerceptionPanel({
  nodes,
  selectedNodeId,
  features,
  liveMode,
  onSelectedNodeChange,
  onDemo,
  onApply,
  onUpload,
  onToggleLive
}: {
  nodes: CampusNode[];
  selectedNodeId: string;
  features: PerceptionFeatures | null;
  liveMode: boolean;
  onSelectedNodeChange: (nodeId: string) => void;
  onDemo: () => void;
  onApply: () => void;
  onUpload: (file: File) => void;
  onToggleLive: () => void;
}) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Sensor input</p>
          <h2>Perception</h2>
        </div>
        <button className={`iconButton ${liveMode ? "danger" : ""}`} onClick={onToggleLive} title="Toggle live polling">
          {liveMode ? <Square size={17} /> : <Play size={17} />}
        </button>
      </div>
      <label>
        Apply to node
        <select value={selectedNodeId} onChange={(event) => onSelectedNodeChange(event.target.value)}>
          {nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
        </select>
      </label>
      <div className="buttonGrid compact">
        <button onClick={onDemo} title="Generate simulated perception frame"><Camera size={16} /><span>Demo Frame</span></button>
        <label className="uploadButton" title="Upload image frame">
          <Upload size={16} />
          <span>Upload</span>
          <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
        </label>
        <button onClick={onApply} disabled={!features} title="Apply latest perception features"><span>Apply Risk</span></button>
      </div>
      <div className="featureGrid">
        {(["lighting_score", "visibility_score", "crowd_score", "motion_score", "obstruction_score"] as const).map((key) => (
          <div className="metric" key={key}>
            <span>{key.replace("_score", "").replace("_", " ")}</span>
            <strong>{features ? features[key].toFixed(2) : "-"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
