"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module

Orchestrates one image (a live frame OR an uploaded group photo) through the
full pipeline (see the "Processing Pipeline" architecture diagram): detect every
face, embed each with ArcFace, match each against the enrolled students, mark
attendance for confident matches (skipping duplicates for the day), and return
per-face results so the GUI can overlay boxes/labels.

Because detection + embedding handle multiple faces in one pass, the same code
powers both live single-person attendance and faculty group-photo attendance.
"""

from dataclasses import dataclass

import numpy as np

from backend.database import store as models
from backend.vision.face_engine import detect_and_embed, DetectedFace
from backend.vision.recognition import match_embedding


@dataclass
class FrameFaceResult:
    box: DetectedFace
    student_id: int | None
    name: str
    enrollment_no: str | None
    confidence: float
    attendance_marked: bool


def process_frame(
    image_bgr: np.ndarray,
    session_id: int | None = None,
    allowed_student_ids: list[int] | None = None,
) -> list[FrameFaceResult]:
    if allowed_student_ids is not None:
        known_embeddings = models.embeddings_for_students(allowed_student_ids)
    else:
        known_embeddings = models.all_embeddings()
    results: list[FrameFaceResult] = []

    # Guard against the same student being assigned to two different faces in a
    # single image: once an identity is claimed in this image, a second face
    # can't also take it (the lower-confidence one falls back to Unknown).
    claimed: dict[int, float] = {}
    pending: list[tuple[DetectedFace, object]] = []

    for face in detect_and_embed(image_bgr):
        match = match_embedding(face.embedding, known_embeddings)
        pending.append((face, match))

    # Resolve highest-confidence claims first so the best match wins an identity.
    pending.sort(key=lambda pair: pair[1].confidence, reverse=True)

    for face, match in pending:
        if not match.is_match or match.student_id is None or match.student_id in claimed:
            results.append(FrameFaceResult(face, None, "Unknown", None, match.confidence, False))
            continue

        claimed[match.student_id] = match.confidence
        student = models.get_student(match.student_id)
        name = student["name"] if student else "Unknown"
        enrollment_no = student["enrollment_no"] if student else None
        newly_marked = models.mark_attendance(match.student_id, match.confidence, session_id=session_id)

        results.append(
            FrameFaceResult(face, match.student_id, name, enrollment_no, match.confidence, newly_marked)
        )

    return results
