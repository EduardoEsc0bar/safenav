import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import { CampusMap } from "./components/CampusMap";
import { MetricsPanel } from "./components/MetricsPanel";
import { PerceptionPanel } from "./components/PerceptionPanel";
import { RiskDashboard } from "./components/RiskDashboard";
import { RouteControls } from "./components/RouteControls";
import { RouteExplanation } from "./components/RouteExplanation";
import { SimulationPanel } from "./components/SimulationPanel";
import { VisualMappingPanel } from "./components/VisualMappingPanel";
import type { Algorithm, CampusGraph, PerceptionFeatures, RouteResult, RuntimeMetrics, SlamLiteResult, SummaryMetrics } from "./types";

const initialGraph: CampusGraph = { nodes: [], edges: [] };

export default function App() {
  const [graph, setGraph] = useState<CampusGraph>(initialGraph);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [startId, setStartId] = useState("student_center");
  const [endId, setEndId] = useState("dorms");
  const [algorithm, setAlgorithm] = useState<Algorithm>("astar");
  const [riskWeight, setRiskWeight] = useState(5);
  const [selectedNodeId, setSelectedNodeId] = useState("parking_lot");
  const [eventExplanation, setEventExplanation] = useState("");
  const [perceptionFeatures, setPerceptionFeatures] = useState<PerceptionFeatures | null>(null);
  const [slamResult, setSlamResult] = useState<SlamLiteResult | null>(null);
  const [slamProcessing, setSlamProcessing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [error, setError] = useState("");

  const selectedNode = useMemo(() => graph.nodes.find((node) => node.id === selectedNodeId) ?? null, [graph.nodes, selectedNodeId]);

  const loadGraph = useCallback(async () => {
    const response = await api.getGraph() as { graph: CampusGraph; summary: SummaryMetrics };
    setGraph(response.graph);
    setSummary(response.summary);
  }, []);

  const computeRoute = useCallback(async () => {
    const response = await api.computeRoute({ start_id: startId, end_id: endId, algorithm, risk_weight: riskWeight }) as {
      route: RouteResult;
      metrics: RuntimeMetrics;
      summary: SummaryMetrics;
    };
    setRoute(response.route);
    setMetrics(response.metrics);
    setSummary(response.summary);
  }, [algorithm, endId, riskWeight, startId]);

  useEffect(() => {
    loadGraph()
      .then(() => computeRoute())
      .catch((err) => setError(String(err)));
  }, [computeRoute, loadGraph]);

  useEffect(() => {
    if (!liveMode) return;
    const timer = window.setInterval(async () => {
      try {
        const demo = await api.perceptionDemo() as { features: PerceptionFeatures };
        setPerceptionFeatures(demo.features);
        const applied = await api.applyPerception(selectedNodeId, demo.features) as {
          graph: CampusGraph;
          summary: SummaryMetrics;
          route: RouteResult;
          metrics: RuntimeMetrics;
          explanation: string;
        };
        setGraph(applied.graph);
        setSummary(applied.summary);
        setRoute(applied.route);
        setMetrics(applied.metrics);
        setEventExplanation(applied.explanation);
      } catch (err) {
        setError(String(err));
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [liveMode, selectedNodeId]);

  const simulate = async (event: string) => {
    try {
      const response = await api.simulate(event) as {
        graph: CampusGraph;
        summary: SummaryMetrics;
        route: RouteResult;
        metrics: RuntimeMetrics;
        explanation: string;
      };
      setGraph(response.graph);
      setSummary(response.summary);
      setRoute(response.route);
      setMetrics(response.metrics);
      setEventExplanation(response.explanation);
      setError("");
    } catch (err) {
      setError(String(err));
    }
  };

  const reset = async () => {
    const response = await api.reset() as {
      graph: CampusGraph;
      summary: SummaryMetrics;
      route: RouteResult;
      metrics: RuntimeMetrics;
      explanation: string;
    };
    setGraph(response.graph);
    setSummary(response.summary);
    setRoute(response.route);
    setMetrics(response.metrics);
    setEventExplanation(response.explanation);
    setError("");
  };

  const runPerceptionDemo = async () => {
    const response = await api.perceptionDemo() as { features: PerceptionFeatures; risk_explanation: string };
    setPerceptionFeatures(response.features);
    setEventExplanation(response.risk_explanation);
  };

  const uploadFrame = async (file: File) => {
    const response = await api.perceptionFrame(file) as { features: PerceptionFeatures; risk_explanation: string };
    setPerceptionFeatures(response.features);
    setEventExplanation(response.risk_explanation);
  };

  const applyPerception = async () => {
    if (!perceptionFeatures) return;
    const response = await api.applyPerception(selectedNodeId, perceptionFeatures) as {
      graph: CampusGraph;
      summary: SummaryMetrics;
      route: RouteResult;
      metrics: RuntimeMetrics;
      explanation: string;
    };
    setGraph(response.graph);
    setSummary(response.summary);
    setRoute(response.route);
    setMetrics(response.metrics);
    setEventExplanation(response.explanation);
  };

  const runSlamDemo = async () => {
    setSlamProcessing(true);
    try {
      const response = await api.slamDemo(selectedNodeId) as {
        slam: SlamLiteResult;
        graph: CampusGraph;
        summary: SummaryMetrics;
        route: RouteResult;
        metrics: RuntimeMetrics;
      };
      setSlamResult(response.slam);
      setGraph(response.graph);
      setSummary(response.summary);
      setRoute(response.route);
      setMetrics(response.metrics);
      setEventExplanation(response.slam.explanation);
      setError("");
    } catch (err) {
      setError(String(err));
    } finally {
      setSlamProcessing(false);
    }
  };

  const uploadSlamVideo = async (file: File) => {
    setSlamProcessing(true);
    try {
      const response = await api.slamUploadVideo(file, selectedNodeId) as {
        slam: SlamLiteResult;
        graph: CampusGraph;
        summary: SummaryMetrics;
        route: RouteResult;
        metrics: RuntimeMetrics;
      };
      setSlamResult(response.slam);
      setGraph(response.graph);
      setSummary(response.summary);
      setRoute(response.route);
      setMetrics(response.metrics);
      setEventExplanation(response.slam.explanation);
      setError("");
    } catch (err) {
      setError(String(err));
    } finally {
      setSlamProcessing(false);
    }
  };

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Perception-aware autonomy demo</p>
          <h1>SafeNav</h1>
        </div>
        <div className="headerStats">
          <span>Nodes <strong>{graph.nodes.length}</strong></span>
          <span>Edges <strong>{graph.edges.length}</strong></span>
          <span>Risk <strong>{summary?.overall_risk.toFixed(2) ?? "-"}</strong></span>
          <span>Map <strong>{metrics?.map_confidence != null ? metrics.map_confidence.toFixed(2) : "-"}</strong></span>
        </div>
      </header>

      {error && <div className="errorBanner">{error}</div>}

      <div className="appGrid">
        <div className="mainColumn">
          <CampusMap
            graph={graph}
            route={route}
            startId={startId}
            endId={endId}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
          <RouteExplanation
            route={route}
            selectedNode={selectedNode}
            perception={perceptionFeatures}
            eventExplanation={eventExplanation}
            liveMode={liveMode}
            routeChanged={Boolean(metrics?.route_changed)}
          />
        </div>
        <aside className="sideColumn">
          <RouteControls
            nodes={graph.nodes}
            startId={startId}
            endId={endId}
            algorithm={algorithm}
            riskWeight={riskWeight}
            onStartChange={setStartId}
            onEndChange={setEndId}
            onAlgorithmChange={setAlgorithm}
            onRiskWeightChange={setRiskWeight}
            onCompute={computeRoute}
          />
          <SimulationPanel onSimulate={simulate} onReset={reset} />
          <PerceptionPanel
            nodes={graph.nodes}
            selectedNodeId={selectedNodeId}
            features={perceptionFeatures}
            liveMode={liveMode}
            onSelectedNodeChange={setSelectedNodeId}
            onDemo={runPerceptionDemo}
            onApply={applyPerception}
            onUpload={uploadFrame}
            onToggleLive={() => setLiveMode((value) => !value)}
          />
          <VisualMappingPanel
            slam={slamResult}
            isProcessing={slamProcessing}
            onUpload={uploadSlamVideo}
            onDemo={runSlamDemo}
          />
          <RiskDashboard summary={summary} />
          <MetricsPanel route={route} metrics={metrics} />
        </aside>
      </div>
    </main>
  );
}
