import cv2

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

    height, width = cell_img.shape[:2]
    margin = max(2, int(min(height, width) * 0.10))
    if height > margin * 2 and width > margin * 2:
        cell_img = cell_img[margin:height - margin, margin:width - margin]

    resized = cv2.resize(cell_img, (160, 160), interpolation=cv2.INTER_CUBIC)

    reader = get_reader()
    results = reader.readtext(
        resized,
        detail=1,
        allowlist='123456789',
        paragraph=False,
        text_threshold=0.1,
        low_text=0.1,
    )
    best_digit = 0
    best_confidence = 0.0

    for _, text, confidence in results:
        digits = [char for char in text.strip() if char in '123456789']
        if len(digits) == 1:
            if confidence > best_confidence:
                best_digit = int(digits[0])
                best_confidence = confidence

    if best_confidence < 0.25:
        return 0
    return best_digit
