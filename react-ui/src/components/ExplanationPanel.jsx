const TYPE_COLOR = {
  place:          '#00e676',
  select:         '#00e676',
  invalid:        '#ff5252',
  backtrack:      '#ff9800',
  uncover:        '#ff9800',
  propagate:      '#e040fb',
  mrv_select:     '#00e5ff',
  cover:          '#00e5ff',
  solved:         '#00e676',
  ac3_complete:   '#00e676',
  dead_end:       '#ff5252',
  failed:         '#ff5252',
};

const TYPE_ICON = {
  place: '▶', select: '▶',
  invalid: '✗', dead_end: '✗', failed: '✗',
  backtrack: '↩', uncover: '↩',
  propagate: '⇝', cover: '⊙',
  mrv_select: '★',
  solved: '✓', ac3_complete: '✓',
};

function ExplanationPanel({ explanation, lastAction, algMeta }) {
  const type = lastAction?.type;
  const color = (type && TYPE_COLOR[type]) ?? algMeta?.color ?? '#00e5ff';
  const icon  = (type && TYPE_ICON[type]) ?? '·';

  return (
    <section className="explain-shell glass-panel">
      <div className="panel-header">
        <h3>Explanation</h3>
        <span className="panel-sub">Why this move?</span>
      </div>

      {explanation ? (
        <div className="explain-body" style={{ '--explain-color': color }}>
          <span className="explain-icon" style={{ color }}>{icon}</span>
          <p className="explain-text">{explanation}</p>
        </div>
      ) : (
        <p className="explain-empty">Hit Solve or Step to see explanations.</p>
      )}

      {lastAction?.message && (
        <div className="explain-action" style={{ borderColor: `${color}44` }}>
          <code style={{ color }}>{lastAction.message}</code>
        </div>
      )}
    </section>
  );
}

export default ExplanationPanel;
