"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Data-access helpers for students, their face embeddings, and attendance
records. Kept as plain functions over sqlite3 rows rather than an ORM to
match the project's lightweight, dependency-minimal stack.
"""

import json
from datetime import date, datetime

import numpy as np

from backend.database.db import get_connection


def create_student(enrollment_no: str, name: str, class_section: str | None = None) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO students (enrollment_no, name, class_section) VALUES (?, ?, ?)",
            (enrollment_no, name, class_section),
        )
        return cursor.lastrowid


def add_embedding(student_id: int, embedding: np.ndarray) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO face_embeddings (student_id, embedding) VALUES (?, ?)",
            (student_id, json.dumps(embedding.tolist())),
        )


def list_students() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute("SELECT id, enrollment_no, name, class_section FROM students").fetchall()
        return [dict(row) for row in rows]


def get_student(student_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT id, enrollment_no, name, class_section FROM students WHERE id = ?", (student_id,)).fetchone()
        return dict(row) if row else None


def all_embeddings() -> list[tuple[int, np.ndarray]]:
    """Every stored face embedding across all students, for k-NN matching."""
    with get_connection() as conn:
        rows = conn.execute("SELECT student_id, embedding FROM face_embeddings").fetchall()
        return [(row["student_id"], np.array(json.loads(row["embedding"]), dtype=np.float32)) for row in rows]


def has_marked_attendance_today(student_id: int, session_date: date | None = None) -> bool:
    session_date = session_date or date.today()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = ? AND session_date = ?",
            (student_id, session_date.isoformat()),
        ).fetchone()
        return row is not None


def mark_attendance(student_id: int, confidence: float, session_date: date | None = None) -> bool:
    """Insert an attendance row for today, unless already marked (duplicate
    prevention required by Functional Requirement #6). Returns True if a new
    row was inserted.
    """
    session_date = session_date or date.today()
    now_time = datetime.now().strftime("%H:%M:%S")
    with get_connection() as conn:
        try:
            conn.execute(
                "INSERT INTO attendance (student_id, session_date, time_in, confidence) VALUES (?, ?, ?, ?)",
                (student_id, session_date.isoformat(), now_time, confidence),
            )
            return True
        except Exception:
            return False  # UNIQUE(student_id, session_date) violation -> already marked


def attendance_for_date(session_date: date | None = None) -> list[dict]:
    session_date = session_date or date.today()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, s.enrollment_no, s.name, a.session_date, a.time_in, a.status, a.confidence
            FROM attendance a JOIN students s ON s.id = a.student_id
            WHERE a.session_date = ?
            ORDER BY a.time_in
            """,
            (session_date.isoformat(),),
        ).fetchall()
        return [dict(row) for row in rows]
