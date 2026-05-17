import cv2
import pytesseract
import numpy as np


def image_to_grid(image_path):
    # Simple OCR wrapper: assumes a clean top-down Sudoku image.
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # adaptive threshold
    th = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY_INV, 11, 2)
    # TODO: detect largest contour as grid, warp perspective, split into 9x9
    # For now, run OCR on the whole image and try to parse digits
    config = '--psm 6 digits'
    text = pytesseract.image_to_string(th, config=config)
    digits = [c for c in text if c.isdigit()]
    if len(digits) >= 81:
        digits = digits[:81]
    else:
        # pad unknowns
        digits = digits + ['0'] * (81 - len(digits))
    grid = []
    for i in range(9):
        row = [int(digits[i*9 + j]) for j in range(9)]
        grid.append(row)
    return grid


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('usage: python ocr.py path/to/image')
    else:
        g = image_to_grid(sys.argv[1])
        for r in g:
            print(r)
