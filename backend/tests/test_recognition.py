"""Module Owner: Vikas Patanwadiya (24000605) — Testing & Documentation"""

import numpy as np

from backend.vision.recognition import match_embedding, MATCH_THRESHOLD


def test_match_embedding_returns_unknown_when_no_enrollments():
    query = np.random.default_rng(0).random(59 * 8 * 8).astype(np.float32)
    result = match_embedding(query, known_embeddings=[])
    assert result.is_match is False
    assert result.student_id is None


def test_match_embedding_finds_exact_match():
    dim = 59 * 8 * 8
    student_a = np.zeros(dim, dtype=np.float32)
    student_a[0] = 1.0
    student_b = np.zeros(dim, dtype=np.float32)
    student_b[-1] = 1.0

    known = [(1, student_a), (2, student_b)]
    result = match_embedding(query=student_a.copy(), known_embeddings=known, k=1)

    assert result.is_match is True
    assert result.student_id == 1
    assert result.confidence > MATCH_THRESHOLD


def test_match_embedding_rejects_far_query_as_unknown():
    dim = 59 * 8 * 8
    student_a = np.zeros(dim, dtype=np.float32)
    student_a[0] = 1.0

    far_query = np.zeros(dim, dtype=np.float32)
    far_query[dim // 2] = 1.0

    result = match_embedding(query=far_query, known_embeddings=[(1, student_a)], k=1)
    assert result.is_match is False
