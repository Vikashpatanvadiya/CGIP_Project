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

import os
import threading
from dataclasses import dataclass

import numpy as np

# One SCRFD+ArcFace model instance, shared across requests. buffalo_l bundles
# the SCRFD-10g detector and the w600k_r50 ArcFace recognizer.
# Both are overridable by env so a hosted server can trade a little accuracy for
# speed/memory (e.g. DET_SIZE=320) without touching code.
_MODEL_NAME = os.environ.get("FACE_MODEL", "buffalo_l")
_det = int(os.environ.get("DET_SIZE", "640"))
_DET_SIZE = (_det, _det)

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
    kps: np.ndarray | None = None  # 5x2: [left_eye, right_eye, nose, l_mouth, r_mouth]

    @property
    def top_left(self) -> tuple[int, int]:
        return self.x, self.y

    @property
    def bottom_right(self) -> tuple[int, int]:
        return self.x + self.w, self.y + self.h

    @property
    def nose_offset_ratio(self) -> float | None:
        """Horizontal offset of the nose from the eye-midpoint, normalized by
        inter-eye distance. Swings as the head turns left/right, but stays ~fixed
        for a flat (photo/screen) face — the basis of the head-turn liveness check.
        """
        if self.kps is None or len(self.kps) < 3:
            return None
        le, re, nose = self.kps[0], self.kps[1], self.kps[2]
        eye_mid_x = (le[0] + re[0]) / 2.0
        inter = float(np.hypot(re[0] - le[0], re[1] - le[1]))
        if inter < 1.0:
            return None
        return (float(nose[0]) - eye_mid_x) / inter


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
                kps=np.asarray(face.kps, dtype=np.float32) if getattr(face, "kps", None) is not None else None,
            )
        )

    return results


def warm_up() -> None:
    """Force the model to load now (e.g. at server startup) so the first real
    request isn't slowed by the one-time model initialization.
    """
    _get_app()
