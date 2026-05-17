import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Board from './components/Board';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import LogPanel from './components/LogPanel';
import ExplanationPanel from './components/ExplanationPanel';
import ImageUpload from './components/ImageUpload';
import { createSolverByAlgorithm } from './algorithms/solver_manager';
import { ALGORITHM_META } from './config/api';
import { defaultPuzzle, generatePuzzleGrid } from './utils/solver';

const SPEED_MS = { slow: 150, normal: 40, fast: 8, instant: 0 };

function computeHighlight(action) {
  if (!action) return {};
  const { type } = action;
  if (type === 'place' || type === 'select')
    return { type: 'place', cells: [[action.row, action.col]] };
  if (type === 'invalid')
    return { type: 'invalid', cells: [[action.row, action.col], ...(action.conflicts || [])] };
  if (type === 'backtrack' || type === 'uncover')
    return { type: 'backtrack', cells: [[action.row, action.col]] };
  if (type === 'propagate')
    return { type: 'propagate', cells: [action.toCell, action.fromCell] };
  if (type === 'mrv_select')
    return { type: 'mrv', cells: [[action.row, action.col]] };
  if (type === 'cover')
    return { type: 'cover', cells: [] };
  if (type === 'solved' || type === 'ac3_complete')
    return { type: 'solved', cells: [] };
  if (type === 'dead_end' || type === 'failed')
    return { type: 'failed', cells: [] };
  return {};
}

