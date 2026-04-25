import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Building2, Camera, PlayCircle, Shield, Workflow } from "lucide-react";
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
  const [slamStatus, setSlamStatus] = useState("");
  const [slamFileName, setSlamFileName] = useState("");
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
    setSlamFileName("");
    setSlamStatus("Running SLAM-lite demo data");
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
      setSlamStatus(response.slam.fallbackUsed ? "Demo reconstruction loaded" : "Reconstruction complete");
      setError("");
    } catch (err) {
      setError(String(err));
      setSlamStatus("SLAM-lite demo failed");
    } finally {
      setSlamProcessing(false);
    }
  };

  const uploadSlamVideo = async (file: File) => {
    setSlamProcessing(true);
    setSlamFileName(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    setSlamStatus("Uploading video to SLAM-lite backend");
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
      setSlamStatus(response.slam.fallbackUsed ? "Upload processed with fallback demo data" : "Uploaded video reconstruction complete");
      setError("");
    } catch (err) {
      setError(String(err));
      setSlamStatus("Video upload or SLAM-lite processing failed");
    } finally {
      setSlamProcessing(false);
    }
  };

  return (
    <main>
      <header className="landingNav">
        <div className="navBrand">
          <div className="brandLine">
            <Shield size={27} />
            <span>SafeNav</span>
          </div>
        </div>
        <nav className="topnav" aria-label="SafeNav sections">
          <span>How It Works</span>
          <span>Campus Safety</span>
          <span>Visual Mapping</span>
          <span>About</span>
          <span>Contact</span>
        </nav>
        <div className="navActions">
          <button type="button" onClick={computeRoute}>Find Route</button>
          <button className="primary" type="button" onClick={runSlamDemo}>Get Started</button>
        </div>
      </header>

      {error && <div className="errorBanner">{error}</div>}

      <section className="heroShell">
        <div className="heroCopy">
          <h1>Your safest path home.</h1>
          <p>
            SafeNav fuses camera-based visual mapping, perception signals, and risk-aware path planning to guide students through safer campus routes after dark.
          </p>
          <div className="heroActions">
            <button className="primary" type="button" onClick={computeRoute}>
              <span>Find Your Safe Route</span>
              <ArrowRight size={17} />
            </button>
            <button type="button" onClick={runSlamDemo}>
              <span>See How It Works</span>
              <PlayCircle size={17} />
            </button>
          </div>
        </div>
        <aside className="heroCard">
          <div className="brandLine">
            <Shield size={20} />
            <span>SafeNav</span>
          </div>
          <h2>Safety first, always.</h2>
          <p>Travel with confidence using perception-aware visual odometry, live risk scoring, and route replanning.</p>
          <button type="button" onClick={runSlamDemo}>Learn more <ArrowRight size={16} /></button>
        </aside>

        <section className="demoConsole">
          <div className="consolePlanner">
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
          </div>
          <div className="consoleMapping">
            <VisualMappingPanel
              slam={slamResult}
              isProcessing={slamProcessing}
              status={slamStatus}
              uploadedFileName={slamFileName}
              onUpload={uploadSlamVideo}
              onDemo={runSlamDemo}
            />
          </div>
          <aside className="liveFeedCard">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Live Camera Feed</p>
                <h2>Route Context</h2>
              </div>
              <Camera size={18} />
            </div>
            <div className="cameraPreview">
              <span className="livePill">Live</span>
            </div>
            <div className="feedRows">
              <span>Location</span><strong>{selectedNode?.name ?? "Library Pathway"}</strong>
              <span>Foot Traffic</span><strong>Moderate</strong>
              <span>Lighting</span><strong>Good</strong>
              <span>Recent Activity</span><strong>Low Risk</strong>
            </div>
          </aside>
        </section>
      </section>

      <section className="featureRail" aria-label="SafeNav technical highlights">
        <article><Shield size={30} /><strong>Real-Time Safety</strong><span>Perception signals update route risk as conditions change.</span></article>
        <article><Workflow size={30} /><strong>Smart Routing</strong><span>Dijkstra and A* compare risk-aware paths over the campus graph.</span></article>
        <article><Bell size={30} /><strong>Alerts & Reroutes</strong><span>Blocked paths and low visibility trigger route recalculation.</span></article>
        <article><Building2 size={30} /><strong>For Campuses</strong><span>A hackathon-ready autonomy demo for nighttime navigation.</span></article>
      </section>

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
          <RiskDashboard summary={summary} />
          <MetricsPanel route={route} metrics={metrics} />
        </aside>
      </div>
    </main>
  );
}
