// Central API config — vite proxy rewrites /api/* to http://localhost:5000/api/*
const BASE = '';

export const API = {
  solve:     `${BASE}/api/solve`,
  compare:   `${BASE}/api/compare`,
  benchmark: `${BASE}/api/benchmark`,
  puzzle:    `${BASE}/api/puzzle`,
  puzzles:   `${BASE}/api/puzzles`,
  upload:    `${BASE}/api/check_image`,
};

export const ALGORITHM_META = {
  backtracking: {
    label: 'Backtracking',
    short: 'BT',
    color: '#111111',
    glow: 'rgba(17,17,17,0.22)',
    desc: 'Classic depth-first search. Tries every candidate, backtracks on contradiction.',
    complexity: 'O(9^n) worst case',
    bestFor: 'Simple/medium puzzles',
  },
  ac3: {
    label: 'AC-3 + MRV',
    short: 'AC3',
    color: '#111111',
    glow: 'rgba(17,17,17,0.22)',
    desc: 'Arc Consistency-3 constraint propagation + Minimum Remaining Values heuristic.',
    complexity: 'O(ed³) propagation + backtracking',
    bestFor: 'Hard / Expert puzzles',
  },
  dlx: {
    label: 'Dancing Links',
    short: 'DLX',
    color: '#111111',
    glow: 'rgba(17,17,17,0.22)',
    desc: 'Algorithm X exact cover via Knuth\'s Dancing Links matrix. Optimal for sparse boards.',
    complexity: 'O(2^n) with perfect pruning',
    bestFor: 'Expert / Extreme puzzles',
  },
};
