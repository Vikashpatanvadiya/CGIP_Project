"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module

Orchestrates one frame through the full pipeline (see the "Processing Pipeline"
architecture diagram): detect every face in the frame, match each against the
enrolled students, mark attendance for confident matches (skipping duplicates
for the day), and return per-face results so the GUI can overlay boxes/labels.
"""

from dataclasses import dataclass

import numpy as np

from backend.database import models
from backend.vision.face_detection import detect_faces, crop_face, FaceBox
from backend.vision.recognition import extract_embedding, match_embedding


@dataclass
class FrameFaceResult:
    box: FaceBox
    student_id: int | None
    name: str
    confidence: float
    attendance_marked: bool


def process_frame(frame_bgr: np.ndarray) -> list[FrameFaceResult]:
    known_embeddings = models.all_embeddings()
    results: list[FrameFaceResult] = []

    for box in detect_faces(frame_bgr):
        face_crop = crop_face(frame_bgr, box)
        if face_crop.size == 0:
            continue

        query_embedding = extract_embedding(face_crop)
        match = match_embedding(query_embedding, known_embeddings)

        if not match.is_match or match.student_id is None:
            results.append(FrameFaceResult(box, None, "Unknown", match.confidence, False))
            continue

        student = models.get_student(match.student_id)
        name = student["name"] if student else "Unknown"
        newly_marked = models.mark_attendance(match.student_id, match.confidence)

        results.append(FrameFaceResult(box, match.student_id, name, match.confidence, newly_marked))

    return results
