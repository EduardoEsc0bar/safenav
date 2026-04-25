import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, Circle, Crosshair, Shield, Upload, X, Zap } from "lucide-react";
import { api } from "./api/client";
import { CampusMap } from "./components/CampusMap";
import { MetricsPanel } from "./components/MetricsPanel";
import { PerceptionPanel } from "./components/PerceptionPanel";
import { RiskDashboard } from "./components/RiskDashboard";
import { RouteControls } from "./components/RouteControls";
import { RouteExplanation } from "./components/RouteExplanation";
import { SimulationPanel } from "./components/SimulationPanel";
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
  const safetyScore = summary ? Math.max(0, 10 - summary.overall_risk * 10) : 8.7;
  const safetyLabel = safetyScore >= 7.5 ? "High" : safetyScore >= 5 ? "Moderate" : "Low";
  const firstKeyframe = slamResult?.keyframeInstances?.[0] ?? null;
  const uploadProgress = slamProcessing ? 78 : slamResult ? 100 : 0;

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
      <header className="hudNav">
        <div className="hudBrand">
          <Crosshair size={28} />
          <span>SAFENAV</span>
        </div>
        <nav className="hudNavLinks" aria-label="SafeNav sections">
          <span>Platform</span>
          <span>Technology</span>
          <span>Solutions</span>
          <span>Resources</span>
          <span>Company</span>
        </nav>
        <div className="hudNavActions">
          <button type="button" onClick={computeRoute}>Log In</button>
          <button className="hudAccentButton" type="button" onClick={runSlamDemo}>Get Started <ArrowUpRight size={16} /></button>
        </div>
      </header>

      {error && <div className="errorBanner">{error}</div>}

      <section className="hudHero">
        <div className="hudHeroCopy">
          <p className="hudStep"><strong>01</strong> / Analyze Environment</p>
          <h1>Visual Mapping Mode</h1>
          <p>Upload footage. We map the environment, analyze risk in every frame, and build the safest route.</p>
          <div className="hudHeroActions">
            <label className="hudAccentButton uploadButton" title="Upload campus walk video">
              <span>Upload Video</span>
              <Upload size={17} />
              <input
                type="file"
                accept="video/*,.mov,.mp4,.mkv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) uploadSlamVideo(file);
                }}
              />
            </label>
            <button type="button" onClick={runSlamDemo}>View Demo Map <ArrowUpRight size={17} /></button>
          </div>
          <span className="hudFormats">Supported formats<br />MP4, MOV, MKV</span>
        </div>

        <div className="hudMapStage">
          <div className="hudScore">
            <span>Safety Score</span>
            <strong>{safetyScore.toFixed(1)}<small>/10</small></strong>
            <em>{safetyLabel}</em>
          </div>
          <div className="hudRiskLegend">
            <span>Risk Level</span>
            <i className="lowLine" /> Low Risk
            <i className="mediumLine" /> Moderate
            <i className="highLine" /> High Risk
          </div>
          <HudRouteBlueprint />
        </div>
      </section>

      <section className="hudWorkflow">
        <article className="hudCard uploadStage">
          <header><h2>1. Upload Video</h2><span>01</span></header>
          <label className="hudDropZone">
            <Upload size={28} />
            <strong>Drag & Drop Video</strong>
            <span>or click to browse</span>
            <input
              type="file"
              accept="video/*,.mov,.mp4,.mkv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) uploadSlamVideo(file);
              }}
            />
          </label>
          <div className="hudFileRow">
            <div><strong>{slamFileName || "Campus_walk_0324.mp4"}</strong><span>{slamFileName ? "Uploaded video" : "04:12 1080p"}</span></div>
            <X size={17} />
          </div>
          <div className="hudProgress"><span>Uploaded</span><strong>{uploadProgress}%</strong><i style={{ width: `${uploadProgress}%` }} /></div>
        </article>

        <article className="hudCard processingStage">
          <header><h2>2. Processing</h2><span>02</span></header>
          <HudProcessStep done label="Extracting frames" />
          <HudProcessStep done={Boolean(slamResult)} label="Analyzing environment" />
          <HudProcessStep done={Boolean(firstKeyframe)} label="Detecting objects" />
          <HudProcessStep active={slamProcessing} done={Boolean(slamResult)} label="Calculating risk" />
          <HudProcessStep done={Boolean(route)} label="Generating routes" />
          <div className="hudProgress processingProgress"><strong>{slamProcessing ? "78%" : slamResult ? "100%" : "Ready"}</strong><i style={{ width: `${slamProcessing ? 78 : slamResult ? 100 : 18}%` }} /></div>
        </article>

        <article className="hudCard visualizationStage">
          <header><h2>3. Visualization</h2><span>03</span></header>
          <div className="hudFrame">
            {firstKeyframe?.imageDataUrl ? <img src={firstKeyframe.imageDataUrl} alt={`${firstKeyframe.title} visual analysis`} /> : <div className="hudSyntheticFrame" />}
            <span>Frame {firstKeyframe?.index ?? 1420} / {slamResult?.framesProcessed ?? 7621} &nbsp; 00:02:13</span>
          </div>
          <div className="hudFrameStats">
            <span>Objects detected</span><strong>{firstKeyframe?.keypoints ?? 14}</strong>
            <span>Risk level</span><strong className={safetyScore >= 7.5 ? "riskHighText" : ""}>{safetyLabel}</strong>
          </div>
          <div className="hudRiskTimeline"><i /></div>
        </article>

        <article className="hudCard routeSummaryStage">
          <header><h2>Route Summary</h2><span>04</span></header>
          <div className="summaryRows">
            <span>Distance</span><strong>{route ? `${(route.totalDistance / 100).toFixed(2)} mi` : "0.72 mi"}</strong>
            <span>Est. Time</span><strong>{route ? `${Math.max(6, Math.round(route.totalDistance / 5))} min` : "14 min"}</strong>
          </div>
          <div className="summaryScore">
            <span>Safety Score</span>
            <strong>{safetyScore.toFixed(1)}<small>/10</small></strong>
            <em>{safetyLabel}</em>
          </div>
          <button type="button" onClick={computeRoute}>View Safe Route <ArrowUpRight size={17} /></button>
        </article>
      </section>

      <section className="hudFeatureStrip" aria-label="SafeNav technical highlights">
        <article><Crosshair size={32} /><strong>Real-Time Intelligence</strong><span>Camera data and models continuously update risk levels.</span></article>
        <article><Zap size={32} /><strong>Adaptive Routing</strong><span>Routes adjust in real time based on changing conditions.</span></article>
        <article><Shield size={32} /><strong>Privacy First</strong><span>Demo-ready perception signals without identity claims.</span></article>
        <article><span className="statusDot" /><strong>System Status</strong><span>Operational</span></article>
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
          <RiskDashboard summary={summary} />
          <MetricsPanel route={route} metrics={metrics} />
        </aside>
      </div>
    </main>
  );
}

function HudProcessStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`hudProcessStep ${done ? "done" : ""} ${active ? "active" : ""}`}>
      {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      <span>{label}</span>
    </div>
  );
}

function HudRouteBlueprint() {
  const dots = [
    [23, 48, "green"], [27, 49, "green"], [31, 50, "green"], [35, 52, "green"], [39, 55, "green"],
    [44, 59, "yellow"], [49, 59, "yellow"], [54, 58, "yellow"], [59, 57, "yellow"], [64, 57, "yellow"],
    [69, 55, "orange"], [73, 53, "orange"], [77, 52, "orange"], [81, 54, "red"], [84, 59, "red"],
    [86, 65, "red"], [89, 71, "red"], [92, 76, "red"]
  ];

  return (
    <svg className="hudBlueprint" viewBox="0 0 100 100" role="img" aria-label="SafeNav risk-colored route blueprint">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: 30 }).map((_, index) => (
        <rect key={index} x={8 + (index % 10) * 9} y={10 + Math.floor(index / 10) * 20} width="5.5" height="8" className="wireBuilding" />
      ))}
      <polyline points="23,48 31,50 39,55 44,59 54,58 64,57 73,53 81,54 86,65 92,76" className="routeGlow" />
      {dots.map(([x, y, color], index) => <circle key={`${x}-${y}-${index}`} cx={x} cy={y} r="1.25" className={`routeDot ${color}`} />)}
      <circle cx="21" cy="47" r="3.4" className="startRing" />
      <text x="18" y="55" className="mapLabel start">START</text>
      <text x="18" y="59" className="mapLabel">STUDENT CENTER</text>
      <circle cx="92" cy="76" r="3.4" className="endRing" />
      <text x="90" y="85" className="mapLabel end">END</text>
      <text x="90" y="89" className="mapLabel">DORMS</text>
    </svg>
  );
}