export default function App() {
  const [grid, setGrid] = useState(defaultPuzzle);
  const [originalGrid, setOriginalGrid] = useState(defaultPuzzle);
  const [algorithm, setAlgorithm] = useState('backtracking');
  const [difficulty, setDifficulty] = useState('medium');
  const [speed, setSpeed] = useState('normal');
  const [solveMode, setSolveMode] = useState('idle'); // idle | solving | paused | done
  const [highlight, setHighlight] = useState({});
  const [metrics, setMetrics] = useState({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
  const [stepLog, setStepLog] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [toast, setToast] = useState(null);
  const [activeCell, setActiveCell] = useState([-1, -1]);
  const [stepCount, setStepCount] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const solverRef   = useRef(null);
  const intervalRef = useRef(null);
  const solveModeRef = useRef('idle');
  const speedRef    = useRef('normal');

  useEffect(() => { solveModeRef.current = solveMode; }, [solveMode]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const clearLoop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const applyStep = useCallback(() => {
    const solver = solverRef.current;
    if (!solver || solver.isDone) { clearLoop(); return; }

    solver.step();
    const action = solver.lastAction;
    if (!action) return;

    const elapsedTime = solver.metrics.time > 0
      ? solver.metrics.time
      : solver._t0
      ? (performance.now() - solver._t0) / 1000
      : 0;

    setGrid(solver.getGrid());
    setHighlight(computeHighlight(action));
    setMetrics({
      nodes:      solver.metrics.nodes,
      backtracks: solver.metrics.backtracks,
      reductions: solver.metrics.constraintReductions ?? solver.metrics.columnsSelected ?? 0,
      time:       elapsedTime,
      progress:   solver.getProgress(),
    });
    setExplanation(action.explanation || '');
    setStepCount(c => c + 1);
    if (action.message) {
      setStepLog(prev => {
        const next = [...prev, { type: action.type, msg: action.message }];
        return next.length > 10000 ? next.slice(-10000) : next;
      });
    }

    if (solver.isDone) {
      clearLoop();
      setSolveMode('done');
      setToast(solver.isSolvable ? 'solved' : 'failed');
      setTimeout(() => setToast(null), 3500);
    }
  }, [clearLoop]);

  const startLoop = useCallback((spd) => {
    clearLoop();
    const delay = SPEED_MS[spd];
    if (delay === 0) {
      // Instant: run all steps synchronously in one tick
      const solver = solverRef.current;
      if (!solver) return;
      while (!solver.isDone) solver.step();
      const action = solver.lastAction;
      const elapsedTime = solver.metrics.time > 0
        ? solver.metrics.time
        : solver._t0
        ? (performance.now() - solver._t0) / 1000
        : 0;
      setGrid(solver.getGrid());
      setHighlight(computeHighlight(action));
      setMetrics({
        nodes:      solver.metrics.nodes,
        backtracks: solver.metrics.backtracks,
        reductions: solver.metrics.constraintReductions ?? solver.metrics.columnsSelected ?? 0,
        time:       elapsedTime,
        progress:   1,
      });
      setExplanation(action?.explanation || '');
      setStepCount(solver.totalSteps ?? 0);
      setSolveMode('done');
      setToast(solver.isSolvable ? 'solved' : 'failed');
      setTimeout(() => setToast(null), 3500);
    } else {
      intervalRef.current = setInterval(applyStep, delay);
    }
  }, [clearLoop, applyStep]);

  function initSolver(puzzle) {
    const solver = createSolverByAlgorithm(algorithm, puzzle);
    solver.start();
    solverRef.current = solver;
    setStepLog([]);
    setExplanation('');
    setHighlight({});
    setStepCount(0);
    setMetrics({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
    return solver;
  }

  function handleSolve() {
    clearLoop();
    const puzzle = grid.map(r => [...r]);
    setOriginalGrid(puzzle);
    initSolver(puzzle);
    setSolveMode('solving');
    startLoop(speed);
  }

  function handleStep() {
    if (solveMode === 'done') return;
    if (solveMode === 'idle') {
      const puzzle = grid.map(r => [...r]);
      setOriginalGrid(puzzle);
      initSolver(puzzle);
      setSolveMode('paused');
    }
    clearLoop();
    applyStep();
  }

  function handlePause() {
    if (solveMode === 'solving') {
      clearLoop();
      setSolveMode('paused');
    } else if (solveMode === 'paused') {
      setSolveMode('solving');
      startLoop(speed);
    }
  }

  function handleReset() {
    clearLoop();
    setSolveMode('idle');
    setGrid(originalGrid.map(r => [...r]));
    setHighlight({});
    setExplanation('');
    setStepLog([]);
    setStepCount(0);
    setMetrics({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
    setActiveCell([-1, -1]);
    solverRef.current = null;
  }

  function handleClear() {
    clearLoop();
    const empty = Array(9).fill(null).map(() => Array(9).fill(0));
    setSolveMode('idle');
    setGrid(empty);
    setOriginalGrid(empty);
    setHighlight({});
    setExplanation('');
    setStepLog([]);
    setStepCount(0);
    setMetrics({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
    solverRef.current = null;
  }

  function handleGenerate() {
    clearLoop();
    const g = generatePuzzleGrid(difficulty);
    setSolveMode('idle');
    setGrid(g);
    setOriginalGrid(g.map(r => [...r]));
    setHighlight({});
    setExplanation('');
    setStepLog([]);
    setStepCount(0);
    setMetrics({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
    solverRef.current = null;
  }

  function handleSpeedChange(s) {
    setSpeed(s);
    if (solveModeRef.current === 'solving') {
      clearLoop();
      startLoop(s);
    }
  }

  function handleCellEdit(r, c, v) {
    if (solveMode === 'solving') return;
    setGrid(prev => { const g = prev.map(row => [...row]); g[r][c] = v; return g; });
    setActiveCell([r, c]);
  }

  function handlePhotoGrid(g) {
    clearLoop();
    setSolveMode('idle');
    setGrid(g);
    setOriginalGrid(g.map(r => [...r]));
    setStepLog([]);
    setExplanation('');
    setHighlight({});
    setMetrics({ nodes: 0, backtracks: 0, reductions: 0, time: 0, progress: 0 });
    solverRef.current = null;
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (solveModeRef.current === 'solving') return;
      const [r, c] = activeCell;
      if (r < 0 || c < 0) return;
      if (e.key >= '1' && e.key <= '9') { e.preventDefault(); handleCellEdit(r, c, +e.key); }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); handleCellEdit(r, c, 0); }
      if (e.key === 'ArrowRight' && c < 8) { e.preventDefault(); setActiveCell([r, c + 1]); }
      if (e.key === 'ArrowLeft'  && c > 0) { e.preventDefault(); setActiveCell([r, c - 1]); }
      if (e.key === 'ArrowDown'  && r < 8) { e.preventDefault(); setActiveCell([r + 1, c]); }
      if (e.key === 'ArrowUp'    && r > 0) { e.preventDefault(); setActiveCell([r - 1, c]); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCell]);

  const algMeta = ALGORITHM_META[algorithm];

  return (
    <div className="app-shell">
      <div className="scanline" />
      <div className="grid-bg" />

      <div className="app-frame">
        {/* ── Header ── */}
        <header className="topbar glass-panel">
          <div className="brand-block">
            <span className="brand-tag">DAA Visualization Platform</span>
            <h1>Sudoku<span className="brand-accent"> Intelligence</span></h1>
          </div>

          <div className="algo-selector">
            {Object.entries(ALGORITHM_META).map(([key, meta]) => (
              <button
                key={key}
                className={`algo-chip ${algorithm === key ? 'algo-chip--active' : ''}`}
                style={algorithm === key ? { '--chip-color': meta.color, '--chip-glow': meta.glow } : {}}
                onClick={() => { if (solveMode !== 'solving') setAlgorithm(key); }}
                disabled={solveMode === 'solving'}
              >
                <span className="chip-short">{meta.short}</span>
                <span className="chip-label">{meta.label}</span>
              </button>
            ))}
          </div>

          <div className="theme-toggle-wrap">
            <button
              className="theme-toggle-btn"
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>

          <div className="status-block">
            <div className={`status-pill status-pill--${solveMode}`} style={{ '--pill-color': algMeta.color }}>
              <span className="pill-dot" />
              {solveMode === 'solving' ? 'SOLVING' : solveMode === 'paused' ? 'PAUSED' : solveMode === 'done' ? 'COMPLETE' : 'READY'}
            </div>
            <div className="metric-chip">
              <span>Steps</span><strong>{stepCount.toLocaleString()}</strong>
            </div>
            <div className="metric-chip">
              <span>Progress</span><strong>{(metrics.progress * 100).toFixed(0)}%</strong>
            </div>
          </div>
        </header>

        {/* ── Algorithm info bar ── */}
        <div className="algo-info-bar glass-panel" style={{ '--bar-color': algMeta.color, '--bar-glow': algMeta.glow }}>
          <span className="algo-info-name" style={{ color: algMeta.color }}>{algMeta.label}</span>
          <span className="algo-info-desc">{algMeta.desc}</span>
          <span className="algo-info-meta">
            <code>{algMeta.complexity}</code>
            <span className="algo-sep">·</span>
            <span>{algMeta.bestFor}</span>
          </span>
        </div>

        {/* ── Main dashboard ── */}
        <main className="dashboard-grid">

          {/* Left column: board + controls */}
          <section className="visual-section glass-panel">
            <Board
              grid={grid}
              activeCell={activeCell}
              highlight={highlight}
              originalGrid={originalGrid}
              onCellClick={setActiveCell}
              onCellEdit={handleCellEdit}
              solveMode={solveMode}
              algColor={algMeta.color}
            />

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${metrics.progress * 100}%`,
                  background: algMeta.color,
                  boxShadow: `0 0 10px ${algMeta.glow}`,
                }}
              />
            </div>

            <Controls
              solveMode={solveMode}
              difficulty={difficulty}
              speed={speed}
              onSolve={handleSolve}
              onStep={handleStep}
              onPause={handlePause}
              onReset={handleReset}
              onClear={handleClear}
              onGenerate={handleGenerate}
              onDifficulty={setDifficulty}
              onSpeed={handleSpeedChange}
              algColor={algMeta.color}
              algGlow={algMeta.glow}
            />

            <ImageUpload onGridExtracted={handlePhotoGrid} />
          </section>

          {/* Right column: stats + explanation + log */}
          <aside className="side-panel">
            <StatsPanel metrics={metrics} algMeta={algMeta} />
            <ExplanationPanel explanation={explanation} lastAction={solverRef.current?.lastAction} algMeta={algMeta} />
            <LogPanel log={stepLog} />
          </aside>
        </main>
      </div>

      {toast === 'solved' && (
        <div className="toast toast--solved glass-panel">
          <span className="toast-icon">✓</span>
          <div>
            <strong>Puzzle Solved!</strong>
            <p>{algMeta.label} found the solution.</p>
          </div>
        </div>
      )}
      {toast === 'failed' && (
        <div className="toast toast--failed glass-panel">
          <span className="toast-icon">✗</span>
          <div>
            <strong>No Solution</strong>
            <p>This puzzle has no valid solution.</p>
          </div>
        </div>
      )}
    </div>
  );
}
