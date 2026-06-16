// AC-3 Constraint Propagation + Backtracking with MRV heuristic
// Steps are pre-computed then replayed for visualization.

function neighbors(r, c) {
  const s = new Set();
  for (let i = 0; i < 9; i++) {
    if (i !== c) s.add(`${r},${i}`);
    if (i !== r) s.add(`${i},${c}`);
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if (!(br + dr === r && bc + dc === c)) s.add(`${br + dr},${bc + dc}`);
  return [...s];
}

function runAC3(domains, steps) {
  const queue = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      for (const nk of neighbors(r, c)) queue.push([`${r},${c}`, nk]);

  while (queue.length) {
    const [xi, xj] = queue.shift();
    const removed = [];
    for (const x of [...domains[xi]]) {
      if ([...domains[xj]].every(y => y === x)) { domains[xi].delete(x); removed.push(x); }
    }
    if (!removed.length) continue;

    const [r, c] = xi.split(',').map(Number);
    const [rj, cj] = xj.split(',').map(Number);
    steps.push({
      type: 'propagate',
      fromCell: [rj, cj], toCell: [r, c],
      eliminated: removed, domainSize: domains[xi].size,
      message: `AC-3 ✂ Removed [${removed}] from (${r + 1},${c + 1}) via (${rj + 1},${cj + 1})`,
      explanation: `Domain of (${r + 1},${c + 1}) shrunk to {${[...domains[xi]].join(',')}} — constraint from (${rj + 1},${cj + 1}).`,
    });

    if (domains[xi].size === 0) {
      steps.push({ type: 'failed', message: '✗ Domain wipeout — no solution', explanation: `Cell (${r + 1},${c + 1}) has no remaining candidates.` });
      return false;
    }
    for (const xk of neighbors(r, c)) if (xk !== xj) queue.push([xk, xi]);
  }
  return true;
}

function btMRV(grid, domains, steps) {
  // MRV: pick unassigned cell with smallest domain
  let minSz = 10, mr = -1, mc = -1;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0) {
        const sz = domains[`${r},${c}`].size;
        if (sz < minSz) { minSz = sz; mr = r; mc = c; }
      }

  if (mr === -1) {
    steps.push({ type: 'solved', grid: grid.map(r => [...r]), message: '✓ Solved via AC-3+MRV!', explanation: 'Exact cover found — all constraints satisfied.' });
    return true;
  }

  steps.push({
    type: 'mrv_select', row: mr, col: mc, domainSize: minSz,
    message: `MRV → (${mr + 1},${mc + 1}) — ${minSz} candidate${minSz !== 1 ? 's' : ''}`,
    explanation: `MRV picks the most constrained cell. (${mr + 1},${mc + 1}) has domain {${[...domains[`${mr},${mc}`]].join(',')}}.`,
  });

  for (const num of [...domains[`${mr},${mc}`]]) {
    // Consistency check
    let ok = true;
    for (const nk of neighbors(mr, mc)) {
      const [nr, nc] = nk.split(',').map(Number);
      if (grid[nr][nc] === num) { ok = false; break; }
    }
    if (!ok) {
      steps.push({ type: 'invalid', row: mr, col: mc, num, message: `✗ ${num} conflicts at (${mr + 1},${mc + 1})`, explanation: `${num} already present in a neighboring cell.` });
      continue;
    }

    const ng = grid.map(r => [...r]);
    ng[mr][mc] = num;
    const nd = {};
    for (const k of Object.keys(domains)) nd[k] = new Set(domains[k]);
    nd[`${mr},${mc}`] = new Set([num]);

    steps.push({
      type: 'place', row: mr, col: mc, num,
      message: `▶ Place ${num} at (${mr + 1},${mc + 1})`,
      explanation: `Assigning ${num} to (${mr + 1},${mc + 1}) — propagating constraints via AC-3.`,
    });

    if (runAC3(nd, steps) && btMRV(ng, nd, steps)) return true;

    steps.push({
      type: 'backtrack', row: mr, col: mc,
      message: `↩ Backtrack from (${mr + 1},${mc + 1})`,
      explanation: `Assigning ${num} led to a contradiction. Trying next candidate.`,
    });
  }
  return false;
}

export class AC3Solver {
  constructor(puzzle) {
    this.original = puzzle.map(r => [...r]);
    this.isDone     = false;
    this.isSolvable = true;
    this.lastAction = null;
    this.metrics    = { nodes: 0, backtracks: 0, constraintReductions: 0, maxDepth: 0, time: 0 };
    this._t0        = null;
    this._steps     = [];
    this._idx       = 0;
    this._grid      = null;

    // Pre-compute all steps
    const domains = {};
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        domains[`${r},${c}`] = puzzle[r][c] ? new Set([puzzle[r][c]]) : new Set([1,2,3,4,5,6,7,8,9]);

    const ok = runAC3(domains, this._steps);
    if (ok) {
      // Assign forced singles one-by-one as individual step actions
      const g = puzzle.map(r => [...r]);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (g[r][c] === 0 && domains[`${r},${c}`].size === 1) {
            const num = [...domains[`${r},${c}`]][0];
            g[r][c] = num;
            this._steps.push({
              type: 'place',
              row: r,
              col: c,
              num,
              message: `▶ AC-3 places forced single ${num} at (${r + 1},${c + 1})`,
              explanation: `${num} is the only remaining candidate for cell (${r + 1},${c + 1}) after constraint propagation.`,
            });
          }
        }
      }

      this._steps.push({
        type: 'ac3_complete',
        grid: g.map(r => [...r]),
        message: '✓ AC-3 propagation done — starting MRV backtracking',
        explanation: 'Initial constraint propagation eliminated many candidates. Switching to guided search.',
      });
      btMRV(g, domains, this._steps);
    }
    this.totalSteps = this._steps.length;
  }

  start() { this._t0 = performance.now(); }

  step() {
    if (this._idx >= this._steps.length) { this.isDone = true; return false; }
    this.lastAction = this._steps[this._idx++];

    const t = this.lastAction.type;
    if (t === 'solved')     { this.isDone = true; this._grid = this.lastAction.grid; this.metrics.time = (performance.now() - this._t0) / 1000; }
    else if (t === 'failed') { this.isDone = true; this.isSolvable = false; }
    else if (t === 'propagate') { this.metrics.constraintReductions += this.lastAction.eliminated.length; }
    else if (t === 'place')  { this.metrics.nodes++; }
    else if (t === 'backtrack') { this.metrics.backtracks++; }

    return this._idx < this._steps.length && !this.isDone;
  }

  getGrid() {
    if (this._grid) return this._grid;
    // Rebuild from steps
    const g = this.original.map(r => [...r]);
    const stack = [];
    for (let i = 0; i < this._idx; i++) {
      const s = this._steps[i];
      if (s.type === 'ac3_complete' && s.grid) s.grid.forEach((row, r) => row.forEach((v, c) => { g[r][c] = v; }));
      else if (s.type === 'place') { stack.push([s.row, s.col, g[s.row][s.col]]); g[s.row][s.col] = s.num; }
      else if (s.type === 'backtrack' && stack.length) { const [pr, pc, pv] = stack.pop(); g[pr][pc] = pv; }
    }
    return g;
  }

  getProgress() { return this.totalSteps ? this._idx / this.totalSteps : 0; }
}
