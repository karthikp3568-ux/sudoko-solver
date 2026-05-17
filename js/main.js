// main.js - Application controller

const API_BASE = '/api';
const SPEED_CONFIGS = {
  1: { label: 'Very Slow', stepsPerTick: 1,   tickMs: 300 },
  2: { label: 'Slow',      stepsPerTick: 1,   tickMs: 80  },
  3: { label: 'Normal',    stepsPerTick: 3,   tickMs: 30  },
  4: { label: 'Fast',      stepsPerTick: 30,  tickMs: 16  },
  5: { label: 'Ultra',     stepsPerTick: 200, tickMs: 16  }
};

let solver       = null;
let metrics      = new MetricsTracker();
let visualizer   = null;
let generator    = new PuzzleGenerator();

let currentPuzzle  = null;
let currentName    = 'Puzzle';
let isRunning      = false;
let isPaused       = false;
let animationTimer = null;
let selectedCell   = [-1, -1];
let speedLevel     = 3;

// ─────────────── Init ───────────────

document.addEventListener('DOMContentLoaded', () => {
  visualizer = new Visualizer(
    document.getElementById('sudoku-grid'),
    document.getElementById('stats-panel'),
    document.getElementById('constraints-panel'),
    document.getElementById('steps-log')
  );

  visualizer.buildGrid(handleCellClick);
  loadPuzzle(PUZZLES[0]);
  bindEvents();
});

function bindEvents() {
  document.getElementById('btn-solve').addEventListener('click', startSolving);
  document.getElementById('btn-step').addEventListener('click', stepOnce);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-reset').addEventListener('click', resetPuzzle);
  document.getElementById('btn-instant').addEventListener('click', instantSolve);
  document.getElementById('btn-generate').addEventListener('click', () => {
    const diff = document.getElementById('difficulty-select').value;
    generatePuzzle(diff);
  });
  document.getElementById('btn-predefined').addEventListener('click', openPredefined);
  document.getElementById('btn-check').addEventListener('click', checkPuzzle);
  document.getElementById('btn-clear').addEventListener('click', clearGrid);
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('btn-upload').addEventListener('click', () => {
    document.getElementById('image-upload').click();
  });
  document.getElementById('image-upload').addEventListener('change', handleImageUpload);
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    visualizer.clearLog();
  });

  const speedSlider = document.getElementById('speed-slider');
  speedSlider.addEventListener('input', () => {
    speedLevel = +speedSlider.value;
    document.getElementById('speed-label').textContent = SPEED_CONFIGS[speedLevel].label;
  });

  document.addEventListener('keydown', handleKeyDown);
}

// ─────────────── Puzzle Loading ───────────────

function loadPuzzle(puzzleObj) {
  stopSolving();
  currentPuzzle = puzzleObj.grid.map(r => [...r]);
  currentName = puzzleObj.name;
  solver = new BacktrackingSolver(currentPuzzle);
  visualizer.renderPuzzle(currentPuzzle);
  visualizer.clearLog();
  visualizer.showStatus(`Loaded: ${currentName}`);
  updatePuzzleMeta(puzzleObj);
  resetStats();
  selectedCell = [-1, -1];
  setButtonState('idle');
}

function updatePuzzleMeta(puzzleObj) {
  const puzzleName = document.getElementById('puzzle-name');
  const difficulty = document.getElementById('puzzle-difficulty');
  if (puzzleName) puzzleName.textContent = puzzleObj.name || 'Custom Puzzle';
  if (difficulty) {
    const diff = (puzzleObj.difficulty || 'custom').toLowerCase();
    difficulty.textContent = diff === 'custom' ? 'CUSTOM' : diff.toUpperCase();
    difficulty.className = `badge badge-${diff}`;
  }
}

