import cv2
import numpy as np


def split_board_into_cells(board_img, size=450):
    cell_size = size // 9
    cells = []
    for row in range(9):
        row_cells = []
        for col in range(9):
            y1, y2 = row * cell_size, (row + 1) * cell_size
            x1, x2 = col * cell_size, (col + 1) * cell_size
            row_cells.append(board_img[y1:y2, x1:x2])
        cells.append(row_cells)
    return cells


def clean_cell(cell_img):
    gray = cv2.GaussianBlur(cell_img, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11,
        2
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
    clean = closed.copy()
    clean[:2, :] = 0
    clean[-2:, :] = 0
    clean[:, :2] = 0
    clean[:, -2:] = 0
    return clean


def is_cell_blank(cell_img, threshold=0.02):
    if cell_img is None or cell_img.size == 0:
        return True
    ink = cv2.countNonZero(cell_img)
    return ink < (cell_img.size * threshold)
