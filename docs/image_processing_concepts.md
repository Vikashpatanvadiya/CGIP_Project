# Where the course topics show up in this project

`Topics/` holds the CMP513/CMP514 lab and tutorial material. This maps each
topic to the specific place it's used (or directly inspired) in the codebase,
so it's clear the project isn't just "call `face_recognition.detect()`" — the
underlying pixel/matrix/graphics concepts from class are implemented explicitly.

| Class topic | Where it's used |
|---|---|
| **Tutorial 1 & 2** — Matrices: types, addition, multiplication, determinant, inverse | An image *is* a matrix of pixel intensities. [`pixel_ops.py`](../backend/vision/pixel_ops.py) builds a Gaussian kernel **matrix** (`gaussian_kernel`) and applies it via matrix convolution (`convolve2d`) for noise reduction — the same "combine a matrix with a neighborhood of values" idea as matrix multiplication. |
| **Grayscale conversion** (Image Processing methodology, §11.2 of the report) | `to_grayscale()` in `pixel_ops.py` is a **per-pixel weighted sum** of the B/G/R channels (`0.114·B + 0.587·G + 0.299·R`) — the same channel-weighting idea used for luminosity-based grayscale everywhere. |
| **Histogram Equalization** (Algorithms & Techniques, §12) | `histogram_equalize()` in `pixel_ops.py` builds the image's own 256-bin histogram, computes its CDF, and remaps every pixel by that CDF — implemented by hand rather than a single library call, so the pixel-intensity-transform math is visible. |
| **Local Binary Patterns** (Algorithms & Techniques, §12) | `lbp.py` computes, per pixel, an 8-bit code from comparing its 8 neighbors against the center — the textbook LBP definition — then turns the code map into a histogram feature vector (`lbp_histogram`) used for recognition. |
| **Lab 4/5 & Tutorial 3/4** — DDA and Bresenham's line-drawing algorithms | `drawing.py` implements **Bresenham's algorithm** from scratch (`bresenham_points`) to plot the live face-detection bounding box, instead of only calling `cv2.rectangle`. The `_set_pixel` helper mirrors `putpixel()` from the `graphics.h` labs. |
| **Lab 1/3** — `graphics.h` basics: shapes, colors, simple animation via delay loops | The live GUI (`LiveAttendance.jsx`) redraws the bounding-box overlay on a `<canvas>` every capture cycle — the same "clear, redraw, delay" animation loop taught with `graphics.h`, just running in a browser canvas instead of a Turbo C window. |
| **k-Nearest Neighbours / distance metrics** (Algorithms & Techniques, §12) | `recognition.py`'s `match_embedding()` scores the query against every enrolled embedding with a Euclidean-distance-based similarity, takes the k closest, and majority-votes the identity — a from-scratch k-NN classifier. |

## Why LBP instead of a deep embedding model

The project doc lists both a deep-learning 128-d encoder (FaceNet/dlib) and LBP
as valid feature-extraction techniques. This implementation uses **LBP +
distance-based k-NN**:

- No `dlib`/`face_recognition` C++ build step — those can be painful to install
  across three different laptops/OSes for a group project.
- It's the technique most directly rooted in the course's pixel-level image
  processing content (vs. treating a neural network as a black box).
- `backend/vision/recognition.py` is written so swapping in a deep embedding
  model later only means changing `extract_embedding()` — the k-NN matching
  logic stays the same.
