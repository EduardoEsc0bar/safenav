import type { SummaryMetrics } from "../types";

const rows: Array<[keyof SummaryMetrics, string]> = [
  ["lighting_score", "Lighting"],
  ["crowd_score", "Crowd"],
  ["visibility_score", "Visibility"],
  ["motion_score", "Motion"],
  ["obstruction_score", "Obstruction"],
  ["overall_risk", "Overall risk"]
];

export function RiskDashboard({ summary }: { summary: SummaryMetrics | null }) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Perception</p>
          <h2>Risk Dashboard</h2>
        </div>
      </div>
      <div className="barList">
        {rows.map(([key, label]) => {
          const value = summary?.[key] ?? 0;
          return (
            <div className="barRow" key={key}>
              <span>{label}</span>
              <div className="barTrack">
                <i style={{ width: `${Math.round(value * 100)}%` }} className={key === "overall_risk" || key === "obstruction_score" ? "riskBar" : ""} />
              </div>
              <strong>{value.toFixed(2)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
