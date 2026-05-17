import { BacktrackingSolver } from './backtracking_solver.js';
import { AC3Solver }          from './ac3_solver.js';
import { DancingLinksSolver } from './dancing_links.js';

export function createSolverByAlgorithm(algorithm, puzzle) {
  switch (algorithm) {
    case 'ac3':            return new AC3Solver(puzzle);
    case 'dlx':            return new DancingLinksSolver(puzzle);
    case 'backtracking':
    default:               return new BacktrackingSolver(puzzle);
  }
}
