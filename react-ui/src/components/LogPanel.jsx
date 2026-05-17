import { useEffect, useRef } from 'react';

const ENTRY_COLOR = {
  place:        'var(--log-place)',
  select:       'var(--log-place)',
  solved:       'var(--log-place)',
  ac3_complete: 'var(--log-place)',
  invalid:      'var(--log-invalid)',
  dead_end:     'var(--log-invalid)',
  failed:       'var(--log-invalid)',
  backtrack:    'var(--log-backtrack)',
  uncover:      'var(--log-backtrack)',
  propagate:    'var(--log-propagate)',
  mrv_select:   'var(--log-mrv)',
  cover:        'var(--log-mrv)',
};

// Only render last 500 entries in the DOM for performance
const RENDER_LIMIT = 500;

function LogPanel({ log }) {
  const containerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimerRef = useRef(null);

  // Track when the user manually scrolls
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isUserScrollingRef.current = !atBottom;
  }

  // Auto-scroll only within the log container, only if user isn't scrolling up
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const visible = log.length > RENDER_LIMIT ? log.slice(-RENDER_LIMIT) : log;
  const hidden  = log.length - visible.length;

  return (
    <section className="log-shell panel">
      <div className="panel-header">
        <h3>Solver Log</h3>
        <span className="panel-sub">{log.length.toLocaleString()} entries</span>
      </div>

      <div
        className="log-feed"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {log.length === 0 ? (
          <div className="log-empty">Solver activity will appear here.</div>
        ) : (
          <>
            {hidden > 0 && (
              <div className="log-hidden-note">
                … {hidden.toLocaleString()} earlier entries (showing last {RENDER_LIMIT})
              </div>
            )}
            {visible.map((entry, i) => {
              const color = ENTRY_COLOR[entry.type] ?? 'var(--text-muted)';
              return (
                <div key={i} className="log-entry" style={{ borderLeftColor: color }}>
                  <span className="log-num">{log.length - visible.length + i + 1}</span>
                  <span className="log-msg" style={{ color }}>{entry.msg}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}

export default LogPanel;
