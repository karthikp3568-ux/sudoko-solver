import os
import numpy as np
from .preprocess import ensure_debug_dir, load_image, prepare_grid_mask, save_debug_image
from .grid_detector import find_grid_contour, draw_contour_overlay
from .perspective_transform import warp_to_topdown
from .cell_extractor import split_board_into_cells, clean_cell, is_cell_blank
from .easyocr_reader import read_digit_from_cell


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


def parse_sudoku_image(image_path, debug_dir=None):
    debug_dir = ensure_debug_dir(debug_dir)
    image = load_image(image_path)
    gray, closed, thresh = prepare_grid_mask(image)
    save_debug_image(debug_dir, 'grayscale', gray)
    save_debug_image(debug_dir, 'threshold', thresh)

    contour = find_grid_contour(closed)
    if contour is None:
        raise ValueError('Could not detect a Sudoku grid in this image.')

    contour_overlay = draw_contour_overlay(gray, contour)
    save_debug_image(debug_dir, 'contour_overlay', contour_overlay)

    warped = warp_to_topdown(gray, contour)
    save_debug_image(debug_dir, 'warped', warped)

    cells = split_board_into_cells(warped)
    board = []
    filled = 0

    for row_idx, row in enumerate(cells):
        board_row = []
        for col_idx, cell in enumerate(row):
            clean = clean_cell(cell)
            save_debug_image(debug_dir, f'cell_{row_idx}_{col_idx}', clean)
            if is_cell_blank(clean):
                board_row.append(0)
                continue

            digit = read_digit_from_cell(clean)
            if digit != 0:
                filled += 1
            board_row.append(digit)
        board.append(board_row)

    if filled < 15:
        raise ValueError('Detected too few digits. Please upload a clearer, high-resolution Sudoku photo.')

    if not validate_sudoku_board(board):
        raise ValueError('Detected board contains invalid or duplicate digits.')

    return board
