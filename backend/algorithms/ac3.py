from copy import deepcopy


def _revise(dom, xi, xj):
    revised = False
    to_remove = set()
    for x in dom[xi]:
        if all(x == y for y in dom[xj]):
            to_remove.add(x)
    if to_remove:
        dom[xi] = dom[xi] - to_remove
        revised = True
    return revised


def _neighbors(pos):
    r, c = pos
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


def ac3(dom):
    # dom: dict pos -> set(values)
    queue = [(xi, xj) for xi in dom for xj in _neighbors(xi)]
    while queue:
        xi, xj = queue.pop(0)
        if _revise(dom, xi, xj):
            if not dom[xi]:
                return False
            for xk in _neighbors(xi):
                if xk != xj:
                    queue.append((xk, xi))
    return True


def solve(grid, use_mrv=False, forward_check=False):
    from .backtracking import _initial_domains
    dom = _initial_domains(grid)
    feasible = ac3(dom)
    if not feasible:
        return None, {'success': False, 'note': 'AC-3 found inconsistency'}
    # if solved by AC3
    if all(len(dom[pos]) == 1 for pos in dom):
        sol = [[next(iter(dom[(r, c)])) for c in range(9)] for r in range(9)]
        return sol, {'success': True, 'note': 'solved by AC-3'}
    # fall back to backtracking using domains
    from .backtracking import solve as bt_solve
    # bt_solve will recompute domains; to use our reduced domains we would need
    # a backtracking variant that accepts initial domains. For simplicity, call bt_solve.
    solution, metrics = bt_solve(grid, use_mrv=use_mrv, forward_check=forward_check)
    return solution, metrics
