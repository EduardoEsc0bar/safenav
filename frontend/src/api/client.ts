import type { Algorithm, PerceptionFeatures } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getGraph: () => request("/api/graph"),
  getMetrics: () => request("/api/metrics"),
  computeRoute: (payload: { start_id: string; end_id: string; algorithm: Algorithm; risk_weight: number }) =>
    request("/api/route", { method: "POST", body: JSON.stringify(payload) }),
  simulate: (event: string) => request("/api/simulate", { method: "POST", body: JSON.stringify({ event }) }),
  reset: () => request("/api/reset", { method: "POST" }),
  perceptionDemo: () => request("/api/perception/demo"),
  perceptionFrame: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request("/api/perception/frame", { method: "POST", body });
  },
  applyPerception: (node_id: string, features: PerceptionFeatures) =>
    request("/api/perception/apply", { method: "POST", body: JSON.stringify({ node_id, features }) }),
  slamUploadVideo: (
    file: File,
    selectedNodeId: string,
    route?: { start_id: string; end_id: string; algorithm: Algorithm; risk_weight: number }
  ) => {
    const body = new FormData();
    body.append("file", file);
    body.append("selected_node_id", selectedNodeId);
    if (route) {
      body.append("start_id", route.start_id);
      body.append("end_id", route.end_id);
      body.append("algorithm", route.algorithm);
      body.append("risk_weight", String(route.risk_weight));
    }
    return request("/api/slam/upload-video", { method: "POST", body });
  },
  slamDemo: (selectedNodeId: string) => request(`/api/slam/demo?selected_node_id=${encodeURIComponent(selectedNodeId)}`)
};
