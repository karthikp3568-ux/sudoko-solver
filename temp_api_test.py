from backend.app import app
from backend.algorithms import backtracking, ac3, dancing_links
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
print('backtracking direct')
sol, m = backtracking.solve(sample, use_mrv=True, forward_check=True)
print(bool(sol), m)
print('ac3 direct')
sol, m = ac3.solve(sample, use_mrv=True, forward_check=True)
print(bool(sol), m)
print('dancing direct')
sol, m = dancing_links.solve(sample)
print(bool(sol), m)
print('api test')
with app.test_client() as c:
    for alg in ['backtracking', 'ac3', 'dancing_links']:
        resp = c.post('/api/solve', json={'puzzle': sample, 'algorithm': alg, 'options': {'mrv': True, 'forward_check': True}})
        print(alg, resp.status_code, resp.get_json())
