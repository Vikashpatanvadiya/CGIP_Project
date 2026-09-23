"""
Module Owner: Maitra Prajapati (24000493) & Vikas Patanwadiya (24000605)
             — Feature Extraction & Recognition Module
Course tie-in: CMP513/CMP514 Image Processing — Local Binary Patterns (LBP),
listed in the project's "Algorithms and Techniques" as the lightweight
feature-extraction alternative to a deep embedding model.

LBP is inherently a per-pixel, per-neighborhood operation: for every pixel we
look at its 8 surrounding pixels, threshold them against the center, and pack
the result into an 8-bit code. This module implements that from scratch and
turns the resulting LBP "texture map" into a fixed-length histogram feature
vector that can be compared with a distance metric (see recognition.py).
"""

import numpy as np

# Offsets of the 8 neighbors around a center pixel, in clockwise order starting
# from the top-left. Used to build the 8-bit Local Binary Pattern code.
_NEIGHBOR_OFFSETS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, 1),
    (1, 1), (1, 0), (1, -1),
    (0, -1),
]


def compute_lbp_image(gray: np.ndarray) -> np.ndarray:
    """Compute the Local Binary Pattern code for every interior pixel.

    For pixel (i, j): compare each of its 8 neighbors to the center pixel's
    intensity. neighbor >= center -> bit 1, else bit 0. The 8 bits, read in a
    fixed order, form an integer code 0-255 that captures the local texture
    pattern (edges, corners, flat regions all produce distinct codes).
    """
    h, w = gray.shape
    padded = np.pad(gray.astype(np.int16), 1, mode="edge")
    lbp = np.zeros((h, w), dtype=np.uint8)

    for bit, (di, dj) in enumerate(_NEIGHBOR_OFFSETS):
        neighbor = padded[1 + di:1 + di + h, 1 + dj:1 + dj + w]
        center = padded[1:1 + h, 1:1 + w]
        lbp |= ((neighbor >= center).astype(np.uint8) << bit)

    return lbp


def lbp_histogram(gray: np.ndarray, grid: tuple[int, int] = (8, 8), bins: int = 59) -> np.ndarray:
    """Turn an LBP code map into a fixed-length feature vector.

    The image is split into a grid of cells; each cell's 256 possible LBP
    codes are grouped into `bins` histogram buckets and normalized. Concatenating
    all cell histograms preserves coarse spatial layout (important for faces:
    eyes/nose/mouth regions should stay distinguishable) while keeping the
    vector length fixed regardless of face size.
    """
    lbp = compute_lbp_image(gray)
    h, w = lbp.shape
    gh, gw = grid
    cell_h, cell_w = h // gh, w // gw

    features = []
    for r in range(gh):
        for c in range(gw):
            cell = lbp[r * cell_h:(r + 1) * cell_h, c * cell_w:(c + 1) * cell_w]
            hist, _ = np.histogram(cell.flatten(), bins=bins, range=(0, 256))
            norm = hist.astype(np.float32)
            total = norm.sum()
            if total > 0:
                norm /= total
            features.append(norm)

    return np.concatenate(features)
