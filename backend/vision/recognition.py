"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module
                                              (with Maitra Prajapati on LBP extraction)

Matches a face embedding against the enrolled students' stored embeddings using
cosine similarity + k-Nearest-Neighbours, per the project doc's "Algorithms and
Techniques" section (Euclidean distance / Cosine similarity, k-NN).

Two embedding sources exist in the codebase:
  - ArcFace (deep)      — face_engine.py, 512-d, used for live/production matching.
  - LBP histogram (classical, from scratch) — extract_lbp_embedding() below,
    kept as the course baseline and still unit-tested. See lbp.py / pixel_ops.py.

The matching math (match_embedding) is identical for both; only the threshold
differs, because the two embedding spaces have different similarity scales.
"""

from dataclasses import dataclass

import numpy as np

from backend.vision.lbp import lbp_histogram
from backend.vision.pixel_ops import preprocess_face

# ArcFace cosine similarity: same identity typically lands ~0.45-0.8, different
# identities ~0.0-0.3. 0.38 sits in the margin — high enough to reject
# strangers, low enough to accept the same person across angles/lighting.
ARCFACE_MATCH_THRESHOLD = 0.38

# LBP cosine similarity lives on a different (narrower) scale — retained for the
# classical baseline path only.
LBP_MATCH_THRESHOLD = 0.65

K_NEIGHBORS = 3


@dataclass
class MatchResult:
    student_id: int | None
    confidence: float  # cosine similarity of the winning identity
    is_match: bool


def extract_lbp_embedding(face_bgr: np.ndarray) -> np.ndarray:
    """Classical baseline: preprocess a face crop (grayscale, Gaussian blur,
    histogram equalization) and extract its from-scratch LBP-histogram feature
    vector. Not used for live matching anymore, but kept and tested as the
    course technique we benchmark ArcFace against.
    """
    gray = preprocess_face(face_bgr)
    return lbp_histogram(gray)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two embedding vectors. ArcFace embeddings are
    already L2-normalized, so this reduces to a dot product for them; for LBP
    histograms it normalizes by the magnitudes.
    """
    if a.shape != b.shape:
        # Different embedding types (e.g. a stale LBP vector vs an ArcFace one)
        # — not comparable, so treat as no similarity rather than crashing.
        return 0.0
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def match_embedding(
    query: np.ndarray,
    known_embeddings: list[tuple[int, np.ndarray]],
    k: int = K_NEIGHBORS,
    threshold: float = ARCFACE_MATCH_THRESHOLD,
) -> MatchResult:
    """k-NN match: score the query against every enrolled sample, take the k
    most similar, and majority-vote the student_id among them. The winning
    confidence is the mean similarity of that student's votes.
    """
    if not known_embeddings:
        return MatchResult(student_id=None, confidence=0.0, is_match=False)

    scored = [
        (student_id, _cosine_similarity(query, emb))
        for student_id, emb in known_embeddings
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    top_k = scored[:k]

    votes: dict[int, list[float]] = {}
    for student_id, score in top_k:
        votes.setdefault(student_id, []).append(score)

    best_student_id = max(votes, key=lambda sid: (len(votes[sid]), sum(votes[sid])))
    best_confidence = float(np.mean(votes[best_student_id]))

    return MatchResult(
        student_id=best_student_id,
        confidence=best_confidence,
        is_match=best_confidence >= threshold,
    )
