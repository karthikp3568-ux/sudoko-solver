import { useMemo } from 'react';

const ROWS = [...Array(9).keys()];

function cellHighlightClass(r, c, highlight) {
  if (!highlight?.cells?.length) {
    if (highlight?.type === 'solved') return 'cell--solved';
    if (highlight?.type === 'failed') return 'cell--failed';
    return '';
  }
  const match = highlight.cells.some(([hr, hc]) => hr === r && hc === c);
  if (!match) return '';
  switch (highlight.type) {
    case 'place':     return 'cell--place';
    case 'invalid':   return highlight.cells[0][0] === r && highlight.cells[0][1] === c ? 'cell--invalid-target' : 'cell--conflict';
    case 'backtrack': return 'cell--backtrack';
    case 'propagate': return highlight.cells[0][0] === r && highlight.cells[0][1] === c ? 'cell--propagate-to' : 'cell--propagate-from';
    case 'mrv':       return 'cell--mrv';
    default:          return '';
  }
}

function Board({ grid, activeCell, highlight, originalGrid, onCellClick, onCellEdit, solveMode, algColor }) {
  const [activeRow, activeCol] = activeCell ?? [-1, -1];

  const isOriginal = useMemo(() =>
    originalGrid
      ? originalGrid.map(row => row.map(v => v !== 0))
      : grid.map(row => row.map(() => false)),
    [originalGrid, grid]
  );

  return (
    <div className="board-shell">
      <div className="board-grid" style={{ '--alg-color': algColor }}>
        {ROWS.map(r =>
          ROWS.map(c => {
            const val = grid[r][c];
            const isActive = r === activeRow && c === activeCol;
            const hlClass = cellHighlightClass(r, c, highlight);
            const orig = isOriginal[r][c];

            const classes = [
              'sudoku-cell',
              isActive   ? 'cell--active'   : '',
              orig       ? 'cell--original' : '',
              val !== 0  ? 'cell--filled'   : '',
              hlClass,
            ].filter(Boolean).join(' ');

            const boxR = Math.floor(r / 3);
            const boxC = Math.floor(c / 3);

            return (
              <label
                key={`${r}-${c}`}
                className={classes}
                style={{
                  borderRight:  c === 2 || c === 5 ? '2px solid var(--box-border)' : '1px solid var(--cell-border-color)',
                  borderBottom: r === 2 || r === 5 ? '2px solid var(--box-border)' : '1px solid var(--cell-border-color)',
                  borderTop:    r === 3 || r === 6 ? '2px solid var(--box-border)' : undefined,
                  borderLeft:   c === 3 || c === 6 ? '2px solid var(--box-border)' : undefined,
                }}
                onClick={() => onCellClick?.([r, c])}
              >
                <input
                  className="cell-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  readOnly={solveMode === 'solving' || orig}
                  value={val !== 0 ? val : ''}
                  onChange={e => {
                    if (solveMode === 'solving' || orig) return;
                    const raw = e.target.value.replace(/[^1-9]/g, '').slice(-1);
                    onCellEdit(r, c, raw ? +raw : 0);
                  }}
                  onFocus={() => onCellClick?.([r, c])}
                />
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Board;
