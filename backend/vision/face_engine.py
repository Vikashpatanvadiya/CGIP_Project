"""
Module Owner: Vikas Patanwadiya (24000605) & Maitra Prajapati (24000493)
             — Feature Extraction & Recognition Module (deep model)

Deep face-embedding engine built on InsightFace (SCRFD detector + ArcFace
w600k_r50 recognition model). This is the ACCURATE production path that
replaced the classical Haar+LBP pipeline for live matching, because LBP
histograms could not reliably separate different people (names landed on the
wrong faces once more than one person was in frame).

The classical, from-scratch course techniques are NOT thrown away — they
remain implemented and documented as the baseline we compare against:
  - pixel_ops.py  (grayscale, Gaussian blur, histogram equalization)
  - lbp.py        (Local Binary Pattern feature extraction)
  - drawing.py    (Bresenham's line algorithm for the overlay boxes)
See docs/image_processing_concepts.md for the classical-vs-deep comparison.

Why ArcFace works where LBP didn't: ArcFace is trained so that embeddings of
the same identity are pushed together and different identities pushed apart on
a hypersphere, giving a wide cosine-similarity margin. LBP only captures local
texture, which is too easily confused between similar faces/lighting.

The model loads once (lazily) and is reused for every frame.
"""

import threading
from dataclasses import dataclass

import numpy as np

# One SCRFD+ArcFace model instance, shared across requests. buffalo_l bundles
# the SCRFD-10g detector and the w600k_r50 ArcFace recognizer.
_MODEL_NAME = "buffalo_l"
_DET_SIZE = (640, 640)

_app = None
_lock = threading.Lock()


@dataclass
class DetectedFace:
    x: int
    y: int
    w: int
    h: int
    embedding: np.ndarray  # 512-d, L2-normalized (cosine == dot product)
    det_score: float

    @property
    def top_left(self) -> tuple[int, int]:
        return self.x, self.y

    @property
    def bottom_right(self) -> tuple[int, int]:
        return self.x + self.w, self.y + self.h


def _get_app():
    """Lazily load the InsightFace model once (thread-safe). Kept out of module
    import so unit tests of the classical pixel/LBP code don't need onnxruntime.
    """
    global _app
    if _app is None:
        with _lock:
            if _app is None:
                from insightface.app import FaceAnalysis

                app = FaceAnalysis(name=_MODEL_NAME, providers=["CPUExecutionProvider"])
                app.prepare(ctx_id=-1, det_size=_DET_SIZE)
                _app = app
    return _app


def detect_and_embed(image_bgr: np.ndarray) -> list[DetectedFace]:
    """Detect every face in a BGR image and return each with its bounding box
    (pixel coords of the original image) and its 512-d ArcFace embedding.

    One pass handles detection, alignment, and embedding — this is what makes
    group-photo recognition feasible (all faces in the photo at once).
    """
    if image_bgr is None or getattr(image_bgr, "size", 0) == 0:
        return []

    app = _get_app()
    results: list[DetectedFace] = []

    for face in app.get(image_bgr):
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        x1, y1 = max(0, x1), max(0, y1)
        results.append(
            DetectedFace(
                x=x1,
                y=y1,
                w=max(0, x2 - x1),
                h=max(0, y2 - y1),
                embedding=np.asarray(face.normed_embedding, dtype=np.float32),
                det_score=float(face.det_score),
            )
        )

    return results


def warm_up() -> None:
    """Force the model to load now (e.g. at server startup) so the first real
    request isn't slowed by the one-time model initialization.
    """
    _get_app()
