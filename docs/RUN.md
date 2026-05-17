# Run instructions

## Backend (Flask)

From repository root (using your venv):

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python backend/app.py
```

API endpoint: `POST /api/solve` JSON body:
- `puzzle`: 9x9 array (list of lists) or flat 81-length list
- `algorithm`: `backtracking` | `ac3` | `heuristic` | `dancing_links`
- `options`: { `mrv`: bool, `forward_check`: bool }

Example using `curl`:

```bash
curl -X POST http://localhost:5000/api/solve -H "Content-Type: application/json" -d '{"puzzle": [/*81 ints*/], "algorithm": "backtracking", "options": {"mrv": true}}'
```

## Frontend (React)

The existing React UI lives in `react-ui/`. To run it:

```bash
cd react-ui
npm install
npm run dev
```

The React app can be extended to call the backend API at `http://localhost:5000/api/solve`.
