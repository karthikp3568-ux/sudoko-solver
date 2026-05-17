import os
import cv2
import numpy as np


def ensure_debug_dir(debug_dir):
    if not debug_dir:
        return None
    os.makedirs(debug_dir, exist_ok=True)
    return debug_dir


def save_debug_image(debug_dir, name, image):
    if not debug_dir:
        return None
    path = os.path.join(debug_dir, f"{name}.png")
    cv2.imwrite(path, image)
    return path


def load_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError('Unable to load image from path: {}'.format(image_path))
    return image


def to_grayscale(image):
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def prepare_grid_mask(image):
    gray = to_grayscale(image)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    thresh = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2
    )
    thresh = cv2.bitwise_not(thresh)
    kernel = np.ones((5, 5), np.uint8)
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    return gray, closed, thresh