async function generatePuzzle(difficulty) {
  stopSolving();
  visualizer.showStatus('Requesting puzzle from backend…');

  try {
    const response = await fetch(`${API_BASE}/puzzle?difficulty=${encodeURIComponent(difficulty)}`);
    if (!response.ok) throw new Error(`Server responded ${response.status}`);
    const payload = await response.json();
    currentPuzzle = payload.grid;
    currentName = payload.name || `Backend ${difficulty} Puzzle`;
    solver = new BacktrackingSolver(currentPuzzle);
    visualizer.renderPuzzle(currentPuzzle);
    visualizer.clearLog();
    visualizer.showStatus(`Loaded: ${currentName}`);
    updatePuzzleMeta({ name: currentName, difficulty: payload.difficulty || difficulty });
    resetStats();
    setButtonState('idle');
    return;
  } catch (err) {
    console.warn('Backend generation failed, falling back to client generator.', err);
  }

  visualizer.showStatus('Generating puzzle locally…');
  setTimeout(() => {
    try {
      const grid = generator.generate(difficulty);
      const analysis = generator.analyze(grid);
      currentPuzzle = grid;
      currentName = `Generated ${difficulty} (${analysis.emptyCells} empty)`;
      solver = new BacktrackingSolver(currentPuzzle);
      visualizer.renderPuzzle(currentPuzzle);
      visualizer.clearLog();
      visualizer.showStatus(`${currentName} — Difficulty: ${analysis.label}`);
      updatePuzzleMeta({ name: currentName, difficulty });
      resetStats();
      setButtonState('idle');
    } catch (e) {
      visualizer.showStatus('Generation failed, try again', '#ff6b6b');
    }
  }, 10);
}

function resetPuzzle() {
  stopSolving();
  solver = new BacktrackingSolver(currentPuzzle);
  visualizer.renderPuzzle(currentPuzzle);
  visualizer.clearLog();
  resetStats();
  setButtonState('idle');
  visualizer.showStatus('Reset');
}

function resetStats() {
  metrics.reset();
  const zero = { cellsTried:0, backtracks:0, successRate:0, elapsed:0, steps:0, cellsSolved:0, remainingEmpty:solver?.totalEmpty||0, maxDepth:0 };
  visualizer.updateStats(zero);
  visualizer.highlightConflicts(null);
  visualizer.highlightGroup(-1, -1);
}

// ─────────────── Solving ───────────────

function startSolving() {
  if (isRunning && !isPaused) return;
  if (solver?.isDone || (!solver?.isSolvable && solver?.pos < 0)) {
    resetPuzzle();
  }

  if (!solver) solver = new BacktrackingSolver(currentPuzzle);

  isRunning = true;
  isPaused = false;
  if (!metrics.startTime) metrics.start();
  setButtonState('running');
  visualizer.showStatus('Solving…', '#4a9eff');
  tick();
}

function tick() {
  if (!isRunning || isPaused) return;

  const cfg = SPEED_CONFIGS[speedLevel];
  const useAnims = speedLevel <= 2;
  let advanced = false;

  for (let i = 0; i < cfg.stepsPerTick; i++) {
    const hasMore = solver.step();
    const action = solver.lastAction;

    if (action) {
      advanced = true;
      visualizer.applyStep(action, useAnims);

      // Log notable events
      if (action.type !== 'invalid' || speedLevel <= 2) {
        visualizer.addLog(action.message, action.type);
      }

      // Constraint display update (only at slow speed)
      if (speedLevel <= 2 && action.type === 'place') {
        const [nr, nc] = solver.emptyList[solver.pos - 1] || [-1, -1];
        visualizer.highlightConflicts(null);
      }
      if (action.type === 'invalid' && useAnims) {
        visualizer.highlightConflicts(action.conflicts);
      }
    }

    if (!hasMore) break;
  }

  // Update current cell highlight
  if (solver.pos >= 0 && solver.pos < solver.emptyList.length) {
    const [r, c] = solver.emptyList[solver.pos];
    visualizer.highlightCurrent(r, c);
  } else {
    visualizer.highlightCurrent(-1, -1);
  }

  // Update stats
  visualizer.updateStats(metrics.snapshot(solver));

  if (solver.isDone || !solver.isSolvable) {
    onSolveComplete();
    return;
  }

  animationTimer = setTimeout(tick, cfg.tickMs);
}

