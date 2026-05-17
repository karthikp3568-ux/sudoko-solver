# Architecture & Next Steps

This repo now contains a backend Flask API and solver implementations plus frontend React UI.

## Backend
- `backend/app.py` - Flask API exposing `/api/solve`.
- `backend/algorithms/` - solver modules:
  - `backtracking.py` - backtracking solver with MRV and Forward Checking options.
  - `ac3.py` - AC-3 constraint propagation with fallback to backtracking.
  - `heuristic_solver.py` - MRV + Forward Checking wrapper.
  - `dancing_links.py` - stub for DLX (to implement).
- `backend/metrics/profiler.py` - simple tracer utility for time and memory.

## Frontend
- Existing React app in `react-ui/` can be extended into `frontend/src/components`.
- Recommendation: build an Algorithm Comparison Dashboard that queries `/api/solve` for each algorithm and aggregates metrics.

## High-priority features to implement next
1. Implement full Dancing Links (DLX) solver in `backend/algorithms/dancing_links.py`.
2. Build Algorithm Comparison Dashboard frontend with Chart.js or Recharts.
3. Add Complexity Visualizer (recursion tree, branching factor heatmap).
4. Create benchmark runner and dataset of 100 puzzles in `datasets/` and `tests/benchmarks`.
5. Integrate OCR (Tesseract/OpenCV) and add AI Assistant Mode for explanations.

## How this aligns to your DAA goals
- The new backend API provides a uniform interface so the frontend can compare algorithms by time, recursion count, peak memory, and accuracy.
- MRV and Forward Checking are implemented in the backtracking solver.
- DLX remains to be implemented — completing it will significantly raise the project's academic value.

If you want, I can now:
- Implement DLX next, or
- Start the frontend dashboard that queries and visualizes algorithm metrics.
