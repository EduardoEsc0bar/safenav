import { useState } from "react";
import { Activity, EyeOff, Film, MapPin, Maximize2, Moon, RotateCcw, Upload, Users, X, XOctagon } from "lucide-react";
import type { CampusNode } from "../types";

const events = [
  { id: "night_mode", label: "Night Mode", icon: Moon },
  { id: "low_visibility", label: "Low Visibility", icon: EyeOff },
  { id: "crowd_dispersal", label: "Crowd Dispersal", icon: Users },
  { id: "path_blocked", label: "Path Blocked", icon: XOctagon },
  { id: "high_activity_zone", label: "High Activity", icon: Activity }
];

type SimulationUpload = {
  id: string;
  fileName: string;
  fileSizeMb: string;
  description: string;
  nodeName: string;
  framesProcessed: number;
  mapConfidence: number;
  safetyScore: number;
};

export function SimulationPanel({
  nodes,
  pendingFile,
  description,
  selectedNodeId,
  uploads,
  processing,
  onPendingFileChange,
  onDescriptionChange,
  onSelectedNodeChange,
  onSubmitVideo,
  onSimulate,
  onReset
}: {
  nodes: CampusNode[];
  pendingFile: File | null;
  description: string;
  selectedNodeId: string;
  uploads: SimulationUpload[];
  processing: boolean;
  onPendingFileChange: (file: File | null) => void;
  onDescriptionChange: (description: string) => void;
  onSelectedNodeChange: (nodeId: string) => void;
  onSubmitVideo: () => void;
  onSimulate: (event: string) => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const canSubmit = Boolean(pendingFile && description.trim() && !processing);

  const updateDescription = (value: string) => {
    onDescriptionChange(value);
    const normalizedValue = normalize(value);
    const matchedNode = nodes.find((node) => {
      const name = normalize(node.name);
      const id = normalize(node.id);
      return normalizedValue.includes(name) || normalizedValue.includes(id);
    });
    if (matchedNode) onSelectedNodeChange(matchedNode.id);
  };

  const stageFile = (file: File | null) => {
    onPendingFileChange(file);
    if (file) onDescriptionChange("");
  };

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Environment</p>
          <h2>Simulation Mode</h2>
        </div>
      </div>

      <div className="simulationLaunch">
        <button className="wideButton" type="button" onClick={() => setIsOpen(true)}>
          <Maximize2 size={16} />
          <span>Open Simulation Window</span>
        </button>
        <div className="simulationPending compact">
          <Film size={16} />
          <div>
            <strong>{uploads.length ? `${uploads.length} video${uploads.length === 1 ? "" : "s"} in simulation` : "No videos in simulation"}</strong>
            <span>{pendingFile ? `${pendingFile.name} is staged` : selectedNode ? `Next camera location: ${selectedNode.name}` : "Ready"}</span>
          </div>
        </div>
      </div>

      <div className="buttonGrid">
        {events.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onSimulate(id)} title={label}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={onReset} title="Reset simulation">
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
      </div>

      {isOpen && (
        <div className="simulationModalBackdrop" role="presentation">
          <div className="simulationModal" role="dialog" aria-modal="true" aria-label="Simulation mode video upload">
            <header className="simulationModalHeader">
              <div>
                <p className="eyebrow">Camera Simulation</p>
                <h2>Video Location Setup</h2>
              </div>
              <button className="iconButton" type="button" onClick={() => setIsOpen(false)} title="Close simulation window">
                <X size={18} />
              </button>
            </header>

            <div className="simulationModalGrid">
              <div className="simulationModalMain">
                <label className={`simulationDropZone ${pendingFile ? "uploaded" : ""}`} title="Upload one simulation video">
                  <Upload size={32} />
                  <strong>{pendingFile ? pendingFile.name : "Upload Video"}</strong>
                  <span>{pendingFile ? `${(pendingFile.size / (1024 * 1024)).toFixed(1)} MB uploaded to simulation` : "MP4, MOV, or MKV"}</span>
                  <input
                    type="file"
                    accept="video/*,.mov,.mp4,.mkv"
                    disabled={processing}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.currentTarget.value = "";
                      stageFile(file);
                    }}
                  />
                </label>

                {pendingFile && (
                  <div className="simulationDescriptionStep">
                    <div className="simulationPending success">
                      <Film size={16} />
                      <div>
                        <strong>Video uploaded</strong>
                        <span>{pendingFile.name}</span>
                      </div>
                    </div>

                    <label>
                      Where was this filmed?
                      <textarea
                        value={description}
                        disabled={processing}
                        rows={5}
                        placeholder="Example: Camera facing the Quintyne Parking Lot entrance near East Campus Path"
                        onChange={(event) => updateDescription(event.target.value)}
                      />
                    </label>

                    <label>
                      Mapped campus location
                      <select value={selectedNodeId} onChange={(event) => onSelectedNodeChange(event.target.value)} disabled={processing}>
                        {nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
                      </select>
                    </label>

                    <button className="wideButton" type="button" disabled={!canSubmit} onClick={onSubmitVideo}>
                      <MapPin size={16} />
                      <span>{processing ? "Updating Route" : "Update Route To Dorms"}</span>
                    </button>
                  </div>
                )}
              </div>

              <aside className="simulationModalSide">
                <h2>Simulation Videos</h2>
                <div className="simulationHistory large" aria-label="Processed simulation videos">
                  {uploads.length > 0 ? uploads.map((upload) => (
                    <article key={upload.id}>
                      <div>
                        <strong>{upload.fileName}</strong>
                        <span>{upload.nodeName} | {upload.fileSizeMb} MB | {upload.framesProcessed} frames | {Math.round(upload.mapConfidence * 100)}% map</span>
                        <small>{upload.description}</small>
                      </div>
                      <em>{upload.safetyScore.toFixed(1)}/10</em>
                    </article>
                  )) : (
                    <div className="simulationEmptyState">No processed videos yet.</div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