function stepOnce() {
  if (solver?.isDone || (!solver?.isSolvable && solver?.pos < 0)) return;
  if (!solver) solver = new BacktrackingSolver(currentPuzzle);
  if (!metrics.startTime) metrics.start();

  const hasMore = solver.step();
  const action = solver.lastAction;

  if (action) {
    visualizer.applyStep(action, true);
    visualizer.addLog(action.message, action.type);

    if (action.type === 'invalid') visualizer.highlightConflicts(action.conflicts);
    else visualizer.highlightConflicts(null);
  }

  if (solver.pos >= 0 && solver.pos < solver.emptyList.length) {
    const [r, c] = solver.emptyList[solver.pos];
    visualizer.highlightCurrent(r, c);
    visualizer.updateConstraints(solver, r, c);
  }

  visualizer.updateStats(metrics.snapshot(solver));

  if (!hasMore) onSolveComplete();
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (isPaused) {
    clearTimeout(animationTimer);
    setButtonState('paused');
    visualizer.showStatus('Paused');
  } else {
    setButtonState('running');
    visualizer.showStatus('Solving…', '#4a9eff');
    tick();
  }
}

function stopSolving() {
  isRunning = false;
  isPaused = false;
  clearTimeout(animationTimer);
  animationTimer = null;
}

