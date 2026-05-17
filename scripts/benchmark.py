import json
import time
from backend.algorithms import backtracking, ac3, heuristic_solver, dancing_links


def load_puzzles(path, count=100):
    with open(path, 'r', encoding='utf8') as f:
        data = json.load(f)
    if not data:
        return []
    # data entries may be flattened; normalize to 9x9
    puzzles = []
    for p in data:
        if isinstance(p, list) and len(p) == 81:
            grid = [p[i*9:(i+1)*9] for i in range(9)]
        elif isinstance(p, list) and len(p) == 9:
            grid = p
        else:
            continue
        puzzles.append(grid)
    # if too few, repeat
    while len(puzzles) < count:
        puzzles.extend(puzzles[:count - len(puzzles)])
    return puzzles[:count]


def run_benchmark(puzzles):
    algs = [
        ('backtracking', lambda g: backtracking.solve(g, use_mrv=False, forward_check=False)),
        ('backtracking_mrv_fc', lambda g: backtracking.solve(g, use_mrv=True, forward_check=True)),
        ('ac3', lambda g: ac3.solve(g)),
        ('heuristic', lambda g: heuristic_solver.solve(g)),
        ('dancing_links', lambda g: dancing_links.solve(g)),
    ]
    results = {name: [] for name, _ in algs}
    for i, p in enumerate(puzzles):
        print(f"Running puzzle {i+1}/{len(puzzles)}")
        for name, fn in algs:
            sol, metrics = fn(p)
            results[name].append(metrics)
    return results


def summarize(results):
    summary = {}
    for name, runs in results.items():
        times = [r.get('time_sec', 0) for r in runs if r]
        rec = [r.get('recursion_calls', 0) for r in runs if r]
        succ = sum(1 for r in runs if r and r.get('success'))
        summary[name] = {
            'count': len(runs),
            'success_rate': succ / len(runs),
            'avg_time_sec': sum(times) / len(times) if times else None,
            'avg_recursion': sum(rec) / len(rec) if rec else None
        }
    return summary


if __name__ == '__main__':
    puzzles = load_puzzles('datasets/puzzles.json', count=100)
    results = run_benchmark(puzzles)
    with open('datasets/benchmark_results.json', 'w', encoding='utf8') as f:
        json.dump(results, f, indent=2)
    summary = summarize(results)
    print('SUMMARY')
    print(json.dumps(summary, indent=2))
