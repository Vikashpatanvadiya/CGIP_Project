"""Module Owner: Vikas Patanwadiya (24000605) — Testing & Documentation"""

import numpy as np

from backend.vision.recognition import match_embedding, ARCFACE_MATCH_THRESHOLD


def _unit(vec: np.ndarray) -> np.ndarray:
    return vec / np.linalg.norm(vec)


def test_match_embedding_returns_unknown_when_no_enrollments():
    query = _unit(np.random.default_rng(0).random(512).astype(np.float32))
    result = match_embedding(query, known_embeddings=[])
    assert result.is_match is False
    assert result.student_id is None


def test_match_embedding_finds_exact_match():
    dim = 512
    student_a = np.zeros(dim, dtype=np.float32)
    student_a[0] = 1.0
    student_b = np.zeros(dim, dtype=np.float32)
    student_b[-1] = 1.0

    known = [(1, student_a), (2, student_b)]
    result = match_embedding(query=student_a.copy(), known_embeddings=known, k=1)

    assert result.is_match is True
    assert result.student_id == 1
    assert result.confidence > ARCFACE_MATCH_THRESHOLD


def test_match_embedding_rejects_orthogonal_query_as_unknown():
    dim = 512
    student_a = np.zeros(dim, dtype=np.float32)
    student_a[0] = 1.0

    orthogonal = np.zeros(dim, dtype=np.float32)
    orthogonal[dim // 2] = 1.0  # cosine similarity 0 -> below threshold

    result = match_embedding(query=orthogonal, known_embeddings=[(1, student_a)], k=1)
    assert result.is_match is False


def test_match_embedding_distinguishes_two_similar_students():
    # Two distinct identities; a query close to student 2 must pick 2, not 1 —
    # this is the "names on the wrong face" case the deep embeddings fix.
    dim = 512
    rng = np.random.default_rng(7)
    student_a = _unit(rng.random(dim).astype(np.float32))
    student_b = _unit(rng.random(dim).astype(np.float32))

    # query = student_b with a little noise (same person, different frame)
    query = _unit(student_b + 0.05 * rng.standard_normal(dim).astype(np.float32))

    result = match_embedding(query, known_embeddings=[(1, student_a), (2, student_b)], k=1)
    assert result.student_id == 2


def test_match_embedding_ignores_mismatched_embedding_sizes():
    # A stale embedding of a different length (e.g. old LBP vector) must not
    # crash matching; it should simply never win.
    query = _unit(np.random.default_rng(1).random(512).astype(np.float32))
    stale_lbp = np.random.default_rng(2).random(3776).astype(np.float32)

    result = match_embedding(query, known_embeddings=[(1, stale_lbp)], k=1)
    assert result.is_match is False
