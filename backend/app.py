from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.algorithms import backtracking, ac3, heuristic_solver, dancing_links

app = Flask(__name__)
CORS(app)

def _normalize_grid(puzzle):
    if puzzle is None:
        return None
    # allow flat 81 list or 9x9
    if isinstance(puzzle, list) and len(puzzle) == 81 and all(isinstance(x, int) for x in puzzle):
        return [puzzle[i*9:(i+1)*9] for i in range(9)]
    return puzzle

@app.route('/api/solve', methods=['POST'])
def solve():
    data = request.get_json() or {}
    puzzle = _normalize_grid(data.get('puzzle'))
    alg = data.get('algorithm', 'backtracking')
    options = data.get('options', {}) or {}

    if puzzle is None:
        return jsonify({'error': 'no puzzle provided'}), 400

    if alg == 'backtracking':
        solution, metrics = backtracking.solve(puzzle, use_mrv=options.get('mrv', False), forward_check=options.get('forward_check', False))
    elif alg == 'ac3':
        solution, metrics = ac3.solve(puzzle, use_mrv=options.get('mrv', False), forward_check=options.get('forward_check', False))
    elif alg == 'heuristic':
        solution, metrics = heuristic_solver.solve(puzzle)
    elif alg == 'dancing_links':
        solution, metrics = dancing_links.solve(puzzle)
    else:
        return jsonify({'error': 'unknown algorithm'}), 400

    return jsonify({'solution': solution, 'metrics': metrics})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
