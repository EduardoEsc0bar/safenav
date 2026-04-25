import { Navigation } from "lucide-react";
import type { Algorithm, CampusNode } from "../types";

interface Props {
  nodes: CampusNode[];
  startId: string;
  endId: string;
  algorithm: Algorithm;
  riskWeight: number;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onAlgorithmChange: (value: Algorithm) => void;
  onRiskWeightChange: (value: number) => void;
  onCompute: () => void;
}

export function RouteControls(props: Props) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Planner</p>
          <h2>Route Controls</h2>
        </div>
        <button className="iconButton primary" onClick={props.onCompute} title="Compute route">
          <Navigation size={18} />
        </button>
      </div>
      <label>
        Start
        <select value={props.startId} onChange={(event) => props.onStartChange(event.target.value)}>
          {props.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
        </select>
      </label>
      <label>
        Destination
        <select value={props.endId} onChange={(event) => props.onEndChange(event.target.value)}>
          {props.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
        </select>
      </label>
      <label>
        Algorithm
        <select value={props.algorithm} onChange={(event) => props.onAlgorithmChange(event.target.value as Algorithm)}>
          <option value="astar">A*</option>
          <option value="dijkstra">Dijkstra</option>
        </select>
      </label>
      <label>
        Risk weight: {props.riskWeight.toFixed(1)}
        <input
          type="range"
          min="0"
          max="15"
          step="0.5"
          value={props.riskWeight}
          onChange={(event) => props.onRiskWeightChange(Number(event.target.value))}
        />
      </label>
      <button className="wideButton" onClick={props.onCompute}>Compute Route</button>
    </section>
  );
}
