"""
Module Owner: Maitra Prajapati (24000493) — Face Detection Module
Course tie-in: CMP513/CMP514 Image Processing fundamentals — pixel-level operations,
matrix-based convolution, and histogram-based intensity transforms.

These are hand-written, pixel-level implementations of the classic preprocessing
steps (grayscale conversion, Gaussian smoothing, histogram equalization) instead of
opaque single-line library calls, so the underlying pixel/matrix math taught in
class is visible in the pipeline. OpenCV is still used elsewhere for performance-
critical, real-time paths (face detection); this module is the "show the work" layer.
"""

import numpy as np


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert an HxWx3 BGR image to grayscale using the luminosity weighting
    per pixel: Y = 0.114*B + 0.587*G + 0.299*R (OpenCV channel order is BGR).
    Every output pixel is a weighted sum of the same input pixel's 3 channels.
    """
    if image.ndim == 2:
        return image.astype(np.uint8)
    b = image[:, :, 0].astype(np.float32)
    g = image[:, :, 1].astype(np.float32)
    r = image[:, :, 2].astype(np.float32)
    gray = 0.114 * b + 0.587 * g + 0.299 * r
    return np.clip(np.round(gray), 0, 255).astype(np.uint8)


def gaussian_kernel(size: int = 5, sigma: float = 1.0) -> np.ndarray:
    """Build a size x size Gaussian convolution kernel (matrix), normalized to sum 1."""
    ax = np.arange(size) - size // 2
    xx, yy = np.meshgrid(ax, ax)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2.0 * sigma ** 2))
    return kernel / kernel.sum()


def convolve2d(gray: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Manual 2D convolution of a grayscale image with a square kernel matrix.
    Each output pixel is the weighted sum of the kernel-sized neighborhood around
    the corresponding input pixel (zero-padded at the borders).
    """
    kh, kw = kernel.shape
    pad_h, pad_w = kh // 2, kw // 2
    padded = np.pad(gray.astype(np.float32), ((pad_h, pad_h), (pad_w, pad_w)), mode="edge")
    out = np.zeros_like(gray, dtype=np.float32)

    h, w = gray.shape
    for i in range(h):
        for j in range(w):
            region = padded[i:i + kh, j:j + kw]
            out[i, j] = np.sum(region * kernel)
    return np.clip(out, 0, 255).astype(np.uint8)


def gaussian_blur(gray: np.ndarray, size: int = 5, sigma: float = 1.0) -> np.ndarray:
    """Noise reduction via Gaussian smoothing (matrix convolution)."""
    kernel = gaussian_kernel(size, sigma)
    return convolve2d(gray, kernel)


def histogram_equalize(gray: np.ndarray) -> np.ndarray:
    """Normalize lighting variation by remapping pixel intensities using the
    cumulative distribution function (CDF) of the image's own histogram.

    Steps (per the course's pixel-transform model):
      1. Build the 256-bin intensity histogram of the image.
      2. Compute its CDF and scale it to the 0-255 range.
      3. Replace every pixel's intensity with the scaled CDF value at that intensity.
    """
    histogram, _ = np.histogram(gray.flatten(), bins=256, range=(0, 256))
    cdf = histogram.cumsum()
    cdf_min = cdf[cdf > 0].min() if (cdf > 0).any() else 0
    denom = (gray.size - cdf_min)
    if denom <= 0:
        return gray.copy()
    cdf_normalized = np.round((cdf - cdf_min) / denom * 255).clip(0, 255).astype(np.uint8)
    return cdf_normalized[gray]


def preprocess_face(image: np.ndarray, target_size: tuple[int, int] = (128, 128)) -> np.ndarray:
    """Full pixel-level preprocessing pipeline applied before feature extraction:
    grayscale -> denoise (Gaussian) -> normalize lighting (histogram equalization) -> resize.
    """
    import cv2  # local import: resize alone is not worth a manual pixel loop

    gray = to_grayscale(image)
    denoised = gaussian_blur(gray, size=5, sigma=1.0)
    normalized = histogram_equalize(denoised)
    resized = cv2.resize(normalized, target_size, interpolation=cv2.INTER_AREA)
    return resized
