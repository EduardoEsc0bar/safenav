export type NodeStatus = "open" | "blocked" | "warning";
export type EdgeStatus = "open" | "blocked";
export type RiskCategory = "low" | "medium" | "high" | "critical" | "blocked";
export type Algorithm = "dijkstra" | "astar";

export interface CampusNode {
  id: string;
  name: string;
  x: number;
  y: number;
  base_risk: number;
  dynamic_risk: number;
  lighting_score: number;
  crowd_score: number;
  visibility_score: number;
  motion_score: number;
  obstruction_score: number;
  status: NodeStatus;
  risk_category: RiskCategory;
  risk_explanation: string;
}

export interface CampusEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  base_risk: number;
  dynamic_risk: number;
  status: EdgeStatus;
  risk_category: RiskCategory;
}

export interface CampusGraph {
  nodes: CampusNode[];
  edges: CampusEdge[];
}

export interface SummaryMetrics {
  lighting_score: number;
  crowd_score: number;
  visibility_score: number;
  motion_score: number;
  obstruction_score: number;
  overall_risk: number;
}

export interface RouteResult {
  routeNodeIds: string[];
  routeNames: string[];
  totalDistance: number;
  totalRisk: number;
  totalCost: number;
  algorithm: Algorithm;
  computeTimeMs: number;
  visitedNodes: number;
  explanation: string;
}

export interface RuntimeMetrics {
  last_route_compute_time_ms: number;
  dijkstra_compute_time_ms: number;
  astar_compute_time_ms: number;
  reroutes: number;
  current_route_cost: number;
  current_risk_weight: number;
  frame_processing_latency_ms: number;
  perception_update_latency_ms: number;
  slam_processing_latency_ms: number;
  map_confidence: number;
  live_mode: boolean;
  route_changed: boolean;
}

export interface PerceptionFeatures {
  lighting_score: number;
  visibility_score: number;
  motion_score: number;
  crowd_score: number;
  obstruction_score: number;
  confidence?: number;
  latency_ms?: number;
}

export interface CameraPose {
  index: number;
  x: number;
  y: number;
  z: number;
  rotation: number[][];
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface SlamLiteResult {
  framesProcessed: number;
  keyframesUsed: number;
  totalKeypoints: number;
  totalMatches: number;
  inlierMatches: number;
  estimatedCameraPoses: CameraPose[];
  triangulated3DPoints: Point3D[];
  reconstructionConfidence: number;
  mapConfidence: number;
  processingLatencyMs: number;
  explanation: string;
  fallbackUsed: boolean;
  reconstructionMode: string;
  fallbackReason: string;
  keyframeInstances: KeyframeInstance[];
}

export interface KeyframeInstance {
  index: number;
  title: string;
  imageDataUrl: string;
  keypoints: number;
  matchesToNext: number;
  inliersToNext: number;
  decision: string;
  sceneSafety?: SceneSafety;
}

export interface SceneSafety {
  lightingScore: number;
  visibilityScore: number;
  motionScore: number;
  crowdScore: number;
  obstructionScore: number;
  sceneRiskScore: number;
  sceneRiskCategory: string;
  sceneRiskExplanation: string;
  safetySummary: string;
}
