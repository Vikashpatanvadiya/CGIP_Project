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
MATCH_THRESHOLD = 0.45
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


def _euclidean_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Convert Euclidean distance between two normalized histograms into a
    0..1 similarity score (1 = identical, 0 = maximally different).
    """
    distance = float(np.linalg.norm(a - b))
    max_distance = np.sqrt(2.0)  # both vectors are L1-normalized per cell, bounded
    return max(0.0, 1.0 - distance / max_distance)


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
        (student_id, _euclidean_similarity(query, emb))
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
