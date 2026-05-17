// ac3_solver.js - AC-3 Constraint Propagation + Backtracking with MRV heuristic

class AC3Solver {
  constructor(puzzle) {
    this.original = puzzle.map(row => [...row]);
    this.metrics = { cellsTried: 0, backtracks: 0, ac3Iterations: 0, ac3Reductions: 0 };
  }

  // All cells in same row, column, or 3×3 box as (row, col)
  getNeighborKeys(row, col) {
    const keys = new Set();
    for (let i = 0; i < 9; i++) {
      if (i !== col) keys.add(`${row},${i}`);
      if (i !== row) keys.add(`${i},${col}`);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (r !== row || c !== col) keys.add(`${r},${c}`);
      }
    }
    return [...keys];
  }

  // For arc (Xi, Xj) with constraint Xi≠Xj:
  // Remove value x from domain(Xi) if domain(Xj)=={x} (Xj must be x, so Xi cannot be x)
  revise(domains, xiKey, xjKey) {
    let revised = false;
    for (const x of [...domains[xiKey]]) {
      let hasSupport = false;
      for (const y of domains[xjKey]) {
        if (y !== x) { hasSupport = true; break; }
      }
      if (!hasSupport) {
        domains[xiKey].delete(x);
        revised = true;
        this.metrics.ac3Reductions++;
      }
    }
    return revised;
  }

  // Run AC-3 on the given domains; returns false if any domain becomes empty
  ac3(domains) {
    // Queue: all arcs (Xi→Xj) between neighbors
    const queue = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const xiKey = `${r},${c}`;
        for (const xjKey of this.getNeighborKeys(r, c)) {
          queue.push([xiKey, xjKey]);
        }
      }
    }

    while (queue.length > 0) {
      this.metrics.ac3Iterations++;
      const [xiKey, xjKey] = queue.shift();
      if (this.revise(domains, xiKey, xjKey)) {
        if (domains[xiKey].size === 0) return false; // domain wipeout
        // Re-add all arcs pointing to Xi (except from Xj)
        const [r, c] = xiKey.split(',').map(Number);
        for (const xkKey of this.getNeighborKeys(r, c)) {
          if (xkKey !== xjKey) queue.push([xkKey, xiKey]);
        }
      }
    }
    return true;
  }

  isConsistent(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (grid[r][c] === num) return false;
      }
    }
    return true;
  }

  // Backtracking with MRV (minimum remaining values) heuristic
  backtrack(grid, domains) {
    // Find unassigned cell with smallest domain (MRV)
    let minSize = 10, minR = -1, minC = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const sz = domains[`${r},${c}`].size;
          if (sz < minSize) { minSize = sz; minR = r; minC = c; }
        }
      }
    }
    if (minR === -1) return grid; // fully assigned — solved

    for (const num of domains[`${minR},${minC}`]) {
      this.metrics.cellsTried++;
      if (this.isConsistent(grid, minR, minC, num)) {
        const newGrid = grid.map(r => [...r]);
        newGrid[minR][minC] = num;

        // Forward-checking: propagate assignment into a copy of domains
        const newDomains = {};
        for (const key of Object.keys(domains)) {
          newDomains[key] = new Set(domains[key]);
        }
        newDomains[`${minR},${minC}`] = new Set([num]);

        // Propagate with AC-3 on the new assignment
        if (this.ac3(newDomains)) {
          const result = this.backtrack(newGrid, newDomains);
          if (result) return result;
        }
        this.metrics.backtracks++;
      }
    }
    return null;
  }

  solve() {
    const t0 = performance.now();

    // Initialize domains
    const domains = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const key = `${r},${c}`;
        domains[key] = this.original[r][c] !== 0
          ? new Set([this.original[r][c]])
          : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      }
    }

    // Initial AC-3 pass
    if (!this.ac3(domains)) {
      return { solved: false, time: performance.now() - t0, ...this.metrics };
    }

    // Build initial grid from single-value domains
    const grid = this.original.map(row => [...row]);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0 && domains[`${r},${c}`].size === 1) {
          grid[r][c] = [...domains[`${r},${c}`]][0];
        }
      }
    }

    const result = this.backtrack(grid, domains);
    const time = performance.now() - t0;

    return {
      solved: result !== null,
      grid: result,
      time,
      cellsTried: this.metrics.cellsTried,
      backtracks: this.metrics.backtracks,
      ac3Iterations: this.metrics.ac3Iterations,
      ac3Reductions: this.metrics.ac3Reductions
    };
  }
}
