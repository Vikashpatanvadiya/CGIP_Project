"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module
                                              (with Maitra Prajapati on LBP extraction)

Turns a face crop into a feature vector (see lbp.py) and matches it against the
enrolled students' stored vectors using distance-based k-NN, per the project
document's "Algorithms and Techniques" section:
  - Euclidean distance / Cosine similarity for comparing embeddings
  - k-Nearest Neighbours for classifying the closest identity
"""

from dataclasses import dataclass

import numpy as np

from backend.vision.lbp import lbp_histogram
from backend.vision.pixel_ops import preprocess_face

# Below this similarity the closest match is still rejected as "Unknown" —
# required so a stranger's face isn't force-matched to the nearest student.
# Calibrated empirically: cosine similarity between LBP histograms of the
# same person (different frames) lands ~0.85-0.98, while unrelated
# patches/faces land ~0.3-0.5 — 0.65 sits comfortably in the gap.
MATCH_THRESHOLD = 0.65
K_NEIGHBORS = 3


@dataclass
class MatchResult:
    student_id: int | None
    confidence: float  # 0..1, higher is more confident
    is_match: bool


def extract_embedding(face_bgr: np.ndarray) -> np.ndarray:
    """Preprocess a face crop and extract its LBP-histogram feature vector."""
    gray = preprocess_face(face_bgr)
    return lbp_histogram(gray)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two LBP-histogram feature vectors, per the
    project doc's "Euclidean Distance / Cosine Similarity" matching step.

    Preferred over a raw Euclidean-distance-to-similarity conversion here: at
    this vector length (num_grid_cells * bins), Euclidean distance needs a
    per-configuration max-distance bound to normalize into 0..1, which is
    easy to get subtly wrong. Cosine similarity is scale-invariant and gives
    a stable 0..1-ish range (in practice mid-0.9s for the same face across
    frames, ~0.3-0.5 for unrelated content) without that bookkeeping.
    """
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def match_embedding(
    query: np.ndarray,
    known_embeddings: list[tuple[int, np.ndarray]],
    k: int = K_NEIGHBORS,
    threshold: float = MATCH_THRESHOLD,
) -> MatchResult:
    """k-NN match: score the query against every enrolled sample, take the
    k closest samples, and vote by majority student_id among them.
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
