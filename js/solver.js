// solver.js - Iterative backtracking solver enabling step-by-step visualization

class BacktrackingSolver {
  constructor(puzzle) {
    this.grid = puzzle.map(row => [...row]);
    this.original = puzzle.map(row => [...row]);
    this.emptyList = [];
    this.pos = 0;
    this.tryNums = [];
    this.isDone = false;
    this.isSolvable = true;
    this.lastAction = null;

    this.metrics = {
      cellsTried: 0,
      backtracks: 0,
      steps: 0,
      maxDepth: 0,
      startTime: null,
      endTime: null
    };

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] === 0) {
          this.emptyList.push([r, c]);
          this.tryNums.push(1);
        }
      }
    }
    this.totalEmpty = this.emptyList.length;
  }

  isValid(row, col, num) {
    for (let c = 0; c < 9; c++) {
      if (this.grid[row][c] === num) return false;
    }
    for (let r = 0; r < 9; r++) {
      if (this.grid[r][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (this.grid[r][c] === num) return false;
      }
    }
    return true;
  }

  getConflictInfo(row, col, num) {
    const rowC = [], colC = [], boxC = [];
    for (let c = 0; c < 9; c++) {
      if (this.grid[row][c] === num) rowC.push([row, c]);
    }
    for (let r = 0; r < 9; r++) {
      if (this.grid[r][col] === num) colC.push([r, col]);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (this.grid[r][c] === num) boxC.push([r, c]);
      }
    }
    return { row: rowC, col: colC, box: boxC };
  }

  getCandidates(row, col) {
    const used = new Set();
    for (let c = 0; c < 9; c++) used.add(this.grid[row][c]);
    for (let r = 0; r < 9; r++) used.add(this.grid[r][col]);
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) used.add(this.grid[r][c]);
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
  }

  getInvalidInRow(row) {
    return [...new Set([...Array(9).keys()].map(c => this.grid[row][c]).filter(v => v !== 0))];
  }

  getInvalidInCol(col) {
    return [...new Set([...Array(9).keys()].map(r => this.grid[r][col]).filter(v => v !== 0))];
  }

  getInvalidInBox(row, col) {
    const used = new Set();
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (this.grid[r][c] !== 0) used.add(this.grid[r][c]);
      }
    }
    return [...used];
  }

  // Advance one step; returns true if more steps remain
  step() {
    if (this.isDone || !this.isSolvable) return false;

    if (this.pos >= this.emptyList.length) {
      this.isDone = true;
      this.metrics.endTime = performance.now();
      this.lastAction = { type: 'solved', message: `✓ Solved in ${this.metrics.steps} steps, ${this.metrics.backtracks} backtracks` };
      return false;
    }

    if (this.pos < 0) {
      this.isSolvable = false;
      this.metrics.endTime = performance.now();
      this.lastAction = { type: 'failed', message: '✗ No solution exists for this puzzle' };
      return false;
    }

    this.metrics.steps++;
    if (this.pos > this.metrics.maxDepth) this.metrics.maxDepth = this.pos;

    const [row, col] = this.emptyList[this.pos];
    const num = this.tryNums[this.pos];

    if (num > 9) {
      // All 1–9 tried at this position — backtrack
      this.grid[row][col] = 0;
      this.tryNums[this.pos] = 1;
      this.pos--;
      this.metrics.backtracks++;
      this.lastAction = {
        type: 'backtrack',
        row, col,
        message: `Step ${this.metrics.steps}: Dead end at (${row + 1},${col + 1}) — BACKTRACKING`
      };
    } else {
      this.metrics.cellsTried++;
      if (this.isValid(row, col, num)) {
        this.grid[row][col] = num;
        this.tryNums[this.pos]++;
        this.pos++;
        this.lastAction = {
          type: 'place',
          row, col, num,
          message: `Step ${this.metrics.steps}: Placed ${num} at (${row + 1},${col + 1}) — VALID`
        };
      } else {
        const conflicts = this.getConflictInfo(row, col, num);
        const reason = conflicts.row.length > 0 ? 'row conflict'
          : conflicts.col.length > 0 ? 'col conflict' : 'box conflict';
        this.tryNums[this.pos]++;
        this.lastAction = {
          type: 'invalid',
          row, col, num,
          conflicts,
          reason,
          message: `Step ${this.metrics.steps}: Trying ${num} at (${row + 1},${col + 1}) — INVALID (${reason})`
        };
      }
    }

    return true;
  }

  getCellsSolved() {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c] !== 0 && this.original[r][c] === 0) count++;
      }
    }
    return count;
  }

  getRemainingEmpty() {
    return this.emptyList.length - Math.max(0, this.pos);
  }

  getSuccessRate() {
    if (this.metrics.cellsTried === 0) return 0;
    const successes = this.metrics.cellsTried - this.metrics.backtracks;
    return Math.max(0, (successes / this.metrics.cellsTried) * 100);
  }
}

// Fast recursive solver for comparison and generation (no visualization overhead)
function solveStaticBacktrack(puzzle) {
  const grid = puzzle.map(r => [...r]);
  let cellsTried = 0;
  let backtracks = 0;

  function isValid(r, c, n) {
    for (let i = 0; i < 9; i++) if (grid[r][i] === n || grid[i][c] === n) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      if (grid[br + dr][bc + dc] === n) return false;
    }
    return true;
  }

  function bt() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        for (let n = 1; n <= 9; n++) {
          cellsTried++;
          if (isValid(r, c, n)) {
            grid[r][c] = n;
            if (bt()) return true;
            grid[r][c] = 0;
            backtracks++;
          }
        }
        return false;
      }
    }
    return true;
  }

  const t0 = performance.now();
  const solved = bt();
  return { solved, grid, time: performance.now() - t0, cellsTried, backtracks };
}

// Count solutions (up to `limit`) for uniqueness checking
function countSolutions(puzzle, limit = 2) {
  const grid = puzzle.map(r => [...r]);
  let count = 0;

  function isValid(r, c, n) {
    for (let i = 0; i < 9; i++) if (grid[r][i] === n || grid[i][c] === n) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      if (grid[br + dr][bc + dc] === n) return false;
    }
    return true;
  }

  function bt() {
    if (count >= limit) return;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        for (let n = 1; n <= 9; n++) {
          if (isValid(r, c, n)) {
            grid[r][c] = n;
            bt();
            grid[r][c] = 0;
            if (count >= limit) return;
          }
        }
        return;
      }
    }
    count++;
  }

  bt();
  return count;
}
