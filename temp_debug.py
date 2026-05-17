from backend.algorithms.backtracking import solve
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
for mrv in [False, True]:
    for fc in [False, True]:
        sol, metrics = solve(sample, use_mrv=mrv, forward_check=fc, time_limit=5)
        print(f'mrv={mrv} fc={fc} solved={bool(sol)} calls={metrics["recursion_calls"]} success={metrics["success"]}')
        if sol:
            for row in sol:
                print(row)
            print('---')
