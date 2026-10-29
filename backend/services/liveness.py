"""
Module Owner: Vikas Patanwadiya (24000605) & Maitra Prajapati (24000493)
             — Feature Extraction & Recognition Module (anti-spoofing)

Challenge-response liveness for student self check-in. The student is asked to
slowly turn their head left and right while the camera captures a short burst of
frames. For a real 3-D head, the nose shifts horizontally relative to the
eye-midpoint across frames; for a flat photo or a phone screen held up to the
camera, that ratio barely changes because the image is planar. We require both:

  1. Enough variation in the nose-offset ratio across frames (real movement), and
  2. A consistent identity in those frames (so you can't swap faces mid-capture).

This defeats the common spoof the project hit — holding a static photo up to the
live camera — without needing an extra anti-spoofing model.
"""

from dataclasses import dataclass

import numpy as np

from backend.vision.face_engine import detect_and_embed

# Minimum spread in the nose-offset ratio (max - min across frames) to accept as
# a real head turn. Flat images sit well under this; a deliberate left/right turn
# clears it comfortably.
TURN_SPAN_THRESHOLD = 0.12
MIN_USABLE_FRAMES = 4
MIN_DET_SCORE = 0.55


@dataclass
class LivenessResult:
    is_live: bool
    reason: str
    span: float
    embeddings: list  # usable per-frame embeddings (for the identity check)


def check_head_turn(frames: list[np.ndarray]) -> LivenessResult:
    """Analyze a burst of frames for a genuine head turn with a single,
    consistent face."""
    ratios = []
    embeddings = []

    for frame in frames:
        faces = detect_and_embed(frame)
        # Require exactly one clearly-detected face per usable frame, so a second
        # person (or a photo + a real face) can't game the check.
        usable = [f for f in faces if f.det_score >= MIN_DET_SCORE]
        if len(usable) != 1:
            continue
        face = usable[0]
        ratio = face.nose_offset_ratio
        if ratio is None:
            continue
        ratios.append(ratio)
        embeddings.append(face.embedding)

    if len(ratios) < MIN_USABLE_FRAMES:
        return LivenessResult(False, "Keep your face centered and clearly visible.", 0.0, embeddings)

    span = float(max(ratios) - min(ratios))
    if span < TURN_SPAN_THRESHOLD:
        return LivenessResult(False, "Please slowly turn your head left and right.", span, embeddings)

    return LivenessResult(True, "Liveness confirmed.", span, embeddings)
