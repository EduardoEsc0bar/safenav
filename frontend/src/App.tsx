import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Circle, Crosshair, Shield, Upload, X, Zap } from "lucide-react";
import { api } from "./api/client";
import { CampusMap } from "./components/CampusMap";
import { MetricsPanel } from "./components/MetricsPanel";
import { PerceptionPanel } from "./components/PerceptionPanel";
import { RiskDashboard } from "./components/RiskDashboard";
import { RouteControls } from "./components/RouteControls";
import { RouteExplanation } from "./components/RouteExplanation";
import { SimulationPanel } from "./components/SimulationPanel";
import { KeyframeInstances } from "./components/VisualMappingPanel";
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
  const [currentPage, setCurrentPage] = useState<"home" | "how">("home");
  const visualRef = useRef<HTMLElement | null>(null);
  const workflowRef = useRef<HTMLElement | null>(null);
  const routeMapRef = useRef<HTMLDivElement | null>(null);

  const selectedNode = useMemo(() => graph.nodes.find((node) => node.id === selectedNodeId) ?? null, [graph.nodes, selectedNodeId]);
  const safetyScore = summary ? Math.max(0, 10 - summary.overall_risk * 10) : 8.7;
  const safetyLabel = safetyScore >= 7.5 ? "High" : safetyScore >= 5 ? "Moderate" : "Low";
  const firstKeyframe = slamResult?.keyframeInstances?.[0] ?? null;
  const uploadProgress = slamProcessing ? 78 : slamResult ? 100 : 0;

  const scrollToWorkflow = useCallback(() => {
    window.requestAnimationFrame(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const showHome = useCallback(() => {
    setCurrentPage("home");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const showHowItWorks = useCallback(() => {
    setCurrentPage("how");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const scrollToVisualMapping = useCallback(() => {
    setCurrentPage("home");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        visualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

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

  const viewSafeRoute = useCallback(async () => {
    await computeRoute();
    window.requestAnimationFrame(() => {
      routeMapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [computeRoute]);

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
    scrollToWorkflow();
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
          <button type="button" onClick={currentPage === "how" ? showHome : showHowItWorks}>{currentPage === "how" ? "Home" : "How It Works"}</button>
          <span>Campus Safety</span>
          <span>For Cities</span>
          <span>About</span>
          <span>Contact</span>
        </nav>
        <div className="hudNavActions">
          <button type="button" onClick={computeRoute}>Log In</button>
          <button className="hudAccentButton" type="button" onClick={scrollToVisualMapping}>Get Started <ArrowUpRight size={16} /></button>
        </div>
      </header>

      {error && <div className="errorBanner">{error}</div>}

      {currentPage === "how" ? (
        <HowItWorksPage onStartDemo={scrollToVisualMapping} />
      ) : (
        <>
      <section className="pathHomeHero">
        <div className="pathHomeCopy">
          <h1>Your safest path home.</h1>
          <p>SafeNav uses camera-based perception, visual mapping, and risk-aware routing to guide students across campus at night.</p>
          <div className="pathHomeActions">
            <button type="button" onClick={scrollToVisualMapping}>Find Your Safe Route <ArrowUpRight size={17} /></button>
            <button type="button" onClick={showHowItWorks}>See How It Works <Circle size={15} /></button>
          </div>
        </div>
        <aside className="pathHomeCard">
          <div className="miniBrand"><Shield size={19} /> SafeNav</div>
          <h2>Safety first, always.</h2>
          <p>Upload a campus walk. SafeNav turns visual evidence into route risk, confidence, and a safer path decision.</p>
          <button type="button" onClick={scrollToVisualMapping}>Learn more <ArrowUpRight size={16} /></button>
        </aside>
      </section>

      <section className="hudHero" ref={visualRef}>
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
          <HudMappingConsole
            firstKeyframe={firstKeyframe}
            metrics={metrics}
            safetyLabel={safetyLabel}
            safetyScore={safetyScore}
            slamProcessing={slamProcessing}
            slamResult={slamResult}
          />
        </div>
      </section>

      <section className="hudWorkflow" ref={workflowRef}>
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
          <KeyframeInstances instances={slamResult?.keyframeInstances ?? []} />
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
          <button type="button" onClick={viewSafeRoute}>View Safe Route <ArrowUpRight size={17} /></button>
        </article>
      </section>

      <section className="hudFeatureStrip" aria-label="SafeNav technical highlights">
        <article><Crosshair size={32} /><strong>Real-Time Intelligence</strong><span>Camera data and models continuously update risk levels.</span></article>
        <article><Zap size={32} /><strong>Adaptive Routing</strong><span>Routes adjust in real time based on changing conditions.</span></article>
        <article><Shield size={32} /><strong>Privacy First</strong><span>Demo-ready perception signals without identity claims.</span></article>
        <article><span className="statusDot" /><strong>System Status</strong><span>Operational</span></article>
      </section>

      <div className="appGrid">
        <div className="mainColumn" ref={routeMapRef}>
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
        </>
      )}
    </main>
  );
}

function HowItWorksPage({ onStartDemo }: { onStartDemo: () => void }) {
  return (
    <section className="howItWorksPage">
      <div className="howPageHero">
        <span>System Pipeline</span>
        <h1>How SafeNav Works</h1>
        <p>SafeNav treats a walking route like a small autonomy problem: video becomes perception features, perception updates risk, risk updates the graph, and planners recompute the safer route.</p>
        <button type="button" onClick={onStartDemo}>Open Visual Mapping Mode <ArrowUpRight size={17} /></button>
      </div>

      <div className="howItWorksPanel standalone">
        <div className="howItWorksHeader">
          <span>Autonomy Stack</span>
          <h2>From Footage To Route Decision</h2>
          <p>The demo is designed to show perception engineering, SLAM-lite reasoning, risk estimation, graph modeling, and path planning in one end-to-end loop.</p>
        </div>
        <div className="howItWorksGrid">
          <article>
            <span>01</span>
            <strong>Upload or simulate sensor input</strong>
            <p>A campus walk video is sampled into keyframes so the demo can inspect lighting, blur, motion, and visual texture over time.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Estimate camera motion</strong>
            <p>ORB features are matched between frames, RANSAC filters outliers, and SLAM-lite estimates pose plus sparse 3D structure.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Convert perception into risk</strong>
            <p>Lighting, visibility, obstruction, crowd proxy, motion, and map confidence are converted into a plain-English safety signal.</p>
          </article>
          <article>
            <span>04</span>
            <strong>Replan on the campus graph</strong>
            <p>Dijkstra and A* compare distance against dynamic risk, avoid blocked paths, and expose latency, visited nodes, and reroute counts.</p>
          </article>
        </div>
        <div className="howItWorksTrace">
          <span>Video</span>
          <i />
          <span>Perception</span>
          <i />
          <span>Risk</span>
          <i />
          <span>Graph</span>
          <i />
          <span>Route</span>
        </div>
      </div>

      <div className="howDetailGrid">
        <article>
          <span>Perception</span>
          <strong>Scene quality becomes a signal.</strong>
          <p>Brightness, blur, motion, obstruction uncertainty, and feature quality explain whether SafeNav should trust the current view.</p>
        </article>
        <article>
          <span>Planning</span>
          <strong>The route is not just shortest path.</strong>
          <p>The graph planner weighs distance against dynamic risk so blocked, dark, or low-confidence areas can trigger rerouting.</p>
        </article>
        <article>
          <span>Metrics</span>
          <strong>Every decision exposes runtime evidence.</strong>
          <p>Compute time, visited nodes, inlier ratio, SLAM latency, map confidence, and route cost make the demo interview-friendly.</p>
        </article>
      </div>
    </section>
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

function HudMappingConsole({
  firstKeyframe,
  metrics,
  safetyLabel,
  safetyScore,
  slamProcessing,
  slamResult
}: {
  firstKeyframe: SlamLiteResult["keyframeInstances"][number] | null;
  metrics: RuntimeMetrics | null;
  safetyLabel: string;
  safetyScore: number;
  slamProcessing: boolean;
  slamResult: SlamLiteResult | null;
}) {
  const confidence = slamResult?.mapConfidence ?? (metrics && metrics.map_confidence > 0 ? metrics.map_confidence : 0.68);
  const inlierRatio = slamResult?.totalMatches ? slamResult.inlierMatches / slamResult.totalMatches : 0.62;
  const latency = slamResult?.processingLatencyMs ?? metrics?.slam_processing_latency_ms ?? 0;
  const modeLabel = slamProcessing ? "Processing" : slamResult ? "Reconstruction ready" : "Awaiting footage";

  return (
    <div className="mappingConsole" aria-label="SLAM-lite visual mapping console">
      <div className="mappingConsoleHeader">
        <span>SLAM-lite Visual Odometry</span>
        <strong>{modeLabel}</strong>
      </div>

      <div className="sensorFrameHero">
        {firstKeyframe?.imageDataUrl ? (
          <img src={firstKeyframe.imageDataUrl} alt={`${firstKeyframe.title} feature analysis`} />
        ) : (
          <div className="syntheticSensorScene">
            <i className="syntheticLight one" />
            <i className="syntheticLight two" />
            <i className="syntheticBox a" />
            <i className="syntheticBox b" />
            <i className="syntheticBox c" />
          </div>
        )}
        <div className="featureOverlay">
          <i style={{ left: "18%", top: "38%" }} />
          <i style={{ left: "31%", top: "55%" }} />
          <i style={{ left: "46%", top: "42%" }} />
          <i style={{ left: "61%", top: "62%" }} />
          <i style={{ left: "76%", top: "36%" }} />
        </div>
        <div className="frameReadout">
          <span>{firstKeyframe?.title ?? "Frame Stream"}</span>
          <strong>{firstKeyframe ? `${firstKeyframe.keypoints} keypoints` : "ORB ready"}</strong>
        </div>
      </div>

      <div className="mappingStatsGrid">
        <div><span>Safety Score</span><strong>{safetyScore.toFixed(1)}<small>/10</small></strong><em>{safetyLabel}</em></div>
        <div><span>Map Confidence</span><strong>{confidence.toFixed(2)}</strong><em>{confidence >= 0.7 ? "Strong" : "Watch"}</em></div>
        <div><span>Inlier Ratio</span><strong>{Math.round(inlierRatio * 100)}%</strong><em>RANSAC</em></div>
        <div><span>SLAM Latency</span><strong>{latency ? `${Math.round(latency)}ms` : "--"}</strong><em>Pipeline</em></div>
      </div>

      <div className="pipelineTrace">
        <span className="done">Frames</span>
        <span className={slamResult ? "done" : slamProcessing ? "active" : ""}>ORB</span>
        <span className={slamResult ? "done" : ""}>Pose</span>
        <span className={slamResult ? "done" : ""}>Risk</span>
      </div>
    </div>
  );
}
