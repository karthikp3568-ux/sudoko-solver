import time


def _build_exact_cover():
    # columns: 0-80 cell constraints, 81-161 row constraints, 162-242 column constraints, 243-323 box constraints
    rows = {}
    for r in range(9):
        for c in range(9):
            for n in range(1, 10):
                row_id = (r, c, n)
                cols = []
                # cell constraint
                cols.append(9 * r + c)
                # row constraint
                cols.append(81 + 9 * r + (n - 1))
                # column constraint
                cols.append(162 + 9 * c + (n - 1))
                # box constraint
                box = 3 * (r // 3) + (c // 3)
                cols.append(243 + 9 * box + (n - 1))
                rows[row_id] = set(cols)
    return rows


def _cover(columns, rows, row_id):
    removed = {}
    cols = rows[row_id]
    for c in cols:
        removed[c] = columns.pop(c)
        for r in list(removed[c]):
            for c2 in rows[r]:
                if c2 in columns and r in columns[c2]:
                    columns[c2].remove(r)
    return removed


def _uncover(columns, rows, removed):
    # undo in reverse
    for c, rowset in removed.items():
        for r in rowset:
            for c2 in rows[r]:
                if c2 in columns:
                    columns[c2].add(r)
        columns[c] = rowset


def solve(grid):
    start = time.perf_counter()
    rows = _build_exact_cover()
    # build columns mapping col -> set(rows)
    columns = {i: set() for i in range(324)}
    for r_id, cols in rows.items():
        for c in cols:
            columns[c].add(r_id)

    # constrain by given grid
    allowed_rows = set(rows.keys())
    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            if v and v in range(1, 10):
                allowed_rows = {rid for rid in allowed_rows if not (rid[0] == r and rid[1] == c) or rid[2] == v}
    for c in columns:
        columns[c] = {rid for rid in columns[c] if rid in allowed_rows}

    solution = []
    recursion_calls = 0
    found = False

    def search(sol):
        nonlocal recursion_calls, found
        recursion_calls += 1
        if not columns:
            solution.extend(sol)
            found = True
            return True
        # choose column with smallest options
        c = min(columns.keys(), key=lambda k: len(columns[k]) if columns[k] else float('inf'))
        if not columns[c]:
            return False
        for r_id in list(columns[c]):
            removed = _cover(columns, rows, r_id)
            sol.append(r_id)
            if search(sol):
                return True
            sol.pop()
            _uncover(columns, rows, removed)
        return False

    search([])
    elapsed = time.perf_counter() - start
    if not found:
        return None, {'success': False, 'time_sec': elapsed, 'recursion_calls': recursion_calls}
    sol_grid = [[0] * 9 for _ in range(9)]
    for r, c, n in solution:
        sol_grid[r][c] = n
    metrics = {'success': True, 'time_sec': elapsed, 'recursion_calls': recursion_calls}
    return sol_grid, metrics
