from .backtracking import solve as bt_solve


def solve(grid):
    # Heuristic combined: MRV + Forward Checking
    return bt_solve(grid, use_mrv=True, forward_check=True)
