from backend.algorithms.backtracking import solve
from app import app, count_solutions

sample = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
]


def test_solve():
    sol, metrics = solve(sample, use_mrv=True, forward_check=True)
    assert sol is not None
    assert metrics['success'] is True or metrics['time_sec'] >= 0


def test_count_solutions_finds_unique_puzzle():
    assert count_solutions(sample) == 1


def test_api_rejects_invalid_grid():
    invalid = [row[:] for row in sample]
    invalid[0][2] = 5

    response = app.test_client().post('/api/solve', json={'grid': invalid})

    assert response.status_code == 400
    assert response.get_json()['solved'] is False