async function instantSolve() {
  stopSolving();
  if (!currentPuzzle) return;
  visualizer.showStatus('Solving with backend…');

  try {
    const response = await fetch(`${API_BASE}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid: currentPuzzle })
    });
    if (!response.ok) throw new Error(`Server responded ${response.status}`);
    const result = await response.json();
    if (result.solved) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = visualizer.cells[r][c];
          if (currentPuzzle[r][c] === 0) {
            cell.textContent = result.grid[r][c];
            cell.className = 'cell solved';
          }
        }
      }
      const snap = {
        cellsTried: result.cellsTried,
        backtracks: result.backtracks,
        successRate: result.cellsTried > 0
          ? Math.max(0, ((result.cellsTried - result.backtracks) / result.cellsTried) * 100) : 0,
        elapsed: result.time / 1000,
        steps: result.cellsTried + result.backtracks,
        cellsSolved: result.grid.flat().filter((v, i) => currentPuzzle.flat()[i] === 0 && v !== 0).length,
        remainingEmpty: 0,
        maxDepth: 0
      };
      visualizer.updateStats(snap);
      visualizer.showStatus(`⚡ Backend solved in ${result.time.toFixed(2)}ms`, '#56e89c');
      visualizer.addLog(`⚡ Backend solve: ${result.cellsTried} tries, ${result.backtracks} backtracks, ${result.time.toFixed(2)}ms`, 'solved');
    } else {
      visualizer.showStatus('No solution exists', '#ff6b6b');
      visualizer.addLog('✗ No solution exists for this puzzle', 'failed');
    }
    setButtonState('done');
    return;
  } catch (err) {
    console.warn('Backend solve failed, using local solver.', err);
  }

  const result = solveStaticBacktrack(currentPuzzle);
  if (result.solved) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = visualizer.cells[r][c];
        if (currentPuzzle[r][c] === 0) {
          cell.textContent = result.grid[r][c];
          cell.className = 'cell solved';
        }
      }
    }
    const snap = {
      cellsTried: result.cellsTried,
      backtracks: result.backtracks,
      successRate: result.cellsTried > 0
        ? Math.max(0, ((result.cellsTried - result.backtracks) / result.cellsTried) * 100) : 0,
      elapsed: result.time / 1000,
      steps: result.cellsTried + result.backtracks,
      cellsSolved: result.grid.flat().filter((v, i) => currentPuzzle.flat()[i] === 0 && v !== 0).length,
      remainingEmpty: 0,
      maxDepth: 0
    };
    visualizer.updateStats(snap);
    visualizer.showStatus(`⚡ Local instant solve in ${result.time.toFixed(2)}ms`, '#56e89c');
    visualizer.addLog(`⚡ Local instant solve: ${result.cellsTried} tries, ${result.backtracks} backtracks, ${result.time.toFixed(2)}ms`, 'solved');
  } else {
    visualizer.showStatus('No solution exists', '#ff6b6b');
    visualizer.addLog('✗ No solution exists for this puzzle', 'failed');
  }
  setButtonState('done');
}

function onSolveComplete() {
  stopSolving();
  metrics.stop();
  setButtonState('done');

  const action = solver.lastAction;
  if (solver.isDone) {
    visualizer.showStatus('✓ Solved!', '#56e89c');
    visualizer.addLog(action?.message || '✓ Puzzle solved!', 'solved');
    visualizer.highlightCurrent(-1, -1);
    visualizer.highlightConflicts(null);
  } else {
    visualizer.showStatus('✗ No solution exists', '#ff6b6b');
    visualizer.addLog(action?.message || '✗ No solution found', 'failed');
  }
  visualizer.updateStats(metrics.snapshot(solver));
}

// ─────────────── Manual Input ───────────────

function handleCellClick(r, c) {
  if (isRunning && !isPaused) return;
  selectedCell = [r, c];
  visualizer.highlightGroup(r, c);
  if (solver) visualizer.updateConstraints(solver, r, c);
}

function handleKeyDown(e) {
  const [r, c] = selectedCell;
  if (r < 0) return;
  if (isRunning && !isPaused) return;

  const cell = visualizer.cells[r][c];
  // Check if cell is an original clue to prevent modifying it
  const isOriginal = cell.classList.contains('original');

  if (e.key >= '1' && e.key <= '9') {
    if (!isOriginal) {
      currentPuzzle[r][c] = parseInt(e.key, 10);
      cell.textContent = e.key;
      cell.className = 'cell solved selected';
      solver = new BacktrackingSolver(currentPuzzle);
      resetStats();
      visualizer.updateConstraints(solver, r, c);
      setButtonState('idle');
    }
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    if (!isOriginal) {
      currentPuzzle[r][c] = 0;
      cell.textContent = '';
      cell.className = 'cell selected';
      solver = new BacktrackingSolver(currentPuzzle);
      resetStats();
      visualizer.updateConstraints(solver, r, c);
      setButtonState('idle');
    }
  } else if (e.key === 'ArrowRight' && c < 8) { handleCellClick(r, c + 1); }
  else if (e.key === 'ArrowLeft'  && c > 0) { handleCellClick(r, c - 1); }
  else if (e.key === 'ArrowDown'  && r < 8) { handleCellClick(r + 1, c); }
  else if (e.key === 'ArrowUp'    && r > 0) { handleCellClick(r - 1, c); }
}

// ─────────────── Utilities ───────────────

function checkPuzzle() {
  if (!currentPuzzle) return;
  const result = solveStaticBacktrack(currentPuzzle);
  if (result.solved) {
    visualizer.showStatus('✓ Valid — puzzle has a solution', '#56e89c');
  } else {
    visualizer.showStatus('✗ Invalid — puzzle has no solution', '#ff6b6b');
  }
}

function clearGrid() {
  stopSolving();
  currentPuzzle = Array.from({ length: 9 }, () => Array(9).fill(0));
  solver = new BacktrackingSolver(currentPuzzle);
  visualizer.renderPuzzle(currentPuzzle);
  visualizer.clearLog();
  resetStats();
  currentName = 'Blank Grid';
  updatePuzzleMeta({ name: currentName, difficulty: 'custom' });
  setButtonState('idle');
}

function exportCSV() {
  if (!solver) return;
  const csv = metrics.exportCSV(solver, currentName);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sudoku_metrics.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function setButtonState(state) {
  const solve  = document.getElementById('btn-solve');
  const step   = document.getElementById('btn-step');
  const pause  = document.getElementById('btn-pause');

  if (state === 'running') {
    if (solve) solve.disabled = true;
    if (step) step.disabled  = true;
    if (pause) { pause.disabled = false; pause.textContent = '⏸ Pause'; }
  } else if (state === 'paused') {
    if (solve) solve.disabled = true;
    if (step) step.disabled  = false;
    if (pause) { pause.disabled = false; pause.textContent = '▶ Resume'; }
  } else if (state === 'idle' || state === 'done') {
    if (solve) solve.disabled = false;
    if (step) step.disabled  = false;
    if (pause) { pause.disabled = true; pause.textContent = '⏸ Pause'; }
  }
}

// ─────────────── Comparison Modal ───────────────

function openComparison() {
  document.getElementById('comparison-modal').classList.remove('hidden');
}
function closeComparison() {
  document.getElementById('comparison-modal').classList.add('hidden');
}

function runComparison() {
  const puzzleChoice = document.getElementById('comparison-puzzle').value;
  const puzzles = puzzleChoice === 'all' ? PUZZLES.filter(p => p.difficulty !== 'unsolvable') : [{ name: currentName, grid: currentPuzzle }];

  const resultsEl = document.getElementById('comparison-results');
  resultsEl.innerHTML = '<p style="color:#8892a4">Running comparison…</p>';

  setTimeout(() => {
    const rows = puzzles.map(pz => {
      const btSolver  = new BacktrackingSolver(pz.grid);
      const t0bt = performance.now();
      const btRes = solveStaticBacktrack(pz.grid);

      const ac3Solver = new AC3Solver(pz.grid);
      const ac3Res = ac3Solver.solve();

      return { name: pz.name || pz.id, bt: btRes, ac3: ac3Res };
    });

    // Table
    let html = `<table class="comparison-table">
      <thead><tr>
        <th>Puzzle</th>
        <th>BT Time</th><th>AC3 Time</th>
        <th>BT Backtracks</th><th>AC3 Backtracks</th>
        <th>BT Cells Tried</th><th>AC3 Cells Tried</th>
        <th>Speedup</th>
      </tr></thead><tbody>`;

    rows.forEach(r => {
      const speedup = r.bt.time > 0 ? (r.bt.time / Math.max(r.ac3.time, 0.001)).toFixed(1) + 'x' : 'N/A';
      html += `<tr>
        <td>${r.name}</td>
        <td>${r.bt.time.toFixed(2)}ms</td>
        <td>${r.ac3.time.toFixed(2)}ms</td>
        <td>${r.bt.backtracks.toLocaleString()}</td>
        <td>${(r.ac3.backtracks || 0).toLocaleString()}</td>
        <td>${r.bt.cellsTried.toLocaleString()}</td>
        <td>${(r.ac3.cellsTried || 0).toLocaleString()}</td>
        <td style="color:${+speedup > 1 ? '#56e89c' : '#ff6b6b'}">${speedup}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    resultsEl.innerHTML = html;

    // Draw chart for last puzzle (or aggregated first)
    const chartEl = document.getElementById('comparison-chart');
    visualizer.drawComparisonChart(chartEl, {
      bt:  rows[rows.length - 1].bt,
      ac3: rows[rows.length - 1].ac3
    });
  }, 20);
}

