"""
Module Owner: Krishna Patel (24000131) & Maitra Prajapati (24000493) — Database & GUI

Registers a new student: detects the face in each submitted sample image,
extracts its ArcFace embedding (see face_engine.py), and stores both the
student record and embeddings. Matches Functional Requirement #7 (admin module
to register new students by capturing sample face images and enrollment
details).

Registration is one-time and persists in the database, so students do NOT need
to re-register every run.
"""

import cv2
import numpy as np

from backend.database import store as models
from backend.vision.face_engine import detect_and_embed


class NoFaceDetectedError(Exception):
    pass


def _face_thumbnail(image: np.ndarray, face) -> bytes | None:
    """Crop the detected face (with margin), resize, and JPEG-encode it so the
    student can later see the photo they registered with."""
    try:
        h, w = image.shape[:2]
        mx, my = int(face.w * 0.35), int(face.h * 0.35)
        x1 = max(0, face.x - mx)
        y1 = max(0, face.y - my)
        x2 = min(w, face.x + face.w + mx)
        y2 = min(h, face.y + face.h + my)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            crop = image
        target = 320
        ch, cw = crop.shape[:2]
        scale = target / max(ch, cw)
        if scale < 1:
            crop = cv2.resize(crop, (int(cw * scale), int(ch * scale)))
        ok, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
        return buf.tobytes() if ok else None
    except Exception:
        return None


def register_student(
    enrollment_no: str,
    name: str,
    sample_images: list[np.ndarray],
    class_section: str | None = None,
    existing_student_id: int | None = None,
) -> int:
    if not sample_images:
        raise ValueError("At least one sample image is required to register a student")

    embeddings = []
    thumbnail = None
    for image in sample_images:
        faces = detect_and_embed(image)
        if not faces:
            continue
        # Take the most prominent face in the sample (largest, highest score).
        best = max(faces, key=lambda f: (f.w * f.h, f.det_score))
        embeddings.append(best.embedding)
        if thumbnail is None:
            thumbnail = _face_thumbnail(image, best)

    if not embeddings:
        raise NoFaceDetectedError("No face could be detected in any of the submitted sample images")

    if existing_student_id is not None:
        # Re-registration (Edit): replace the face data on the same record so
        # past attendance and enrollments stay linked.
        student_id = existing_student_id
        models.clear_embeddings(student_id)
        models.update_student_identity(student_id, enrollment_no, name)
    else:
        student_id = models.create_student(enrollment_no, name, class_section)
    for embedding in embeddings:
        models.add_embedding(student_id, embedding)
    if thumbnail is not None:
        try:
            models.set_student_photo(student_id, thumbnail)
        except Exception:
            pass  # a missing thumbnail must never block registration

    return student_id
