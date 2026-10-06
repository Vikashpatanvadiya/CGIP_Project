"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Supabase (Postgres) implementation of the data layer. Mirrors the function
surface of the SQLite models.py so the two are interchangeable behind
store.py. Uses a small psycopg connection pool.

Face embeddings are stored as JSONB arrays (portable, no pgvector extension
required); matching happens in Python against the handful of enrolled
students, which is instant at classroom scale.
"""

import atexit
import json
from datetime import date, datetime

import numpy as np
from psycopg_pool import ConnectionPool

from backend.database.config import supabase_dsn

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    enrollment_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_section TEXT,
    registered_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    session_date DATE NOT NULL,
    time_in TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present',
    confidence REAL,
    UNIQUE(student_id, session_date)
);
"""

_pool: ConnectionPool | None = None


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(supabase_dsn(), min_size=1, max_size=4, open=True)
        atexit.register(_close_pool)
    return _pool


def _close_pool() -> None:
    global _pool
    if _pool is not None:
        try:
            _pool.close()
        except Exception:
            pass
        _pool = None


def init_db() -> None:
    with _get_pool().connection() as conn:
        conn.execute(SCHEMA)


def create_student(enrollment_no: str, name: str, class_section: str | None = None) -> int:
    with _get_pool().connection() as conn:
        row = conn.execute(
            "INSERT INTO students (enrollment_no, name, class_section) VALUES (%s, %s, %s) RETURNING id",
            (enrollment_no, name, class_section),
        ).fetchone()
        return row[0]


def add_embedding(student_id: int, embedding: np.ndarray) -> None:
    with _get_pool().connection() as conn:
        conn.execute(
            "INSERT INTO face_embeddings (student_id, embedding) VALUES (%s, %s)",
            (student_id, json.dumps(embedding.tolist())),
        )


def list_students() -> list[dict]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            "SELECT id, enrollment_no, name, class_section FROM students ORDER BY id"
        ).fetchall()
        return [
            {"id": r[0], "enrollment_no": r[1], "name": r[2], "class_section": r[3]}
            for r in rows
        ]


def get_student(student_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id, enrollment_no, name, class_section FROM students WHERE id = %s",
            (student_id,),
        ).fetchone()
        return {"id": r[0], "enrollment_no": r[1], "name": r[2], "class_section": r[3]} if r else None


def all_embeddings() -> list[tuple[int, np.ndarray]]:
    with _get_pool().connection() as conn:
        rows = conn.execute("SELECT student_id, embedding FROM face_embeddings").fetchall()
        out = []
        for student_id, emb in rows:
            data = emb if isinstance(emb, list) else json.loads(emb)
            out.append((student_id, np.array(data, dtype=np.float32)))
        return out


def has_marked_attendance_today(student_id: int, session_date: date | None = None) -> bool:
    session_date = session_date or date.today()
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = %s AND session_date = %s",
            (student_id, session_date),
        ).fetchone()
        return r is not None


def mark_attendance(student_id: int, confidence: float, session_date: date | None = None) -> bool:
    """Insert today's attendance unless already present (duplicate prevention).
    Returns True if a new row was inserted."""
    session_date = session_date or date.today()
    now_time = datetime.now().strftime("%H:%M:%S")
    with _get_pool().connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO attendance (student_id, session_date, time_in, confidence)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (student_id, session_date) DO NOTHING
            """,
            (student_id, session_date, now_time, confidence),
        )
        return cur.rowcount > 0


def attendance_for_date(session_date: date | None = None) -> list[dict]:
    session_date = session_date or date.today()
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, s.enrollment_no, s.name, a.session_date, a.time_in, a.status, a.confidence
            FROM attendance a JOIN students s ON s.id = a.student_id
            WHERE a.session_date = %s
            ORDER BY a.time_in
            """,
            (session_date,),
        ).fetchall()
        return [
            {
                "id": r[0], "enrollment_no": r[1], "name": r[2],
                "session_date": str(r[3]), "time_in": str(r[4]),
                "status": r[5], "confidence": r[6],
            }
            for r in rows
        ]
