import type { RouteResult, RuntimeMetrics } from "../types";

export function MetricsPanel({ route, metrics }: { route: RouteResult | null; metrics: RuntimeMetrics | null }) {
  const items = [
    ["Algorithm", route?.algorithm?.toUpperCase() ?? "-"],
    ["Compute time", `${route?.computeTimeMs ?? metrics?.last_route_compute_time_ms ?? 0} ms`],
    ["Visited nodes", route?.visitedNodes ?? "-"],
    ["Distance", route ? route.totalDistance.toFixed(1) : "-"],
    ["Total risk", route ? route.totalRisk.toFixed(3) : "-"],
    ["Route cost", route ? route.totalCost.toFixed(2) : metrics?.current_route_cost.toFixed(2) ?? "-"],
    ["Reroutes", metrics?.reroutes ?? 0],
    ["Perception latency", `${metrics?.perception_update_latency_ms ?? 0} ms`],
    ["SLAM latency", `${metrics?.slam_processing_latency_ms ?? 0} ms`],
    ["Map confidence", metrics?.map_confidence != null ? metrics.map_confidence.toFixed(2) : "-"]
  ];

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Metrics</h2>
        </div>
      </div>
      <div className="metricGrid">
        {items.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
