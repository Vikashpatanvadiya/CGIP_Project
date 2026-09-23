"""
Module Owner: Maitra Prajapati (24000493) — Face Detection Module

Real-time face detection using OpenCV's pretrained Haar Cascade classifier.
Detection has to run on every incoming frame at interactive speed, so this
step (unlike preprocessing/LBP) deliberately uses OpenCV's optimized C++
implementation rather than a hand-rolled sliding-window scan.
"""

from dataclasses import dataclass

import cv2
import numpy as np

_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_detector = cv2.CascadeClassifier(_CASCADE_PATH)


@dataclass
class FaceBox:
    x: int
    y: int
    w: int
    h: int

    @property
    def top_left(self) -> tuple[int, int]:
        return self.x, self.y

    @property
    def bottom_right(self) -> tuple[int, int]:
        return self.x + self.w, self.y + self.h


def detect_faces(frame_bgr: np.ndarray, min_size: int = 60) -> list[FaceBox]:
    """Detect all faces in a BGR frame. Returns bounding boxes in pixel
    coordinates of the original frame.
    """
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)  # quick lighting normalization before detection

    boxes = _detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(min_size, min_size),
    )
    return [FaceBox(int(x), int(y), int(w), int(h)) for (x, y, w, h) in boxes]


def crop_face(frame_bgr: np.ndarray, box: FaceBox) -> np.ndarray:
    """Extract the face region described by `box` from the full frame."""
    x1, y1 = box.top_left
    x2, y2 = box.bottom_right
    h, w = frame_bgr.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    return frame_bgr[y1:y2, x1:x2]
