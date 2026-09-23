"""Module Owner: Maitra Prajapati (24000493) & Vikas Patanwadiya (24000605) — Testing & Documentation"""

import numpy as np

from backend.vision.lbp import compute_lbp_image, lbp_histogram


def test_compute_lbp_image_flat_region_is_all_ones():
    # Every neighbor equals the center in a flat image -> all comparisons are
    # "neighbor >= center" -> every bit set -> code 255 everywhere.
    flat = np.full((10, 10), 128, dtype=np.uint8)
    lbp = compute_lbp_image(flat)
    assert np.all(lbp == 255)


def test_lbp_histogram_shape_and_normalization():
    rng = np.random.default_rng(0)
    gray = rng.integers(0, 256, size=(32, 32), dtype=np.uint8)

    features = lbp_histogram(gray, grid=(4, 4), bins=59)
    assert features.shape == (4 * 4 * 59,)

    # Each 59-bin cell histogram should sum to ~1 (it's a probability distribution).
    cell_sums = features.reshape(16, 59).sum(axis=1)
    assert np.allclose(cell_sums, 1.0, atol=1e-5)


def test_lbp_histogram_identical_images_have_zero_distance():
    rng = np.random.default_rng(1)
    gray = rng.integers(0, 256, size=(32, 32), dtype=np.uint8)

    f1 = lbp_histogram(gray)
    f2 = lbp_histogram(gray.copy())
    assert np.allclose(f1, f2)
