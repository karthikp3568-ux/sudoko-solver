function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="stat-bar-track">
      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ '--card-color': color }}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value" style={{ color }}>{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function StatsPanel({ metrics, algMeta }) {
  const { nodes = 0, backtracks = 0, reductions = 0, time = 0, progress = 0 } = metrics;
  const color = algMeta?.color ?? '#00e5ff';

  const reductionLabel = algMeta?.short === 'AC3'
    ? 'Constraint Reductions'
    : algMeta?.short === 'DLX'
    ? 'Columns Selected'
    : 'Constraint Checks';

  return (
    <section className="stats-shell glass-panel">
      <div className="panel-header">
        <h3>Performance</h3>
        <span className="panel-sub">Live metrics</span>
      </div>

      <div className="stats-grid">
        <StatCard label="Nodes" value={nodes.toLocaleString()} color={color} />
        <StatCard label="Backtracks" value={backtracks.toLocaleString()} color="#ff6b6b" />
        <StatCard label={reductionLabel} value={reductions.toLocaleString()} color="#ffd93d" />
        <StatCard label="Time" value={time > 0 ? `${time.toFixed(3)}s` : '—'} color="#6bcb77" />
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span>Progress</span>
          <span style={{ color }}>{(progress * 100).toFixed(1)}%</span>
        </div>
        <Bar value={progress} max={1} color={color} />
      </div>
    </section>
  );
}

export default StatsPanel;
