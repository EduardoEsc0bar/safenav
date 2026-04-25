import { Activity, EyeOff, Moon, RotateCcw, Users, XOctagon } from "lucide-react";

const events = [
  { id: "night_mode", label: "Night Mode", icon: Moon },
  { id: "low_visibility", label: "Low Visibility", icon: EyeOff },
  { id: "crowd_dispersal", label: "Crowd Dispersal", icon: Users },
  { id: "path_blocked", label: "Path Blocked", icon: XOctagon },
  { id: "high_activity_zone", label: "High Activity", icon: Activity }
];

export function SimulationPanel({ onSimulate, onReset }: { onSimulate: (event: string) => void; onReset: () => void }) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Environment</p>
          <h2>Simulation</h2>
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
    </section>
  );
}
