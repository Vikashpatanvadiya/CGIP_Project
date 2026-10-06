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

## Classical (LBP) vs. deep (ArcFace) — and why we use both

The project doc lists both a deep-learning encoder and LBP as valid
feature-extraction techniques. This project implements **both** and uses each
where it's strongest:

| | Classical — LBP (from scratch) | Deep — ArcFace (InsightFace) |
|---|---|---|
| Where | `backend/vision/lbp.py` | `backend/vision/face_engine.py` |
| Feature | 3776-d LBP histogram (per-pixel texture) | 512-d embedding (trained on millions of faces) |
| Detector | Haar Cascade (`face_detection.py`) | SCRFD |
| Strength | Transparent, pixel-level, no model download | High accuracy, separates different people reliably |
| Weakness | Confuses similar faces/lighting → wrong names | Opaque "black box", needs a model download |
| Role | The course baseline we benchmark against | The production matcher used by the live app + group photo |

**Why the switch for production matching:** with LBP, once more than one person
was in frame the system put the wrong name on faces — LBP only captures local
texture, so different people's histograms overlap. ArcFace is trained so the
same identity's embeddings cluster tightly and different identities sit far
apart (a wide cosine-similarity margin), which is what actually fixes the
confusion and makes multi-face group-photo recognition reliable.

**The classical work is not discarded** — `lbp.py`, `pixel_ops.py`, and
`drawing.py` remain implemented, unit-tested, and documented as the baseline.
This "classical vs. deep, compared on the same task" framing is a stronger
academic result than either alone. The matching math
(`recognition.match_embedding`, cosine + k-NN) is identical for both embedding
types; only the acceptance threshold differs (LBP ~0.65, ArcFace ~0.38),
because the two embedding spaces have different similarity scales.
