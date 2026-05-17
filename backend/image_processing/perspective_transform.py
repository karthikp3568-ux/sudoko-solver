import cv2
import numpy as np


def sort_corners(pts):
    rect = np.zeros((4, 2), dtype='float32')
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def warp_to_topdown(gray_img, contour, size=450):
    pts = contour.reshape(4, 2).astype('float32')
    source = sort_corners(pts)
    destination = np.array([[0, 0], [size - 1, 0], [size - 1, size - 1], [0, size - 1]], dtype='float32')
    matrix = cv2.getPerspectiveTransform(source, destination)
    warped = cv2.warpPerspective(gray_img, matrix, (size, size))
    return warped
