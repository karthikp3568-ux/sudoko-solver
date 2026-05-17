// Dancing Links (Algorithm X / Exact Cover) — pre-computed steps for visualization

// Sudoku exact cover encoding:
//   Columns: 324 = 81 (cell) + 81 (row-digit) + 81 (col-digit) + 81 (box-digit)
//   Rows: 729 = 81 cells × 9 digits

const N = 9;
const NCOLS = 324; // 81+81+81+81
const NROWS = 729; // 81*9

function colIdx(type, a, b) {
  // type 0: cell(r,c)  type 1: row(r,d)  type 2: col(c,d)  type 3: box(b,d)
  return type * 81 + a * 9 + b;
}

function buildMatrix(puzzle) {
  // sparse row representation: each row is { rowId, cols: [c0,c1,c2,c3] }
  const rows = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const given = puzzle[r][c];
      for (let d = 1; d <= N; d++) {
        if (given && given !== d) continue;
        rows.push({
          r, c, d, box,
          cols: [
            colIdx(0, r, c),
            colIdx(1, r, d - 1),
            colIdx(2, c, d - 1),
            colIdx(3, box, d - 1),
          ],
        });
      }
    }
  }
  return rows;
}

// Lightweight exact-cover solver that records visualization steps
function solve(puzzle, steps) {
  const rows = buildMatrix(puzzle);

  // colCount[j] = number of uncovered rows satisfying column j
  const colCount = new Int32Array(NCOLS);
  const colCovered = new Uint8Array(NCOLS);

  // For each column, which rows cover it
  const colToRows = Array.from({ length: NCOLS }, () => []);
  for (let i = 0; i < rows.length; i++) {
    for (const j of rows[i].cols) {
      colToRows[j].push(i);
      colCount[j]++;
    }
  }

  const rowCovered = new Uint8Array(rows.length);
  const chosen = []; // stack of chosen row indices
  const grid = puzzle.map(r => [...r]);

  // Cover/uncover helpers
  function cover(col) {
    colCovered[col] = 1;
    for (const ri of colToRows[col]) {
      if (rowCovered[ri]) continue;
      rowCovered[ri] = 1;
      for (const j of rows[ri].cols) {
        if (!colCovered[j]) colCount[j]--;
      }
    }
  }

  function uncover(col) {
    colCovered[col] = 0;
    for (const ri of colToRows[col]) {
      if (!rowCovered[ri]) continue; // was covered by this column selection
      const coveredBySelf = rows[ri].cols.includes(col);
      if (!coveredBySelf) continue;
      rowCovered[ri] = 0;
      for (const j of rows[ri].cols) {
        if (!colCovered[j]) colCount[j]++;
      }
    }
  }

  // Better cover/uncover: track which rows were newly covered
  function coverCol(col) {
    colCovered[col] = 1;
    const newly = [];
    for (const ri of colToRows[col]) {
      if (rowCovered[ri]) continue;
      rowCovered[ri] = 1;
      newly.push(ri);
      for (const j of rows[ri].cols) if (!colCovered[j]) colCount[j]--;
    }
    return newly;
  }

  function uncoverCol(col, newly) {
    colCovered[col] = 0;
    for (const ri of newly) {
      rowCovered[ri] = 0;
      for (const j of rows[ri].cols) if (!colCovered[j]) colCount[j]++;
    }
  }

  // Recursive DLX with step recording
  function dlx(depth) {
    // Check for solution
    let allCovered = true;
    for (let j = 0; j < NCOLS; j++) {
      if (!colCovered[j]) { allCovered = false; break; }
    }
    if (allCovered) {
      steps.push({
        type: 'solved',
        grid: grid.map(r => [...r]),
        message: '✓ Exact cover found — puzzle solved!',
        explanation: 'All 324 constraints satisfied simultaneously. Dancing Links found an exact cover.',
      });
      return true;
    }

    // Choose column with minimum count (S heuristic)
    let minCount = Infinity, chosenCol = -1;
    for (let j = 0; j < NCOLS; j++) {
      if (!colCovered[j] && colCount[j] < minCount) {
        minCount = colCount[j];
        chosenCol = j;
      }
    }

    if (minCount === 0) {
      steps.push({
        type: 'dead_end',
        col: chosenCol,
        message: `✗ Dead end — column ${chosenCol} has 0 candidates`,
        explanation: `No row can satisfy constraint column ${chosenCol}. Backtracking.`,
      });
      return false;
    }

    const colType = Math.floor(chosenCol / 81);
    const colNames = ['Cell', 'Row-digit', 'Col-digit', 'Box-digit'];
    const a = Math.floor((chosenCol % 81) / 9);
    const b = (chosenCol % 81) % 9;

    steps.push({
      type: 'cover',
      col: chosenCol, colCount: minCount,
      message: `DLX covers column ${colNames[colType]}(${a + 1},${b + 1}) — ${minCount} option${minCount !== 1 ? 's' : ''}`,
      explanation: `S-heuristic selects the constraint with fewest satisfying rows. Column ${chosenCol} (${colNames[colType]}) has ${minCount} candidate(s).`,
    });

    // Try each row that covers this column
    const candidateRows = colToRows[chosenCol].filter(ri => !rowCovered[ri]);

    // Cover the chosen column
    const mainNewly = coverCol(chosenCol);

    for (const ri of candidateRows) {
      const row = rows[ri];

      steps.push({
        type: 'select',
        row: row.r, col: row.c, num: row.d, depth,
        message: `▶ DLX selects digit ${row.d} at (${row.r + 1},${row.c + 1})`,
        explanation: `Row ${ri} satisfies column ${chosenCol}. Placing ${row.d} at (${row.r + 1},${row.c + 1}) and covering 3 more constraints.`,
      });

      grid[row.r][row.c] = row.d;
      chosen.push(ri);

      // Cover all other columns in this row
      const coveredCols = [];
      const coveredNewlys = [];
      for (const j of row.cols) {
        if (j !== chosenCol && !colCovered[j]) {
          const newly = coverCol(j);
          coveredCols.push(j);
          coveredNewlys.push(newly);
        }
      }

      if (dlx(depth + 1)) return true;

      // Uncover in reverse
      for (let k = coveredCols.length - 1; k >= 0; k--) {
        uncoverCol(coveredCols[k], coveredNewlys[k]);
      }

      chosen.pop();
      grid[row.r][row.c] = puzzle[row.r][row.c]; // restore to original or 0

      steps.push({
        type: 'uncover',
        row: row.r, col: row.c, num: row.d, depth,
        message: `↩ DLX uncovers (${row.r + 1},${row.c + 1}) — digit ${row.d} failed`,
        explanation: `Placing ${row.d} at (${row.r + 1},${row.c + 1}) led to a dead end. Restoring and trying next candidate.`,
      });
    }

    // Uncover the main column (backtrack)
    uncoverCol(chosenCol, mainNewly);
    return false;
  }

  const feasible = dlx(0);
  if (!feasible) {
    steps.push({
      type: 'failed',
      message: '✗ No exact cover exists — puzzle unsolvable',
      explanation: 'Algorithm X exhausted all possibilities. No valid assignment satisfies all constraints.',
    });
  }
}

