function PlayIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>; }
function PauseIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>; }
function CheckIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>; }
function StepIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 17,12 5,20"/><rect x="19" y="4" width="3" height="16" rx="1"/></svg>; }
function ResetIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 4-7.5"/><polyline points="3,3 3,9 9,9"/></svg>; }

const SPEEDS = [
  { key: 'slow',    label: '1×' },
  { key: 'normal',  label: '2×' },
  { key: 'fast',    label: '4×' },
  { key: 'instant', label: '⚡' },
];

function Controls({
  solveMode, difficulty, speed,
  onSolve, onStep, onPause, onReset, onClear, onGenerate,
  onDifficulty, onSpeed,
  algColor, algGlow,
}) {
  const solving = solveMode === 'solving';
  const idle    = solveMode === 'idle';
  const paused  = solveMode === 'paused';
  const done    = solveMode === 'done';

  function handlePrimary() {
    if (done) return;
    if (idle || done) return onSolve();
    onPause();
  }

  const fabLabel = solving ? 'Pause' : paused ? 'Resume' : done ? 'Done' : 'Solve';

  return (
    <section className="controls-shell">

      {/* ── Settings row: difficulty + generate + speed ── */}
      <div className="ctrl-top">
        <select
          className="ctrl-select"
          value={difficulty}
          onChange={e => onDifficulty(e.target.value)}
          disabled={solving}
        >
          {['easy', 'medium', 'hard', 'expert', 'insane'].map(d => (
            <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
          ))}
        </select>

        <button className="ctrl-pill" onClick={onGenerate} disabled={solving}>
          Generate
        </button>

        <div className="speed-cluster">
          {SPEEDS.map(s => (
            <button
              key={s.key}
              className={`speed-pip${speed === s.key ? ' speed-pip--on' : ''}`}
              onClick={() => onSpeed(s.key)}
              title={s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FAB row ── */}
      <div className="ctrl-fab-row">

        <button
          className="ctrl-side-btn"
          onClick={onStep}
          disabled={solving || done}
          title="Step once"
        >
          <StepIcon />
          <span>Step</span>
        </button>

        {/* Primary action FAB */}
        <button
          className={`ctrl-fab${solving ? ' ctrl-fab--active' : done ? ' ctrl-fab--done' : ''}`}
          style={{ '--fab-color': algColor, '--fab-glow': algGlow }}
          onClick={handlePrimary}
          disabled={done}
          title={fabLabel}
        >
          {solving ? <PauseIcon /> : done ? <CheckIcon /> : <PlayIcon />}
          <span className="fab-label">{fabLabel}</span>
        </button>

        <button
          className="ctrl-side-btn"
          onClick={onReset}
          disabled={idle}
          title="Reset to original"
        >
          <ResetIcon />
          <span>Reset</span>
        </button>

      </div>

      {/* ── Clear — subtle footer link ── */}
      <div className="ctrl-footer">
        <button className="ctrl-clear-btn" onClick={onClear} disabled={solving}>
          Clear board
        </button>
      </div>

    </section>
  );
}

export default Controls;
