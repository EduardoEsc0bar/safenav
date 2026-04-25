import type { CampusGraph, CampusNode, RouteResult } from "../types";

interface Props {
  graph: CampusGraph;
  route: RouteResult | null;
  startId: string;
  endId: string;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string;
}

const riskClass = (category?: string, status?: string) => {
  if (status === "blocked" || category === "blocked") return "risk-blocked";
  if (category === "critical" || category === "high") return "risk-high";
  if (category === "medium") return "risk-medium";
  return "risk-low";
};

export function CampusMap({ graph, route, startId, endId, onSelectNode, selectedNodeId }: Props) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const routeEdges = new Set<string>();
  if (route?.routeNodeIds.length) {
    for (let index = 0; index < route.routeNodeIds.length - 1; index += 1) {
      const a = route.routeNodeIds[index];
      const b = route.routeNodeIds[index + 1];
      const edge = graph.edges.find((candidate) => (candidate.from === a && candidate.to === b) || (candidate.from === b && candidate.to === a));
      if (edge) routeEdges.add(edge.id);
    }
  }

  return (
    <section className="mapPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">World model</p>
          <h2>Campus Graph</h2>
        </div>
        <div className="legend">
          <span><i className="dot low" />Low</span>
          <span><i className="dot med" />Medium</span>
          <span><i className="dot high" />High</span>
          <span><i className="dot blocked" />Blocked</span>
        </div>
      </div>
      <svg className="campusMap" viewBox="0 0 104 100" role="img" aria-label="Campus graph visualization">
        <defs>
          <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {graph.edges.map((edge) => {
          const from = nodesById.get(edge.from)!;
          const to = nodesById.get(edge.to)!;
          const onRoute = routeEdges.has(edge.id);
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`edge ${riskClass(edge.risk_category, edge.status)} ${onRoute ? "routeEdge" : ""}`}
              strokeWidth={onRoute ? 2.9 : 1.2}
              filter={onRoute ? "url(#routeGlow)" : undefined}
            />
          );
        })}
        {graph.nodes.map((node) => (
          <NodeMarker
            key={node.id}
            node={node}
            isStart={node.id === startId}
            isEnd={node.id === endId}
            isRoute={Boolean(route?.routeNodeIds.includes(node.id))}
            isSelected={node.id === selectedNodeId}
            onSelectNode={onSelectNode}
          />
        ))}
      </svg>
    </section>
  );
}

function NodeMarker({ node, isStart, isEnd, isRoute, isSelected, onSelectNode }: {
  node: CampusNode;
  isStart: boolean;
  isEnd: boolean;
  isRoute: boolean;
  isSelected: boolean;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <g className="nodeGroup" onClick={() => onSelectNode(node.id)} tabIndex={0}>
      <circle
        cx={node.x}
        cy={node.y}
        r={isStart || isEnd ? 3.7 : 3}
        className={`node ${riskClass(node.risk_category, node.status)} ${isRoute ? "routeNode" : ""} ${isSelected ? "selectedNode" : ""}`}
      />
      <text x={node.x + 4.2} y={node.y - 2.7} className="nodeLabel">
        {node.name}
      </text>
      {(isStart || isEnd) && (
        <text x={node.x} y={node.y + 1.1} textAnchor="middle" className="pinLabel">
          {isStart ? "S" : "D"}
        </text>
      )}
    </g>
  );
}