export class DancingLinksSolver {
  constructor(puzzle) {
    this.original = puzzle.map(r => [...r]);
    this.isDone     = false;
    this.isSolvable = true;
    this.lastAction = null;
    this.metrics    = { nodes: 0, backtracks: 0, columnsSelected: 0, time: 0 };
    this._t0        = null;
    this._steps     = [];
    this._idx       = 0;
    this._grid      = null;

    // Pre-compute all steps
    solve(puzzle, this._steps);
    this.totalSteps = this._steps.length;
  }

  start() { this._t0 = performance.now(); }

  step() {
    if (this._idx >= this._steps.length) { this.isDone = true; return false; }
    this.lastAction = this._steps[this._idx++];

    const t = this.lastAction.type;
    if (t === 'solved')    { this.isDone = true; this._grid = this.lastAction.grid; this.metrics.time = (performance.now() - this._t0) / 1000; }
    else if (t === 'failed')    { this.isDone = true; this.isSolvable = false; }
    else if (t === 'cover')     { this.metrics.columnsSelected++; }
    else if (t === 'select')    { this.metrics.nodes++; }
    else if (t === 'uncover')   { this.metrics.backtracks++; }

    return this._idx < this._steps.length && !this.isDone;
  }

  getGrid() {
    if (this._grid) return this._grid;
    const g = this.original.map(r => [...r]);
    const stack = [];
    for (let i = 0; i < this._idx; i++) {
      const s = this._steps[i];
      if (s.type === 'select') {
        stack.push([s.row, s.col, g[s.row][s.col]]);
        g[s.row][s.col] = s.num;
      } else if (s.type === 'uncover' && stack.length) {
        const [pr, pc, pv] = stack.pop();
        g[pr][pc] = pv;
      }
    }
    return g;
  }

  getProgress() { return this.totalSteps ? this._idx / this.totalSteps : 0; }
}
