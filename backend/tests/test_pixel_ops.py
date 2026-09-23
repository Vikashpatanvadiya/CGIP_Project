"""Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Testing & Documentation"""

import numpy as np

from backend.vision.pixel_ops import to_grayscale, gaussian_kernel, gaussian_blur, histogram_equalize


def test_to_grayscale_matches_weighted_formula():
    image = np.zeros((2, 2, 3), dtype=np.uint8)
    image[0, 0] = (10, 20, 30)  # B, G, R

    gray = to_grayscale(image)
    expected = round(0.114 * 10 + 0.587 * 20 + 0.299 * 30)
    assert gray[0, 0] == expected


def test_gaussian_kernel_sums_to_one():
    kernel = gaussian_kernel(size=5, sigma=1.0)
    assert kernel.shape == (5, 5)
    assert np.isclose(kernel.sum(), 1.0)


def test_gaussian_blur_smooths_noise():
    rng = np.random.default_rng(42)
    gray = rng.integers(0, 256, size=(20, 20), dtype=np.uint8)
    blurred = gaussian_blur(gray, size=5, sigma=1.0)
    assert blurred.std() <= gray.std()


def test_histogram_equalize_expands_dynamic_range():
    gray = np.full((10, 10), 100, dtype=np.uint8)
    gray[0, 0] = 50
    gray[9, 9] = 150

    equalized = histogram_equalize(gray)
    assert equalized.min() == 0
    assert equalized.max() == 255
