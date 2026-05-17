// Central API config — vite proxy rewrites /api/* to http://localhost:5000/api/*
const BASE = '';

export const API = {
  solve:     `${BASE}/api/solve`,
  compare:   `${BASE}/api/compare`,
  benchmark: `${BASE}/api/benchmark`,
  puzzle:    `${BASE}/api/puzzle`,
  puzzles:   `${BASE}/api/puzzles`,
};

export const ALGORITHM_META = {
  backtracking: {
    label: 'Backtracking',
    short: 'BT',
    color: '#00e5ff',
    glow: 'rgba(0,229,255,0.35)',
    desc: 'Classic depth-first search. Tries every candidate, backtracks on contradiction.',
    complexity: 'O(9^n) worst case',
    bestFor: 'Simple/medium puzzles',
  },
  ac3: {
    label: 'AC-3 + MRV',
    short: 'AC3',
    color: '#e040fb',
    glow: 'rgba(224,64,251,0.35)',
    desc: 'Arc Consistency-3 constraint propagation + Minimum Remaining Values heuristic.',
    complexity: 'O(ed³) propagation + backtracking',
    bestFor: 'Hard / Expert puzzles',
  },
  dlx: {
    label: 'Dancing Links',
    short: 'DLX',
    color: '#00e676',
    glow: 'rgba(0,230,118,0.35)',
    desc: 'Algorithm X exact cover via Knuth\'s Dancing Links matrix. Optimal for sparse boards.',
    complexity: 'O(2^n) with perfect pruning',
    bestFor: 'Expert / Extreme puzzles',
  },
};
