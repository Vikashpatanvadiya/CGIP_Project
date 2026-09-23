"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module
Course tie-in: CMP513/CMP514 Computer Graphics labs — Bresenham's line-drawing
algorithm (Lab 5 / Tutorial 4).

The live GUI needs to draw a bounding box and a name label around every detected
face. Rather than only calling cv2.rectangle/cv2.putText, the bounding box outline
is plotted with a from-scratch Bresenham's algorithm so the integer-only,
midpoint-decision-parameter line algorithm from the graphics labs is actually put
to use on real image data instead of only a Turbo C canvas.
"""

import numpy as np


def bresenham_points(x1: int, y1: int, x2: int, y2: int) -> list[tuple[int, int]]:
    """Return every pixel (x, y) on the line from (x1, y1) to (x2, y2) using
    Bresenham's algorithm, generalized to all 8 octants (handles lines that
    are steep, shallow, or run right-to-left/bottom-to-top).
    """
    points = []
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    sx = 1 if x2 >= x1 else -1
    sy = 1 if y2 >= y1 else -1

    x, y = x1, y1

    if dx >= dy:
        d = 2 * dy - dx
        for _ in range(dx + 1):
            points.append((x, y))
            if d >= 0:
                y += sy
                d += 2 * dy - 2 * dx
            else:
                d += 2 * dy
            x += sx
    else:
        d = 2 * dx - dy
        for _ in range(dy + 1):
            points.append((x, y))
            if d >= 0:
                x += sx
                d += 2 * dx - 2 * dy
            else:
                d += 2 * dx
            y += sy

    return points


def _set_pixel(frame: np.ndarray, x: int, y: int, color: tuple[int, int, int], thickness: int = 2) -> None:
    h, w = frame.shape[:2]
    half = thickness // 2
    y0, y1 = max(0, y - half), min(h, y + half + 1)
    x0, x1 = max(0, x - half), min(w, x + half + 1)
    if y0 < y1 and x0 < x1:
        frame[y0:y1, x0:x1] = color


def draw_bresenham_rect(
    frame: np.ndarray,
    top_left: tuple[int, int],
    bottom_right: tuple[int, int],
    color: tuple[int, int, int] = (0, 200, 0),
    thickness: int = 2,
) -> None:
    """Draw a rectangle's 4 edges on `frame` (in place) using Bresenham's
    algorithm for each edge instead of a filled/library rectangle primitive.
    """
    x1, y1 = top_left
    x2, y2 = bottom_right

    edges = [
        ((x1, y1), (x2, y1)),  # top
        ((x2, y1), (x2, y2)),  # right
        ((x2, y2), (x1, y2)),  # bottom
        ((x1, y2), (x1, y1)),  # left
    ]

    for (ax, ay), (bx, by) in edges:
        for (px, py) in bresenham_points(ax, ay, bx, by):
            _set_pixel(frame, px, py, color, thickness)
