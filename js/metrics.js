// metrics.js - Real-time metrics tracker and report generator

class MetricsTracker {
  constructor() {
    this.reset();
    this._timerInterval = null;
  }

  reset() {
    this.startTime = null;
    this.endTime = null;
    this.history = []; // [{solver, puzzle, result}]
  }

  start() {
    this.startTime = performance.now();
    this.endTime = null;
  }

  stop() {
    this.endTime = performance.now();
  }

  getElapsed() {
    if (!this.startTime) return 0;
    const end = this.endTime || performance.now();
    return (end - this.startTime) / 1000;
  }

  recordComparison(puzzleName, btResult, ac3Result) {
    this.history.push({ puzzleName, btResult, ac3Result, timestamp: Date.now() });
  }

  // Snapshot from a BacktrackingSolver instance
  snapshot(solver) {
    return {
      cellsTried: solver.metrics.cellsTried,
      backtracks: solver.metrics.backtracks,
      steps: solver.metrics.steps,
      maxDepth: solver.metrics.maxDepth,
      cellsSolved: solver.getCellsSolved(),
      remainingEmpty: solver.getRemainingEmpty(),
      successRate: solver.getSuccessRate(),
      elapsed: this.getElapsed()
    };
  }

  generateReport(solver, puzzleName = 'Unknown') {
    const elapsed = this.getElapsed();
    const m = solver.metrics;
    return {
      puzzleName,
      solved: solver.isDone,
      totalTime: elapsed.toFixed(3) + 's',
      totalSteps: m.steps,
      cellsTried: m.cellsTried,
      backtracks: m.backtracks,
      maxDepth: m.maxDepth,
      successRate: solver.getSuccessRate().toFixed(1) + '%',
      avgBranching: m.backtracks > 0
        ? (m.cellsTried / (m.backtracks + 1)).toFixed(2)
        : m.cellsTried.toFixed(2)
    };
  }

  exportCSV(solver, puzzleName = 'Unknown') {
    const r = this.generateReport(solver, puzzleName);
    const rows = [
      ['Metric', 'Value'],
      ['Puzzle', r.puzzleName],
      ['Solved', r.solved],
      ['Total Time', r.totalTime],
      ['Total Steps', r.totalSteps],
      ['Cells Tried', r.cellsTried],
      ['Backtracks', r.backtracks],
      ['Max Depth', r.maxDepth],
      ['Success Rate', r.successRate],
      ['Avg Branching Factor', r.avgBranching]
    ];
    return rows.map(row => row.join(',')).join('\n');
  }
}
