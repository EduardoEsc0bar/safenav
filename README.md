# SafeNav

SafeNav is a SLAM-lite visual mapping and perception-aware campus navigation prototype. It treats nighttime walking navigation like a small autonomy pipeline:

Camera or simulated sensor input -> perception feature extraction -> risk estimation -> graph world model -> Dijkstra/A* path planning -> live visualization and metrics.

The first screen centers the SLAM-lite visual odometry and sparse mapping demo for uploaded iPhone videos. It uses ORB features, descriptor matching, essential matrix estimation, pose recovery, and sparse triangulation to produce a camera trajectory, point cloud, and annotated keyframe evidence cards. This is not production SLAM.

## Project Structure

```text
backend/
  app/
    main.py
    models.py
    graph.py
    planner.py
    risk.py
    perception.py
    slam_lite.py
    simulation.py
    metrics.py
  requirements.txt
frontend/
  src/
    App.tsx
    api/client.ts
    components/
  package.json
```

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo Flow

1. Start at Student Center.
2. Set destination to Dorms.
3. Compute the default route.
4. Turn on Night Mode and show risk colors increasing on darker and more isolated paths.
5. Trigger Path Blocked near Parking Lot/east campus and show SafeNav reroute.
6. Switch between Dijkstra and A*.
7. Show compute time, visited nodes, route cost, and reroute count.
8. Generate a Demo Frame or upload an image in the Perception panel.
9. Apply perception features to Parking Lot or another selected node.
10. Upload a short iPhone video or run Demo Map in Visual Mapping Mode.
11. Show SLAM-lite camera poses, sparse 3D points, reconstruction confidence, and map confidence.
12. Explain that SafeNav demonstrates perception-driven risk-aware navigation with dynamic graph updates and SLAM-lite visual odometry.

## Technical Highlights

- Real-time perception feature extraction from image frames using OpenCV brightness, blur, frame-difference motion, crowd-detection stub/HOG, and obstruction heuristics.
- Risk-aware graph world model with dynamic node and edge costs.
- Dijkstra and A* path planners with distance/risk weighting, blocked-path handling, runtime metrics, and expansion counts.
- Dynamic rerouting under nighttime, low-visibility, crowd-dispersal, high-activity, blocked-path, and perception-update scenarios.
- SLAM-lite visual odometry from uploaded video using ORB matching, essential matrix RANSAC, pose recovery, sparse triangulation, and camera trajectory estimation.
- Latency and route metrics tracking for demo and interview discussion.
- Modular FastAPI backend and React TypeScript frontend.

## Resume Bullets

- Built a real-time perception-aware navigation system using OpenCV, FastAPI, and React, extracting lighting, visibility, crowd, and motion signals to dynamically update risk-aware campus routes.
- Implemented Dijkstra and A* path planners over a graph-based world model, integrating dynamic risk costs and blocked-path handling to support real-time route replanning.
- Added simulation controls and metrics instrumentation to evaluate reroute latency, path cost, visited nodes, and perception update latency under nighttime, low-visibility, and obstruction scenarios.

## API

- `GET /api/graph`
- `POST /api/route`
- `POST /api/simulate`
- `POST /api/reset`
- `GET /api/metrics`
- `GET /api/health`
- `POST /api/perception/frame`
- `GET /api/perception/demo`
- `POST /api/perception/apply`
- `POST /api/slam/upload-video`
- `GET /api/slam/demo`
