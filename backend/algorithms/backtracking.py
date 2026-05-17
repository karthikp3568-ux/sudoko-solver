import time
import tracemalloc
from copy import deepcopy
from .ac3 import ac3

DIGITS = set(range(1, 10))


def _to_key(r, c):
    return (r, c)


def _peers(r, c):
    peers = set()
    for i in range(9):
        if i != c:
            peers.add((r, i))
        if i != r:
            peers.add((i, c))
    br, bc = 3 * (r // 3), 3 * (c // 3)
    for i in range(br, br + 3):
        for j in range(bc, bc + 3):
            if i != r or j != c:
                peers.add((i, j))
    return peers


def _initial_domains(grid):
    domains = {}
    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            if v and v in DIGITS:
                domains[(r, c)] = {v}
            else:
                used = set()
                for i in range(9):
                    if grid[r][i]:
                        used.add(grid[r][i])
                    if grid[i][c]:
                        used.add(grid[i][c])
                br, bc = 3 * (r // 3), 3 * (c // 3)
                for i in range(br, br + 3):
                    for j in range(bc, bc + 3):
                        if grid[i][j]:
                            used.add(grid[i][j])
                domains[(r, c)] = DIGITS - used
    return domains


def solve(grid, use_mrv=False, forward_check=False, time_limit=None):
    start = time.perf_counter()
    tracemalloc.start()
    domains = _initial_domains(grid)
    # initial AC-3 propagation to reduce domains
    try:
        ac3(domains)
    except Exception:
        pass
    recursion_calls = 0

    def is_solved(dom):
        if not all(len(dom[pos]) == 1 for pos in dom):
            return False
        # build grid and validate uniqueness constraints
        grid = [[next(iter(dom[(r, c)])) for c in range(9)] for r in range(9)]
        # validate rows
        for r in range(9):
            vals = grid[r]
            if len(set(vals)) != 9:
                return False
        # validate cols
        for c in range(9):
            vals = [grid[r][c] for r in range(9)]
            if len(set(vals)) != 9:
                return False
        # validate boxes
        for br in range(3):
            for bc in range(3):
                vals = []
                for i in range(3):
                    for j in range(3):
                        vals.append(grid[3*br + i][3*bc + j])
                if len(set(vals)) != 9:
                    return False
        return True

    def select_unassigned(dom):
        # MRV: choose variable with smallest domain >1
        candidates = [p for p in dom if len(dom[p]) > 1]
        if not candidates:
            return None
        if use_mrv:
            return min(candidates, key=lambda p: len(dom[p]))
        return candidates[0]

    def assign(dom, var, value, history):
        history.append((var, dom[var].copy()))
        dom[var] = {value}

    def restore(dom, history):
        var, old = history.pop()
        dom[var] = old

    def forward_checking(dom, var, value, fc_history):
        # remove value from peers' domains
        for peer in _peers(*var):
            if value in dom[peer]:
                if len(dom[peer]) == 1:
                    # peer already fixed to the same value -> conflict
                    return False
                fc_history.append((peer, dom[peer].copy()))
                dom[peer] = dom[peer] - {value}
                if not dom[peer]:
                    return False
        return True

    def undo_forward_checking(dom, fc_history):
        while fc_history:
            peer, old = fc_history.pop()
            dom[peer] = old

    solution = None

    def backtrack(dom):
        nonlocal recursion_calls, solution
        recursion_calls += 1
        if time_limit and time.perf_counter() - start > time_limit:
            return False
        if is_solved(dom):
            sol = [[next(iter(dom[(r, c)])) for c in range(9)] for r in range(9)]
            # validate solution
            solution = sol
            return True
        var = select_unassigned(dom)
        if var is None:
            return False
        # try each value by working on a local copy of domains to avoid restore bugs
        for val in sorted(dom[var]):
            new_dom = deepcopy(dom)
            new_dom[var] = {val}
            # forward check on the copy
            ok = True
            if forward_check:
                for peer in _peers(*var):
                    if val in new_dom[peer]:
                        if len(new_dom[peer]) == 1:
                            ok = False
                            break
                        new_dom[peer] = new_dom[peer] - {val}
                        if not new_dom[peer]:
                            ok = False
                            break
            # run AC-3 on the branch to further propagate constraints
            if ok:
                try:
                    if not ac3(new_dom):
                        ok = False
                except Exception:
                    pass
            if not ok:
                continue
            if backtrack(new_dom):
                return True
        return False

    dom_copy = deepcopy(domains)
    success = backtrack(dom_copy)
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    elapsed = time.perf_counter() - start
    metrics = {
        'success': bool(success),
        'time_sec': elapsed,
        'recursion_calls': recursion_calls,
        'peak_memory_bytes': peak
    }
    return (solution if solution else None), metrics
