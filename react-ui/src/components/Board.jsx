import React, { useMemo } from 'react';

/**
 * Sudoku Board Component
 * 
 * Features:
 * - Dynamic Theme Switching via CSS Variables
 * - Shared variable mapping for active, peer, and same-value highlighting
 * - Responsive grid layout for Mobile
 * - Keydown support for desktop play
 */

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

function isCompletionCell(r, c, completionPulse) {
  if (!completionPulse) return false;
  if (completionPulse.type === 'row') return r === completionPulse.index;
  if (completionPulse.type === 'col') return c === completionPulse.index;
  if (completionPulse.type === 'box') return Math.floor(r / 3) * 3 + Math.floor(c / 3) === completionPulse.index;
  return false;
}

const Board = ({
  grid,
  activeCell,
  highlight,
  originalGrid,
  onCellClick,
  onCellEdit,
  solveMode,
  algColor,
  boardTheme = 'cottagecore', // User default theme
  readOnly = false,
  wrongCells = [],
  completionPulse = null,
  selectedNumber = null,
  obscured = false,
  notes = null,
  notesMode = false,
  onNoteToggle = null,
}) => {
  const [activeRow, activeCol] = activeCell ?? [-1, -1];
  
  const isOriginal = useMemo(() =>
    originalGrid
      ? originalGrid.map(row => row.map(v => v !== 0))
      : grid.map(row => row.map(() => false)),
    [originalGrid, grid]
  );

  const sameGroup = useMemo(() => {
    if (activeRow < 0 || activeCol < 0) return null;
    return { row: activeRow, col: activeCol, boxR: Math.floor(activeRow / 3), boxC: Math.floor(activeCol / 3) };
  }, [activeRow, activeCol]);

  return (
    <div className={`board-shell board-shell--${boardTheme} ${obscured ? 'board-shell--obscured' : ''}`}>
      <div className="board-grid" style={{ '--alg-color': algColor }}>
        {ROWS.map(r =>
          ROWS.map(c => {
            const val = grid[r][c];
            const isActive = r === activeRow && c === activeCol;
            const hlClass  = cellHighlightClass(r, c, highlight);
            const orig     = isOriginal[r][c];
            const wrong    = wrongCells.some(([wr, wc]) => wr === r && wc === c);
            const completed = isCompletionCell(r, c, completionPulse);
            
            const isPeer = !isActive && sameGroup && (
              r === sameGroup.row ||
              c === sameGroup.col ||
              (Math.floor(r / 3) === sameGroup.boxR && Math.floor(c / 3) === sameGroup.boxC)
            );
            
            const activeVal = activeRow >= 0 ? grid[activeRow][activeCol] : 0;
            const isSameVal = !isActive && activeVal > 0 && val === activeVal;
            const isSelectedNum = selectedNumber > 0 && val === selectedNumber;

            const cellNotes = notes?.[r]?.[c] ?? [];
 
            const classes = [
              'sudoku-cell',
              isActive    ? 'cell--active'       : '',
              orig        ? 'cell--original'     : '',
              val !== 0   ? 'cell--filled'       : '',
              wrong       ? 'cell--wrong'        : '',
              completed   ? 'cell--complete-pulse' : '',
              isPeer      ? 'cell--peer'         : '',
              isSameVal   ? 'cell--same-val'     : '',
              isSelectedNum ? 'cell--selected-number-highlight' : '',
              hlClass,
            ].filter(Boolean).join(' ');

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
                  readOnly={readOnly || solveMode === 'solving' || orig}
                  value={val !== 0 ? val : ''}
                  onChange={e => {
                    if (readOnly || solveMode === 'solving' || orig) return;
                    const raw = e.target.value.replace(/[^1-9]/g, '').slice(-1);
                    if (raw) {
                      const num = +raw;
                      if (notesMode) {
                        onNoteToggle?.(r, c, num);
                      } else {
                        onCellEdit?.(r, c, num);
                      }
                    } else {
                      onCellEdit?.(r, c, 0);
                    }
                  }}
                  onKeyDown={e => {
                    if (readOnly || solveMode === 'solving' || orig) return;
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.preventDefault();
                      onCellEdit?.(r, c, 0);
                    }
                    if (e.key >= '1' && e.key <= '9') {
                      e.preventDefault();
                      const num = +e.key;
                      if (notesMode) {
                        onNoteToggle?.(r, c, num);
                      } else {
                        onCellEdit?.(r, c, num);
                      }
                    }
                  }}
                  onFocus={() => onCellClick?.([r, c])}
                />
                {val === 0 && cellNotes.length > 0 && (
                  <div className="cell-notes-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <span key={n} className="cell-note-item">
                        {cellNotes.includes(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Board;
