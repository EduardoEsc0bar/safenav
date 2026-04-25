import type { CampusNode, PerceptionFeatures, RouteResult } from "../types";

export function RouteExplanation({
  route,
  selectedNode,
  perception,
  eventExplanation,
  liveMode,
  routeChanged
}: {
  route: RouteResult | null;
  selectedNode: CampusNode | null;
  perception: PerceptionFeatures | null;
  eventExplanation: string;
  liveMode: boolean;
  routeChanged: boolean;
}) {
  return (
    <section className="explanationBand">
      <div>
        <p className="eyebrow">Decision trace</p>
        <h2>{route ? route.explanation : "Compute a route to inspect planner behavior."}</h2>
        <p>{eventExplanation || selectedNode?.risk_explanation || "SafeNav combines perception signals with graph search to favor safer campus paths in real time."}</p>
      </div>
      <div className="statusStrip">
        <span>Live Mode: <strong>{liveMode ? "ON" : "OFF"}</strong></span>
        <span>Route: <strong>{routeChanged ? "changed" : "unchanged"}</strong></span>
        <span>Selected Node: <strong>{selectedNode?.name ?? "-"}</strong></span>
        <span>Latest Confidence: <strong>{perception?.confidence?.toFixed(2) ?? "-"}</strong></span>
      </div>
    </section>
  );
}
