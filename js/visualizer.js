// visualizer.js - DOM rendering and animation for the Sudoku grid

class Visualizer {
  constructor(gridEl, statsEl, constraintsEl, logEl) {
    this.gridEl = gridEl;
    this.statsEl = statsEl;
    this.constraintsEl = constraintsEl;
    this.logEl = logEl;
    this.cells = [];
    this.maxLogEntries = 500;
    this.logEntries = 0;
    this._flashTimers = new Map();
  }

  // Build the 9×9 cell grid
  buildGrid(onCellClick) {
    this.gridEl.innerHTML = '';
    this.cells = [];
    for (let r = 0; r < 9; r++) {
      this.cells[r] = [];
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => onCellClick(r, c));
        this.gridEl.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }
  }

  // Render an initial puzzle (clears all state classes)
  renderPuzzle(puzzle) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.cells[r][c];
        cell.className = 'cell';
        if (puzzle[r][c] !== 0) {
          cell.textContent = puzzle[r][c];
          cell.classList.add('original');
        } else {
          cell.textContent = '';
        }
      }
    }
  }

  // Apply a solver step to the grid
  applyStep(action, useAnimations) {
    if (!action) return;

    const { type, row, col, num } = action;

    if (type === 'place') {
      const cell = this.cells[row][col];
      cell.textContent = num;
      this._setClass(cell, 'solved', useAnimations ? 'valid-flash' : null, 400);
    } else if (type === 'invalid') {
      if (useAnimations) {
        const cell = this.cells[row][col];
        cell.textContent = num;
        this._setClass(cell, '', 'invalid-flash', 250);
        setTimeout(() => { if (!cell.textContent || cell.textContent == num) cell.textContent = ''; }, 250);
      }
    } else if (type === 'backtrack') {
      const cell = this.cells[row][col];
      cell.textContent = '';
      this._setClass(cell, '', useAnimations ? 'backtrack-flash' : null, 350);
    }
    // solved/failed handled by main.js
  }

  // Highlight the current cell being attempted
  highlightCurrent(row, col) {
    // Clear previous current
    this.gridEl.querySelectorAll('.current').forEach(el => el.classList.remove('current'));
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      this.cells[row][col].classList.add('current');
    }
  }

  // Highlight conflict cells in red
  highlightConflicts(conflicts) {
    this.gridEl.querySelectorAll('.conflict').forEach(el => el.classList.remove('conflict'));
    if (!conflicts) return;
    for (const positions of Object.values(conflicts)) {
      for (const [r, c] of positions) {
        this.cells[r][c].classList.add('conflict');
      }
    }
  }

  // Highlight same row/col/box as selected cell
  highlightGroup(row, col) {
    this.gridEl.querySelectorAll('.same-group, .selected').forEach(el => {
      el.classList.remove('same-group', 'selected');
    });
    if (row < 0) return;
    this.cells[row][col].classList.add('selected');
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (r === row && c === col) continue;
        if (r === row || c === col ||
            (r >= br && r < br + 3 && c >= bc && c < bc + 3)) {
          this.cells[r][c].classList.add('same-group');
        }
      }
    }
  }

  // Update stats panel
  updateStats(snap) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-cells-tried', snap.cellsTried.toLocaleString());
    set('stat-backtracks', snap.backtracks.toLocaleString());
    set('stat-success-rate', snap.successRate.toFixed(1) + '%');
    set('stat-time', snap.elapsed.toFixed(2) + 's');
    set('stat-steps', snap.steps.toLocaleString());
    set('stat-cells-solved', snap.cellsSolved);
    set('stat-remaining', snap.remainingEmpty);
    set('stat-depth', snap.maxDepth);
  }

  // Update constraint analysis panel
  updateConstraints(solver, row, col) {
    if (!this.constraintsEl) return;
    if (row < 0) {
      document.getElementById('current-cell-info').textContent = 'Select a cell or start solving';
      document.getElementById('candidates-display').innerHTML = '';
      document.getElementById('conflicts-display').innerHTML = '';
      return;
    }

    const val = solver.grid[row][col];
    const info = document.getElementById('current-cell-info');
    info.innerHTML = `Cell <strong>(${row + 1}, ${col + 1})</strong> — ${val !== 0 ? `value: ${val}` : 'empty'}`;

    const candidatesEl = document.getElementById('candidates-display');
    candidatesEl.innerHTML = '';
    if (val === 0) {
      const rowInvalid = new Set(solver.getInvalidInRow(row));
      const colInvalid = new Set(solver.getInvalidInCol(col));
      const boxInvalid = new Set(solver.getInvalidInBox(row, col));
      for (let n = 1; n <= 9; n++) {
        const span = document.createElement('span');
        const isInvalid = rowInvalid.has(n) || colInvalid.has(n) || boxInvalid.has(n);
        span.className = `candidate-num ${isInvalid ? 'candidate-invalid' : 'candidate-valid'}`;
        span.textContent = n;
        const reasons = [];
        if (rowInvalid.has(n)) reasons.push('row');
        if (colInvalid.has(n)) reasons.push('col');
        if (boxInvalid.has(n)) reasons.push('box');
        if (reasons.length) span.title = `Blocked by ${reasons.join(', ')}`;
        candidatesEl.appendChild(span);
      }
    }

    const conflictsEl = document.getElementById('conflicts-display');
    if (val === 0) {
      const ri = solver.getInvalidInRow(row);
      const ci = solver.getInvalidInCol(col);
      const bi = solver.getInvalidInBox(row, col);
      conflictsEl.innerHTML =
        `<div class="conflict-row">Row used: [${ri.join(', ')}]</div>` +
        `<div class="conflict-row">Col used: [${ci.join(', ')}]</div>` +
        `<div class="conflict-row">Box used: [${bi.join(', ')}]</div>` +
        `<div>Candidates: [${solver.getCandidates(row, col).join(', ')}]</div>`;
    } else {
      conflictsEl.innerHTML = '';
    }
  }

  // Append a line to the steps log
  addLog(message, type) {
    if (this.logEntries > this.maxLogEntries) return;
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.textContent = message;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
    this.logEntries++;
    if (this.logEntries === this.maxLogEntries) {
      const note = document.createElement('div');
      note.className = 'log-entry';
      note.style.color = '#8892a4';
      note.textContent = '... log capped at 500 entries for performance ...';
      this.logEl.appendChild(note);
    }
  }

  clearLog() {
    this.logEl.innerHTML = '';
    this.logEntries = 0;
  }

  showStatus(msg, color = '#e1e4e8') {
    const el = document.getElementById('status-message');
    if (el) { el.textContent = msg; el.style.color = color; }
  }

  // Draw comparison bar chart on canvas
  drawComparisonChart(canvasEl, results) {
    const ctx = canvasEl.getContext('2d');
    const W = canvasEl.width, H = canvasEl.height;
    ctx.clearRect(0, 0, W, H);

    const metrics = ['Time (ms)', 'Backtracks', 'Cells Tried'];
    const getMetricVal = (r, m) => {
      if (m === 'Time (ms)') return r ? +(r.time || 0).toFixed(2) : 0;
      if (m === 'Backtracks') return r ? (r.backtracks || 0) : 0;
      if (m === 'Cells Tried') return r ? (r.cellsTried || 0) : 0;
    };

    const barW = 40, groupGap = 80, topPad = 40, botPad = 60, leftPad = 60;
    const btColor = '#4a9eff';
    const ac3Color = '#56e89c';

    // Background
    ctx.fillStyle = '#252836';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#e1e4e8';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Backtracking vs AC-3 Comparison', W / 2, 22);

    // Legend
    ctx.fillStyle = btColor;
    ctx.fillRect(W / 2 - 120, 32, 14, 12);
    ctx.fillStyle = '#e1e4e8';
    ctx.font = '11px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText('Pure Backtracking', W / 2 - 102, 43);
    ctx.fillStyle = ac3Color;
    ctx.fillRect(W / 2 + 30, 32, 14, 12);
    ctx.fillStyle = '#e1e4e8';
    ctx.fillText('AC-3 + Backtracking', W / 2 + 48, 43);

    const chartH = H - topPad - botPad;
    const groupW = barW * 2 + 10;
    const totalGroupW = groupW + groupGap;

    metrics.forEach((metric, mi) => {
      const btVal = getMetricVal(results.bt, metric);
      const ac3Val = getMetricVal(results.ac3, metric);
      const maxVal = Math.max(btVal, ac3Val, 1);

      const gx = leftPad + mi * totalGroupW;

      // BT bar
      const btH = (btVal / maxVal) * chartH;
      ctx.fillStyle = btColor;
      ctx.fillRect(gx, topPad + chartH - btH, barW, btH);
      ctx.fillStyle = '#e1e4e8';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(btVal > 999 ? (btVal / 1000).toFixed(1) + 'k' : btVal,
        gx + barW / 2, topPad + chartH - btH - 4);

      // AC3 bar
      const ac3H = (ac3Val / maxVal) * chartH;
      ctx.fillStyle = ac3Color;
      ctx.fillRect(gx + barW + 10, topPad + chartH - ac3H, barW, ac3H);
      ctx.fillStyle = '#e1e4e8';
      ctx.fillText(ac3Val > 999 ? (ac3Val / 1000).toFixed(1) + 'k' : ac3Val,
        gx + barW + 10 + barW / 2, topPad + chartH - ac3H - 4);

      // Metric label
      ctx.fillStyle = '#8892a4';
      ctx.font = '11px Segoe UI';
      ctx.fillText(metric, gx + groupW / 2, H - 10);
    });

    // Baseline
    ctx.strokeStyle = '#3a3d4a';
    ctx.beginPath();
    ctx.moveTo(leftPad - 10, topPad + chartH);
    ctx.lineTo(W - 20, topPad + chartH);
    ctx.stroke();
  }

  // Apply a class, optionally with a flash class that fades away
  _setClass(cell, persistClass, flashClass, flashDuration) {
    const key = `${cell.dataset.row}-${cell.dataset.col}`;
    if (this._flashTimers.has(key)) {
      clearTimeout(this._flashTimers.get(key));
      this._flashTimers.delete(key);
    }
    // Remove state classes
    cell.classList.remove('solved', 'current', 'trying', 'valid-flash', 'invalid-flash', 'backtrack-flash');
    if (flashClass) {
      cell.classList.add(flashClass);
      const t = setTimeout(() => {
        cell.classList.remove(flashClass);
        if (persistClass) cell.classList.add(persistClass);
        this._flashTimers.delete(key);
      }, flashDuration);
      this._flashTimers.set(key, t);
    } else if (persistClass) {
      cell.classList.add(persistClass);
    }
  }
}
