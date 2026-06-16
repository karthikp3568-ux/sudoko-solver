from flask import Flask, request, jsonify, send_from_directory
import copy
import random
import tempfile
import time
import numpy as np

import os
from backend.image_processing import parse_sudoku_image, validate_sudoku_board

DIST = os.path.join(os.path.dirname(__file__), 'react-ui', 'dist')
app = Flask(__name__, static_folder=DIST, static_url_path='')
IMAGE_DEBUG_DIR = os.path.join(os.path.dirname(__file__), 'backend', 'debug')
os.makedirs(IMAGE_DEBUG_DIR, exist_ok=True)

DIFFICULTY_HOLES = {
    'easy': 36,
    'medium': 40,
    'hard': 44,
    'expert': 48,
    'extreme': 52
}

PREDEFINED_NAMES = {
    'easy': 'Easy Puzzle',
    'medium': 'Medium Puzzle',
    'hard': 'Hard Puzzle',
    'expert': 'Expert Puzzle',
    'extreme': 'Extreme Puzzle'
}


def is_valid(grid, row, col, num):
    for c in range(9):
        if grid[row][c] == num:
            return False
    for r in range(9):
        if grid[r][col] == num:
            return False
    br = (row // 3) * 3
    bc = (col // 3) * 3
    for r in range(br, br + 3):
        for c in range(bc, bc + 3):
            if grid[r][c] == num:
                return False
    return True


def find_empty(grid):
    for r in range(9):
        for c in range(9):
            if grid[r][c] == 0:
                return r, c
    return None


def solve_backtrack(grid, limit=2):
    empty = find_empty(grid)
    if not empty:
        return True, 0, 0

    row, col = empty
    cells_tried = 0
    backtracks = 0

    for num in random.sample(range(1, 10), 9):
        cells_tried += 1
        if not is_valid(grid, row, col, num):
            continue
        grid[row][col] = num
        solved, extra_tried, extra_backtracks = solve_backtrack(grid, limit)
        cells_tried += extra_tried
        backtracks += extra_backtracks
        if solved:
            return True, cells_tried, backtracks
        grid[row][col] = 0
        backtracks += 1

    return False, cells_tried, backtracks


def count_solutions(grid, limit=2):
    grid_copy = copy.deepcopy(grid)

    def search():
        empty = find_empty(grid_copy)
        if not empty:
            return 1

        row, col = empty
        count = 0
        for num in range(1, 10):
            if not is_valid(grid_copy, row, col, num):
                continue
            grid_copy[row][col] = num
            count += search()
            grid_copy[row][col] = 0
            if count >= limit:
                return limit
        return count

    return search()


def get_neighbors(r, c):
    neighbors = set()
    for i in range(9):
        if i != c:
            neighbors.add(f"{r},{i}")
        if i != r:
            neighbors.add(f"{i},{c}")
    br = (r // 3) * 3
    bc = (c // 3) * 3
    for rr in range(br, br + 3):
        for cc in range(bc, bc + 3):
            if rr != r or cc != c:
                neighbors.add(f"{rr},{cc}")
    return neighbors


def revise(domains, xi, xj):
    revised = False
    to_remove = []
    for x in domains[xi]:
        has_support = False
        for y in domains[xj]:
            if y != x:
                has_support = True
                break
        if not has_support:
            to_remove.append(x)
            revised = True
    for x in to_remove:
        domains[xi].remove(x)
    return revised


def ac3(domains):
    from collections import deque
    queue = deque()
    for r in range(9):
        for c in range(9):
            xi = f"{r},{c}"
            for xj in get_neighbors(r, c):
                queue.append((xi, xj))
    while queue:
        xi, xj = queue.popleft()
        if revise(domains, xi, xj):
            if not domains[xi]:
                return False
            r, c = map(int, xi.split(','))
            for xk in get_neighbors(r, c):
                if xk != xj:
                    queue.append((xk, xi))
    return True


def backtrack_ac3(grid, domains):
    # Find MRV
    min_size = 10
    min_r, min_c = -1, -1
    for r in range(9):
        for c in range(9):
            if grid[r][c] == 0:
                sz = len(domains[f"{r},{c}"])
                if sz < min_size:
                    min_size = sz
                    min_r, min_c = r, c
    if min_r == -1:
        return grid, 0, 0  # solved

    cells_tried = 0
    backtracks = 0
    for num in list(domains[f"{min_r},{min_c}"]):
        cells_tried += 1
        if is_valid(grid, min_r, min_c, num):
            new_grid = [row[:] for row in grid]
            new_grid[min_r][min_c] = num
            # Forward checking: copy domains and set
            new_domains = {k: set(v) for k, v in domains.items()}
            new_domains[f"{min_r},{min_c}"] = {num}
            # Run AC-3 on new domains
            if ac3(new_domains):
                result, extra_tried, extra_back = backtrack_ac3(new_grid, new_domains)
                cells_tried += extra_tried
                backtracks += extra_back
                if result:
                    return result, cells_tried, backtracks
            backtracks += 1
    return None, cells_tried, backtracks


def sort_corners(pts):
    rect = np.zeros((4, 2), dtype='float32')
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def find_sudoku_contour(thresh):
    import cv2

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    best_area = 0
    for contour in contours:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            if area > best_area:
                best_area = area
                best = approx
    if best is not None:
        return best
    if contours:
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)
        return np.array([[[x, y]], [[x + w, y]], [[x + w, y + h]], [[x, y + h]]], dtype=np.int32)
    return None


def warp_sudoku_board(gray, contour, size=450):
    import cv2

    rectangle = sort_corners(contour.reshape(4, 2))
    destination = np.array([[0, 0], [size - 1, 0], [size - 1, size - 1], [0, size - 1]], dtype='float32')
    matrix = cv2.getPerspectiveTransform(rectangle, destination)
    return cv2.warpPerspective(gray, matrix, (size, size))


def validate_sudoku_board(grid):
    if not isinstance(grid, list) or len(grid) != 9:
        return False
    for row in grid:
        if not isinstance(row, list) or len(row) != 9:
            return False
        for value in row:
            if not isinstance(value, int) or value < 0 or value > 9:
                return False
    def valid_unit(cells):
        nums = [n for n in cells if n != 0]
        return len(nums) == len(set(nums))
    for i in range(9):
        if not valid_unit([grid[i][j] for j in range(9)]):
            return False
        if not valid_unit([grid[j][i] for j in range(9)]):
            return False
    for br in (0, 3, 6):
        for bc in (0, 3, 6):
            block = [grid[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)]
            if not valid_unit(block):
                return False
    return True


def preprocess_cell(cell):
    import cv2

    h, w = cell.shape[:2]
    margin = max(1, int(min(h, w) * 0.12))
    if h > 2 * margin and w > 2 * margin:
        cell = cell[margin:h-margin, margin:w-margin]
    blur = cv2.GaussianBlur(cell, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    clean = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    clean[:2, :] = 0
    clean[-2:, :] = 0
    clean[:, :2] = 0
    clean[:, -2:] = 0
    return clean


def extract_digit_from_cell(cell):
    try:
        import cv2
        import pytesseract
        import re
        import numpy as np

        clean = preprocess_cell(cell)
        if np.count_nonzero(clean) < clean.size * 0.02:
            return 0

        contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return 0
        digit_contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(digit_contour) < 80:
            return 0

        x, y, w, h = cv2.boundingRect(digit_contour)
        roi = clean[y:y+h, x:x+w]
        if roi.size == 0:
            return 0
        roi = cv2.resize(roi, (32, 32), interpolation=cv2.INTER_AREA)
        config = '--psm 10 -c tessedit_char_whitelist=123456789'
        text = pytesseract.image_to_string(roi, config=config)
        found = re.search(r'[1-9]', text)
        if found:
            return int(found.group())
    except Exception as e:
        print(f"[CELL OCR] Error extracting digit: {e}")
    return 0


def extract_sudoku_grid(image_path):
    """Extract Sudoku grid from image using computer vision and per-cell digit recognition."""
    try:
        import cv2
        import numpy as np
        img = cv2.imread(image_path)
        if img is None:
            return {'success': False, 'grid': None, 'reason': 'Could not read the image file. Ensure it is a valid image format (PNG, JPG, etc.).'}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        thresh = cv2.bitwise_not(thresh)
        kernel = np.ones((5, 5), np.uint8)
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        grid_contour = find_sudoku_contour(closed)
        if grid_contour is None:
            return {'success': False, 'grid': None, 'reason': 'Could not find the Sudoku grid in the image. Please upload a clearer, top-down photo.'}

        area = cv2.contourArea(grid_contour)
        if area < 2500:
            return {'success': False, 'grid': None, 'reason': 'Detected grid is too small. Please upload a larger or closer image.'}

        grid_img = warp_sudoku_board(gray, grid_contour, size=450)
        grid_img = cv2.resize(grid_img, (450, 450), interpolation=cv2.INTER_AREA)

        grid = []
        filled_count = 0
        for row in range(9):
            cells = []
            for col in range(9):
                y1, y2 = row * 50, (row + 1) * 50
                x1, x2 = col * 50, (col + 1) * 50
                cell = grid_img[y1:y2, x1:x2]
                if cell.size == 0:
                    cells.append(0)
                    continue
                digit = extract_digit_from_cell(cell)
                if digit != 0:
                    filled_count += 1
                cells.append(digit)
            grid.append(cells)

        if filled_count < 15:
            return {'success': False, 'grid': None, 'reason': 'Could not reliably recognize enough digits. Please upload a clearer, top-down photo of the grid.'}

        if not validate_sudoku_board(grid):
            return {'success': False, 'grid': None, 'reason': 'Extracted puzzle is invalid or contains duplicate digits. Please verify the photo and try again.'}

        return {'success': True, 'grid': grid, 'reason': 'Grid extracted successfully.'}

    except Exception as e:
        return {'success': False, 'grid': None, 'reason': f'Processing error: {str(e)}. Ensure the image is clear and contains a visible Sudoku grid.'}


def recognize_digit_contour(cell_img):
    return 0


def generate_full_grid():
    grid = [[0] * 9 for _ in range(9)]
    solved, _, _ = solve_backtrack(grid)
    if solved:
        return grid
    raise RuntimeError('Unable to create a complete Sudoku grid')


def make_puzzle(difficulty):
    holes = DIFFICULTY_HOLES.get(difficulty, 40)
    full_grid = generate_full_grid()
    puzzle = copy.deepcopy(full_grid)
    removed = 0
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)

    for row, col in positions:
        if removed >= holes:
            break
        backup = puzzle[row][col]
        puzzle[row][col] = 0
        solutions = count_solutions(puzzle, limit=2)
        if solutions != 1:
            puzzle[row][col] = backup
        else:
            removed += 1

    return puzzle


def solve_grid(grid):
    start = time.time()
    # Initialize domains
    domains = {}
    for r in range(9):
        for c in range(9):
            key = f"{r},{c}"
            if grid[r][c] != 0:
                domains[key] = {grid[r][c]}
            else:
                domains[key] = set(range(1, 10))
    # Run initial AC-3
    if not ac3(domains):
        end = time.time()
        return {
            'solved': False,
            'grid': grid,
            'time': round((end - start) * 1000, 2),
            'cellsTried': 0,
            'backtracks': 0
        }
    # Build grid from domains
    solved_grid = [row[:] for row in grid]
    for r in range(9):
        for c in range(9):
            if solved_grid[r][c] == 0 and len(domains[f"{r},{c}"]) == 1:
                solved_grid[r][c] = list(domains[f"{r},{c}"])[0]
    # Now backtrack
    result, cells_tried, backtracks = backtrack_ac3(solved_grid, domains)
    end = time.time()
    return {
        'solved': result is not None,
        'grid': result if result else grid,
        'time': round((end - start) * 1000, 2),
        'cellsTried': cells_tried,
        'backtracks': backtracks
    }


@app.route('/')
def index():
    return send_from_directory(DIST, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    full = os.path.join(DIST, path)
    if os.path.isfile(full):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, 'index.html')


PREDEFINED_PUZZLES = [
    {'id': 'easy1',    'name': 'Classic Easy',    'difficulty': 'easy',
     'grid': [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
              [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
              [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]]},
    {'id': 'medium1',  'name': 'Medium Challenge', 'difficulty': 'medium',
     'grid': [[0,0,0,2,6,0,7,0,1],[6,8,0,0,7,0,0,9,0],[1,9,0,0,0,4,5,0,0],
              [8,2,0,1,0,0,0,4,0],[0,0,4,6,0,2,9,0,0],[0,5,0,0,0,3,0,2,8],
              [0,0,9,3,0,0,0,7,4],[0,4,0,0,5,0,0,3,6],[7,0,3,0,1,8,0,0,0]]},
    {'id': 'hard1',    'name': 'Hard — Minimal',  'difficulty': 'hard',
     'grid': [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,3,0,8,5],[0,0,1,0,2,0,0,0,0],
              [0,0,0,5,0,7,0,0,0],[0,0,4,0,0,0,1,0,0],[0,9,0,0,0,0,0,0,0],
              [5,0,0,0,0,0,0,7,3],[0,0,2,0,1,0,0,0,0],[0,0,0,0,4,0,0,0,9]]},
    {'id': 'expert1',  'name': 'Expert Level',    'difficulty': 'expert',
     'grid': [[0,0,0,8,0,1,0,0,0],[0,0,0,0,0,0,4,3,0],[5,0,0,0,0,0,0,0,0],
              [0,0,0,0,7,0,8,0,0],[0,0,0,0,0,0,1,0,0],[0,2,0,0,3,0,0,0,0],
              [6,0,0,0,0,0,0,7,5],[0,0,3,4,0,0,0,0,0],[0,0,0,2,0,0,6,0,0]]},
    {'id': 'extreme1', 'name': 'Extreme',         'difficulty': 'extreme',
     'grid': [[0,0,0,0,0,0,0,1,0],[4,0,0,0,0,0,0,0,0],[0,2,0,0,0,0,0,0,0],
              [0,0,0,0,5,0,4,0,7],[0,0,8,0,0,0,3,0,0],[0,0,1,0,9,0,0,0,0],
              [3,0,0,4,0,0,2,0,0],[0,5,0,1,0,0,0,0,0],[0,0,0,8,0,6,0,0,0]]},
]


def _pure_backtrack(grid):
    """Backtracking with MRV + forward checking where available."""
    try:
        from backend.algorithms.backtracking import solve as bt_solve
        solution, metrics = bt_solve(grid, use_mrv=True, forward_check=True)
        if solution:
            return {
                'solved': True,
                'grid': solution,
                'time': round(metrics.get('time_sec', 0) * 1000, 2),
                'cellsTried': metrics.get('recursion_calls', 0),
                'backtracks': metrics.get('backtracks', 0)
            }
    except Exception:
        pass

    g = [r[:] for r in grid]
    cells_tried = backtracks = 0

    def valid(r, c, n):
        for i in range(9):
            if g[r][i] == n or g[i][c] == n:
                return False
        br, bc = (r // 3) * 3, (c // 3) * 3
        for dr in range(3):
            for dc in range(3):
                if g[br+dr][bc+dc] == n:
                    return False
        return True

    def find_best_cell():
        best = None
        best_count = 10
        for r in range(9):
            for c in range(9):
                if g[r][c] != 0:
                    continue
                count = 0
                for n in range(1, 10):
                    if valid(r, c, n):
                        count += 1
                if count == 0:
                    return None
                if count < best_count:
                    best_count = count
                    best = (r, c)
                    if best_count == 1:
                        return best
        return best

    def bt():
        nonlocal cells_tried, backtracks
        cell = find_best_cell()
        if cell is None:
            # no empty cell or unsolvable
            for r in range(9):
                for c in range(9):
                    if g[r][c] == 0:
                        return False
            return True

        r, c = cell
        candidates = [n for n in range(1, 10) if valid(r, c, n)]
        # least-constraining ordering: prioritize values with fewer conflicts
        candidates.sort(key=lambda n: sum(1 for rr in range(9) if g[rr][c] == 0 and valid(rr, c, n)) +
                                     sum(1 for cc in range(9) if g[r][cc] == 0 and valid(r, cc, n)))

        for n in candidates:
            cells_tried += 1
            g[r][c] = n
            if bt():
                return True
            g[r][c] = 0
            backtracks += 1
        return False

    t0 = time.time()
    solved = bt()
    return {'solved': solved, 'grid': g, 'time': round((time.time()-t0)*1000, 2),
            'cellsTried': cells_tried, 'backtracks': backtracks}


def _dlx_solve(puzzle):
    """Dancing Links / Algorithm X solver."""
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(__file__))
        from backend.algorithms.dancing_links import solve as dlx
        t0 = time.time()
        solution, metrics = dlx(puzzle)
        elapsed = round((time.time()-t0)*1000, 2)
        if solution:
            return {'solved': True, 'grid': solution,
                    'time': round(metrics.get('time_sec', 0)*1000, 2),
                    'cellsTried': metrics.get('recursion_calls', 0),
                    'backtracks': 0}
    except Exception:
        pass
    # Fallback to pure BT if DLX import fails
    return _pure_backtrack(puzzle)


def _run_algorithm(grid, algorithm):
    if algorithm == 'backtracking':
        return _pure_backtrack(grid)
    elif algorithm == 'dancing_links':
        return _dlx_solve(grid)
    else:  # ac3 (default)
        return solve_grid(grid)


@app.route('/api/solve', methods=['POST'])
def api_solve():
    data = request.get_json() or {}
    grid = data.get('grid')
    algorithm = data.get('algorithm', 'ac3')
    if not validate_sudoku_board(grid):
        return jsonify({'solved': False, 'message': 'Grid must be a valid 9x9 Sudoku board.'}), 400
    result = _run_algorithm(grid, algorithm)
    return jsonify(result)


@app.route('/api/compare', methods=['POST'])
def api_compare():
    data = request.get_json() or {}
    grid = data.get('grid')
    algorithms = data.get('algorithms', ['backtracking', 'ac3', 'dancing_links'])
    if not validate_sudoku_board(grid):
        return jsonify({'error': 'Grid must be a valid 9x9 Sudoku board.'}), 400
    results = {}
    for alg in algorithms:
        try:
            results[alg] = _run_algorithm([r[:] for r in grid], alg)
        except Exception as e:
            results[alg] = {'solved': False, 'error': str(e)}
    return jsonify(results)


@app.route('/api/benchmark', methods=['POST'])
def api_benchmark():
    data = request.get_json() or {}
    puzzle_ids = data.get('puzzles', [p['id'] for p in PREDEFINED_PUZZLES])
    algorithms = data.get('algorithms', ['backtracking', 'ac3', 'dancing_links'])
    lookup = {p['id']: p for p in PREDEFINED_PUZZLES}
    results = []
    for pid in puzzle_ids:
        pz = lookup.get(pid)
        if not pz:
            continue
        row = {'id': pid, 'name': pz['name'], 'difficulty': pz['difficulty'], 'algorithms': {}}
        for alg in algorithms:
            try:
                row['algorithms'][alg] = _run_algorithm([r[:] for r in pz['grid']], alg)
            except Exception as e:
                row['algorithms'][alg] = {'solved': False, 'error': str(e)}
        results.append(row)
    return jsonify(results)


@app.route('/api/puzzles')
def api_puzzles():
    return jsonify([{'id': p['id'], 'name': p['name'], 'difficulty': p['difficulty']}
                    for p in PREDEFINED_PUZZLES])


@app.route('/api/puzzle')
def api_puzzle():
    difficulty = request.args.get('difficulty', 'medium').lower()
    if difficulty not in DIFFICULTY_HOLES:
        difficulty = 'medium'

    puzzle = make_puzzle(difficulty)
    return jsonify({
        'difficulty': difficulty,
        'name': PREDEFINED_NAMES.get(difficulty, 'Backend Puzzle'),
        'grid': puzzle
    })


def _process_image_upload(file):
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected.'}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] or '.png') as temp_file:
        temp_path = temp_file.name
        file.save(temp_path)

    try:
        print(f"[UPLOAD] Saved temporary file: {temp_path}")
        board = parse_sudoku_image(temp_path, debug_dir=IMAGE_DEBUG_DIR)
        if not validate_sudoku_board(board):
            return jsonify({'success': False, 'message': 'Detected board is invalid or contains duplicate digits.'}), 400
        return jsonify({'success': True, 'board': board, 'message': 'Sudoku grid detected successfully.'})
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        print(f"[UPLOAD] Unexpected error: {exc}")
        return jsonify({'success': False, 'message': 'Image processing failed. Please upload a clearer photo.'}), 500
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file provided.'}), 400
    return _process_image_upload(request.files['image'])


@app.route('/api/check_image', methods=['POST'])
def api_check_image():
    return upload_image()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)
