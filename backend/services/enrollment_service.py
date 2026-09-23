"""
Module Owner: Krishna Patel (24000131) & Maitra Prajapati (24000493) — Database & GUI

Registers a new student: detects the face in each submitted sample image,
extracts its embedding, and stores both the student record and embeddings.
Matches Functional Requirement #7 (admin module to register new students by
capturing sample face images and enrollment details).
"""

import numpy as np

from backend.database import models
from backend.vision.face_detection import detect_faces, crop_face
from backend.vision.recognition import extract_embedding


class NoFaceDetectedError(Exception):
    pass


def register_student(enrollment_no: str, name: str, sample_images: list[np.ndarray], class_section: str | None = None) -> int:
    if not sample_images:
        raise ValueError("At least one sample image is required to register a student")

    embeddings = []
    for image in sample_images:
        faces = detect_faces(image)
        if not faces:
            continue
        largest_face = max(faces, key=lambda f: f.w * f.h)
        face_crop = crop_face(image, largest_face)
        embeddings.append(extract_embedding(face_crop))

    if not embeddings:
        raise NoFaceDetectedError("No face could be detected in any of the submitted sample images")

    student_id = models.create_student(enrollment_no, name, class_section)
    for embedding in embeddings:
        models.add_embedding(student_id, embedding)

    return student_id
