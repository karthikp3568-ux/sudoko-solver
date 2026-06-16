const examplePuzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function defaultPuzzle() {
  return cloneGrid(examplePuzzle);
}

function isValidPlacement(grid, row, col, value) {
  if (value === 0) return true;
  for (let idx = 0; idx < 9; idx += 1) {
    if (grid[row][idx] === value && idx !== col) return false;
    if (grid[idx][col] === value && idx !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const rr = startRow + r;
      const cc = startCol + c;
      if (grid[rr][cc] === value && (rr !== row || cc !== col)) return false;
    }
  }
  return true;
}

function findEmpty(grid) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function getCandidates(grid, row, col) {
  const candidates = [];
  for (let candidate = 1; candidate <= 9; candidate += 1) {
    if (isValidPlacement(grid, row, col, candidate)) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

function solveGrid(sourceGrid) {
  const solver = createSolver(sourceGrid);
  let result;
  do {
    result = solver.step();
  } while (!result.finished);
  return result.status === 'Solved' ? result.grid : cloneGrid(sourceGrid);
}

// Check if grid is fully completed and all cell values are between 1 and 9
function isGridComplete(grid) {
  return grid.every(row => row.every(value => value >= 1 && value <= 9));
}

function countMistakes(grid, solution, originalGrid) {
  let mistakes = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (originalGrid?.[r]?.[c]) continue;
      const value = grid[r][c];
      if (value !== 0 && value !== solution[r][c]) mistakes += 1;
    }
  }
  return mistakes;
}

function countFilledCells(grid) {
  return grid.reduce((total, row) => total + row.filter(Boolean).length, 0);
}

function createSolver(sourceGrid) {
  const grid = cloneGrid(sourceGrid);
  let stack = [];
  let currentNode = null;
  let finished = false;
  let status = 'Idle';
  let nodes = 0;
  let memory = 16.0;
  let maxRecursion = 0;
  let activeCell = [-1, -1];
  let action = 'Waiting for solver';

  const step = () => {
    if (finished) {
      return { grid: cloneGrid(grid), activeCell, recursion: maxRecursion, nodes, memory, finished, status, action };
    }

    if (!currentNode) {
      const emptyCell = findEmpty(grid);
      if (!emptyCell) {
        finished = true;
        status = 'Solved';
        action = 'Solver finished successfully';
        activeCell = [-1, -1];
        return { grid: cloneGrid(grid), activeCell, recursion: maxRecursion, nodes, memory, finished, status, action };
      }
      const [row, col] = emptyCell;
      const candidates = getCandidates(grid, row, col);
      currentNode = { row, col, candidates, index: 0 };
      activeCell = [row, col];
      status = 'Exploring';
      action = `Exploring cell (${row + 1},${col + 1}) with ${candidates.length} candidate(s)`;
    }

    if (currentNode.index < currentNode.candidates.length) {
      const value = currentNode.candidates[currentNode.index];
      currentNode.index += 1;
      grid[currentNode.row][currentNode.col] = value;
      stack.push(currentNode);
      action = `Place ${value} at (${currentNode.row + 1},${currentNode.col + 1})`;
      currentNode = null;
      nodes += 1;
      maxRecursion = Math.max(maxRecursion, stack.length);
      memory = 16 + stack.length * 0.08;
      status = 'Placing';
      return { grid: cloneGrid(grid), activeCell, recursion: maxRecursion, nodes, memory, finished: false, status, action };
    }

    const lastValue = grid[currentNode.row][currentNode.col];
    grid[currentNode.row][currentNode.col] = 0;
    status = 'Backtracking';
    action = `Backtrack at (${currentNode.row + 1},${currentNode.col + 1}), remove ${lastValue}`;
    nodes += 1;
    activeCell = [currentNode.row, currentNode.col];
    if (stack.length === 0) {
      finished = true;
      status = 'No solution';
      action = 'No solution found';
      return { grid: cloneGrid(grid), activeCell, recursion: maxRecursion, nodes, memory, finished, status, action };
    }

    currentNode = stack.pop();
    grid[currentNode.row][currentNode.col] = 0;
    maxRecursion = Math.max(maxRecursion, stack.length);
    memory = 16 + stack.length * 0.08;
    return { grid: cloneGrid(grid), activeCell, recursion: maxRecursion, nodes, memory, finished: false, status, action };
  };

  return { step, grid: cloneGrid(grid), status, nodes, memory, recursion: maxRecursion, finished };
}

function generatePuzzleGrid(difficulty) {
  const solved = solveGrid(defaultPuzzle());
  const puzzle = cloneGrid(solved);
  const clues = typeof difficulty === 'number'
    ? difficulty
    : difficulty === 'insane'
    ? 18
    : difficulty === 'expert'
    ? 22
    : difficulty === 'hard'
    ? 24
    : difficulty === 'medium'
    ? 30
    : 36;
  const positions = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      positions.push([r, c]);
    }
  }
  while (positions.length > clues) {
    const idx = Math.floor(Math.random() * positions.length);
    const [r, c] = positions.splice(idx, 1)[0];
    puzzle[r][c] = 0;
  }
  return puzzle;
}

const themes = {
  classic: { label: 'Classic Ink' },
  arcade: { label: 'Arcade' },
  paper: { label: 'Paper' },
  glass: { label: 'Glass' },
};

export {
  createSolver,
  defaultPuzzle,
  generatePuzzleGrid,
  solveGrid,
  isGridComplete,
  countMistakes,
  countFilledCells,
  themes,
};
