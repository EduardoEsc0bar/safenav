# SafeNav Backend

FastAPI backend for the SafeNav perception-aware navigation demo.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API health check is available at `http://localhost:8000/api/health`.