// ─────────────── Predefined Modal ───────────────

function openPredefined() {
  const modal = document.getElementById('predefined-modal');
  const list  = document.getElementById('predefined-list');
  list.innerHTML = '';
  PUZZLES.forEach(pz => {
    const item = document.createElement('div');
    item.className = 'predefined-item';
    const emptyCount = pz.grid.flat().filter(v => v === 0).length;
    item.innerHTML = `
      <h4>${pz.name}</h4>
      <span class="difficulty-badge badge-${pz.difficulty}">${pz.difficulty.toUpperCase()}</span>
      <p style="font-size:0.8rem;color:#8892a4;margin-top:4px">${emptyCount} empty cells</p>`;
    item.addEventListener('click', () => {
      loadPuzzle(pz);
      closePredefined();
    });
    list.appendChild(item);
  });
  modal.classList.remove('hidden');
}
function closePredefined() {
  document.getElementById('predefined-modal').classList.add('hidden');
}

// ─────────────── Image Upload ───────────────

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = '🔄 Processing image...';
  statusEl.style.color = '#4a9eff';
  console.log('[IMAGE UPLOAD] File:', file.name, file.size, 'bytes');

  const formData = new FormData();
  formData.append('image', file);

  try {
    console.log('[IMAGE UPLOAD] Sending to /api/check_image');
    const response = await fetch(`${API_BASE}/check_image`, {
      method: 'POST',
      body: formData
    });

    console.log('[IMAGE UPLOAD] Response status:', response.status);
    const result = await response.json();
    console.log('[IMAGE UPLOAD] Response data:', result);

    if (result.solved) {
      statusEl.textContent = '✅ ' + result.message;
      statusEl.style.color = '#56e89c';
      loadPuzzle({ grid: result.grid, name: 'Solved from Image' });
      document.getElementById('stat-cells-tried').textContent = result.cellsTried;
      document.getElementById('stat-backtracks').textContent = result.backtracks;
      document.getElementById('stat-time').textContent = `${result.time.toFixed(2)}ms`;
    } else {
      const msg = result.message || 'Unknown error';
      statusEl.textContent = '❌ ' + msg;
      statusEl.style.color = '#ff6b6b';
      console.error('[IMAGE UPLOAD] Failed:', msg);
    }
  } catch (err) {
    statusEl.textContent = '⚠️ ' + (err.message || 'Error processing');
    statusEl.style.color = '#ff6b6b';
    console.error('[IMAGE UPLOAD] Exception:', err);
  }
}
