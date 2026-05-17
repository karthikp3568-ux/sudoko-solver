// Iterative backtracking — step-by-step for real-time visualization

export class BacktrackingSolver {
  constructor(puzzle) {
    this.original = puzzle.map(r => [...r]);
    this.grid     = puzzle.map(r => [...r]);
    this._empties = [];
    this._tryNums = [];
    this._pos     = 0;
    this.isDone      = false;
    this.isSolvable  = true;
    this.lastAction  = null;
    this.metrics     = { nodes: 0, backtracks: 0, constraintChecks: 0, maxDepth: 0, time: 0 };
    this._t0 = null;

    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] === 0) { this._empties.push([r, c]); this._tryNums.push(1); }

    this.totalEmpty = this._empties.length;
  }

  start() { this._t0 = performance.now(); }

  _valid(r, c, n) {
    for (let i = 0; i < 9; i++) {
      this.metrics.constraintChecks++;
      if (this.grid[r][i] === n || this.grid[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++) {
        this.metrics.constraintChecks++;
        if (this.grid[br + dr][bc + dc] === n) return false;
      }
    return true;
  }

  _conflicts(r, c, n) {
    const out = [];
    for (let i = 0; i < 9; i++) {
      if (this.grid[r][i] === n) out.push([r, i]);
      if (this.grid[i][c] === n) out.push([i, c]);
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        if (this.grid[br + dr][bc + dc] === n) out.push([br + dr, bc + dc]);
    return out;
  }

  step() {
    if (this.isDone || !this.isSolvable) return false;

    if (this._pos >= this._empties.length) {
      this.isDone = true;
      this.metrics.time = (performance.now() - this._t0) / 1000;
      this.lastAction = {
        type: 'solved',
        message: `✓ Solved — ${this.metrics.nodes} nodes, ${this.metrics.backtracks} backtracks`,
        explanation: 'All cells filled with valid values. Puzzle solved!',
      };
      return false;
    }

    if (this._pos < 0) {
      this.isSolvable = false;
      this.metrics.time = (performance.now() - this._t0) / 1000;
      this.lastAction = { type: 'failed', message: '✗ No solution exists', explanation: 'Exhausted all possibilities.' };
      return false;
    }

    const [r, c] = this._empties[this._pos];
    const n = this._tryNums[this._pos];
    if (this._pos > this.metrics.maxDepth) this.metrics.maxDepth = this._pos;

    if (n > 9) {
      // Dead end — backtrack
      this.grid[r][c] = 0;
      this._tryNums[this._pos] = 1;
      this._pos--;
      this.metrics.backtracks++;
      this.lastAction = {
        type: 'backtrack', row: r, col: c,
        message: `↩ Backtrack (${r + 1},${c + 1}) — all digits exhausted`,
        explanation: `No valid digit exists at row ${r + 1}, col ${c + 1}. Undoing last placement.`,
      };
    } else {
      this.metrics.nodes++;
      if (this._valid(r, c, n)) {
        this.grid[r][c] = n;
        this._tryNums[this._pos]++;
        this._pos++;
        this.lastAction = {
          type: 'place', row: r, col: c, num: n,
          message: `✓ Place ${n} → (${r + 1},${c + 1})`,
          explanation: `${n} is valid at (${r + 1},${c + 1}) — no conflict in row, column, or box.`,
        };
      } else {
        const conflicts = this._conflicts(r, c, n);
        const zone = conflicts.length
          ? (conflicts[0][0] === r ? 'row' : conflicts[0][1] === c ? 'column' : 'box')
          : 'constraint';
        this._tryNums[this._pos]++;
        this.lastAction = {
          type: 'invalid', row: r, col: c, num: n, conflicts,
          message: `✗ ${n} invalid at (${r + 1},${c + 1}) — ${zone} conflict`,
          explanation: `${n} already appears in the ${zone} containing (${r + 1},${c + 1}).`,
        };
      }
    }
    return true;
  }

  getGrid()    { return this.grid.map(r => [...r]); }
  getProgress(){ return this._pos / this.totalEmpty; }
}
