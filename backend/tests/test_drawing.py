"""Module Owner: Vikas Patanwadiya (24000605) — Testing & Documentation"""

import numpy as np

from backend.vision.drawing import bresenham_points, draw_bresenham_rect


def test_bresenham_points_includes_both_endpoints():
    points = bresenham_points(0, 0, 5, 2)
    assert points[0] == (0, 0)
    assert points[-1] == (5, 2)


def test_bresenham_points_handles_vertical_line():
    points = bresenham_points(3, 0, 3, 4)
    assert all(x == 3 for x, y in points)
    assert len(points) == 5


def test_bresenham_points_handles_reversed_direction():
    forward = bresenham_points(0, 0, 4, 4)
    backward = bresenham_points(4, 4, 0, 0)
    assert set(forward) == set(backward)


def test_draw_bresenham_rect_colors_border_pixels():
    frame = np.zeros((50, 50, 3), dtype=np.uint8)
    draw_bresenham_rect(frame, (5, 5), (20, 20), color=(0, 255, 0), thickness=1)

    assert tuple(frame[5, 5]) == (0, 255, 0)
    assert tuple(frame[20, 5]) == (0, 255, 0)
    assert tuple(frame[25, 25]) == (0, 0, 0)  # interior/outside untouched
