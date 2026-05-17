import cv2
import numpy as np
from PIL import Image

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    return _reader


def read_digit_from_cell(cell_img):
    if cell_img is None or cell_img.size == 0:
        return 0

    if len(cell_img.shape) == 3:
        cell_img = cv2.cvtColor(cell_img, cv2.COLOR_BGR2GRAY)

    padded = cv2.copyMakeBorder(cell_img, 8, 8, 8, 8, cv2.BORDER_CONSTANT, value=0)
    resized = cv2.resize(padded, (64, 64), interpolation=cv2.INTER_CUBIC)
    image = Image.fromarray(resized)

    reader = get_reader()
    results = reader.readtext(image, detail=1, allowlist='123456789')
    best_digit = 0
    best_confidence = 0.0

    for _, text, confidence in results:
        text = text.strip()
        if len(text) == 1 and text.isdigit() and text != '0':
            if confidence > best_confidence:
                best_digit = int(text)
                best_confidence = confidence

    if best_confidence < 0.3:
        return 0
    return best_digit
