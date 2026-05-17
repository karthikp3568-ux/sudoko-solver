// generator.js - Sudoku puzzle generator with configurable difficulty

class PuzzleGenerator {
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  isValid(grid, r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === n || grid[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      if (grid[br + dr][bc + dc] === n) return false;
    }
    return true;
  }

  // Recursively fill grid with random valid numbers
  fillGrid(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (this.isValid(grid, r, c, n)) {
            grid[r][c] = n;
            if (this.fillGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  // Generate a complete valid Sudoku grid
  generateFull() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fillGrid(grid);
    return grid;
  }

  // Difficulty settings: target empty cells and whether to require symmetry
  difficultyConfig(difficulty) {
    return {
      easy:    { target: 35, symmetric: true  },
      medium:  { target: 45, symmetric: true  },
      hard:    { target: 52, symmetric: false },
      expert:  { target: 58, symmetric: false },
      extreme: { target: 63, symmetric: false }
    }[difficulty] || { target: 40, symmetric: true };
  }

  generate(difficulty = 'medium') {
    const full = this.generateFull();
    const { target, symmetric } = this.difficultyConfig(difficulty);
    const puzzle = full.map(r => [...r]);

    // Build candidate removal positions
    let positions = [];
    if (symmetric) {
      // Symmetric removal: remove pairs (r,c) and (8-r,8-c)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (r * 9 + c < (8 - r) * 9 + (8 - c)) {
            positions.push([[r, c], [8 - r, 8 - c]]);
          }
        }
      }
    } else {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          positions.push([[r, c]]);
        }
      }
    }
    this.shuffle(positions);

    let removed = 0;
    for (const pair of positions) {
      if (removed >= target) break;

      const backups = pair.map(([r, c]) => ({ r, c, val: puzzle[r][c] }));
      pair.forEach(([r, c]) => { puzzle[r][c] = 0; });

      // Only remove if puzzle still has a unique solution
      if (countSolutions(puzzle, 2) === 1) {
        removed += pair.length;
      } else {
        backups.forEach(({ r, c, val }) => { puzzle[r][c] = val; });
      }
    }

    return puzzle;
  }

  // Analyze difficulty of an existing puzzle
  analyze(puzzle) {
    const emptyCells = puzzle.flat().filter(v => v === 0).length;
    const result = solveStaticBacktrack(puzzle);
    const backtracks = result.backtracks;
    const timeMs = result.time;

    let label;
    if (emptyCells <= 35 && backtracks < 50)       label = 'Easy';
    else if (emptyCells <= 45 && backtracks < 200)  label = 'Medium';
    else if (emptyCells <= 52 && backtracks < 1000) label = 'Hard';
    else if (emptyCells <= 58)                       label = 'Expert';
    else                                             label = 'Extreme';

    return { emptyCells, backtracks, timeMs, label };
  }
}
