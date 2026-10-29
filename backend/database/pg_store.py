"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Supabase (Postgres) implementation of the data layer. Mirrors the function
surface of the SQLite models.py so the two are interchangeable behind
store.py. Uses a small psycopg connection pool.

Face embeddings are stored as JSONB arrays (portable, no pgvector extension
required); matching happens in Python against the handful of enrolled
students, which is instant at classroom scale.

Extended with data access for users, subjects, enrollments, attendance
sessions, and notifications for the subject-wise attendance system.
"""

import atexit
import json
import secrets
import string
from datetime import date, datetime

import numpy as np
from psycopg_pool import ConnectionPool

from backend.database.config import supabase_dsn

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('faculty', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    enrollment_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_section TEXT,
    user_id INTEGER REFERENCES users(id),
    registered_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    section TEXT,
    capacity INTEGER NOT NULL DEFAULT 60,
    join_code TEXT UNIQUE NOT NULL,
    allow_self_registration BOOLEAN NOT NULL DEFAULT TRUE,
    faculty_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_user_id INTEGER NOT NULL REFERENCES users(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    UNIQUE(student_user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    faculty_id INTEGER NOT NULL REFERENCES users(id),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'finalized')),
    method TEXT NOT NULL DEFAULT 'live' CHECK(method IN ('live', 'group_photo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    session_date DATE NOT NULL,
    time_in TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present',
    confidence REAL,
    session_id INTEGER REFERENCES attendance_sessions(id),
    manually_set BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    related_session_id INTEGER REFERENCES attendance_sessions(id),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
        # Safe migration for existing tables
        _safe_add_column(conn, "students", "user_id", "INTEGER REFERENCES users(id)")
        _safe_add_column(conn, "attendance", "session_id", "INTEGER REFERENCES attendance_sessions(id)")
        _safe_add_column(conn, "attendance", "manually_set", "BOOLEAN NOT NULL DEFAULT FALSE")
        try:
            conn.execute("ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_session_date_key")
        except Exception:
            pass
        try:
            conn.execute(
                """CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_unique_idx
                   ON attendance (student_id, session_date, (COALESCE(session_id, -1)))"""
            )
        except Exception:
            pass


def _safe_add_column(conn, table: str, column: str, col_type: str) -> None:
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}")
    except Exception:
        pass  # Column already exists


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

def create_user(email: str, password_hash: str, name: str, role: str) -> int:
    with _get_pool().connection() as conn:
        row = conn.execute(
            "INSERT INTO users (email, password_hash, name, role) VALUES (%s, %s, %s, %s) RETURNING id",
            (email, password_hash, name, role),
        ).fetchone()
        return row[0]


def get_user_by_email(email: str) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = %s",
            (email,),
        ).fetchone()
        return {"id": r[0], "email": r[1], "password_hash": r[2], "name": r[3], "role": r[4], "created_at": str(r[5])} if r else None


def get_user_by_id(user_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id, email, name, role, created_at FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
        return {"id": r[0], "email": r[1], "name": r[2], "role": r[3], "created_at": str(r[4])} if r else None


# ---------------------------------------------------------------------------
# Student management (original + extensions)
# ---------------------------------------------------------------------------

def create_student(enrollment_no: str, name: str, class_section: str | None = None,
                   user_id: int | None = None) -> int:
    with _get_pool().connection() as conn:
        row = conn.execute(
            "INSERT INTO students (enrollment_no, name, class_section, user_id) VALUES (%s, %s, %s, %s) RETURNING id",
            (enrollment_no, name, class_section, user_id),
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


def get_student_by_user_id(user_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id, enrollment_no, name, class_section, user_id FROM students WHERE user_id = %s",
            (user_id,),
        ).fetchone()
        return {"id": r[0], "enrollment_no": r[1], "name": r[2], "class_section": r[3], "user_id": r[4]} if r else None


def link_student_to_user(student_id: int, user_id: int) -> None:
    with _get_pool().connection() as conn:
        conn.execute("UPDATE students SET user_id = %s WHERE id = %s", (user_id, student_id))


def all_embeddings() -> list[tuple[int, np.ndarray]]:
    with _get_pool().connection() as conn:
        rows = conn.execute("SELECT student_id, embedding FROM face_embeddings").fetchall()
        out = []
        for student_id, emb in rows:
            data = emb if isinstance(emb, list) else json.loads(emb)
            out.append((student_id, np.array(data, dtype=np.float32)))
        return out


def embeddings_for_students(student_ids: list[int]) -> list[tuple[int, np.ndarray]]:
    if not student_ids:
        return []
    placeholders = ",".join(["%s"] * len(student_ids))
    with _get_pool().connection() as conn:
        rows = conn.execute(
            f"SELECT student_id, embedding FROM face_embeddings WHERE student_id IN ({placeholders})",
            student_ids,
        ).fetchall()
        out = []
        for student_id, emb in rows:
            data = emb if isinstance(emb, list) else json.loads(emb)
            out.append((student_id, np.array(data, dtype=np.float32)))
        return out


# ---------------------------------------------------------------------------
# Attendance (original + session-scoped)
# ---------------------------------------------------------------------------

def has_marked_attendance_today(student_id: int, session_date: date | None = None) -> bool:
    session_date = session_date or date.today()
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = %s AND session_date = %s AND session_id IS NULL",
            (student_id, session_date),
        ).fetchone()
        return r is not None


def mark_attendance(student_id: int, confidence: float, session_date: date | None = None,
                    session_id: int | None = None, status: str = "Present",
                    manually_set: bool = False) -> bool:
    session_date = session_date or date.today()
    now_time = datetime.now().strftime("%H:%M:%S")
    with _get_pool().connection() as conn:
        try:
            if session_id is not None:
                cur = conn.execute(
                    """INSERT INTO attendance (student_id, session_date, time_in, confidence, session_id, status, manually_set)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (student_id, session_date, (COALESCE(session_id, -1))) DO NOTHING""",
                    (student_id, session_date, now_time, confidence, session_id, status, manually_set),
                )
            else:
                cur = conn.execute(
                    """INSERT INTO attendance (student_id, session_date, time_in, confidence, status, manually_set)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (student_id, session_date, (COALESCE(session_id, -1))) DO NOTHING""",
                    (student_id, session_date, now_time, confidence, status, manually_set),
                )
            return cur.rowcount > 0
        except Exception:
            return False


def has_marked_attendance_session(student_id: int, session_id: int) -> bool:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = %s AND session_id = %s",
            (student_id, session_id),
        ).fetchone()
        return r is not None


def update_attendance_status(student_id: int, session_id: int, status: str, manually_set: bool = True) -> bool:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id FROM attendance WHERE student_id = %s AND session_id = %s",
            (student_id, session_id),
        ).fetchone()
        if r:
            conn.execute("UPDATE attendance SET status = %s, manually_set = %s WHERE id = %s",
                         (status, manually_set, r[0]))
            return True
        else:
            sess = conn.execute("SELECT session_date FROM attendance_sessions WHERE id = %s", (session_id,)).fetchone()
            session_date = sess[0] if sess else date.today()
            now_time = datetime.now().strftime("%H:%M:%S")
            conn.execute(
                """INSERT INTO attendance (student_id, session_date, time_in, confidence, session_id, status, manually_set)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (student_id, session_date, now_time, 0.0, session_id, status, manually_set),
            )
            return True


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


def attendance_for_session(session_id: int) -> list[dict]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, s.enrollment_no, s.name, s.id as student_id,
                   a.session_date, a.time_in, a.status, a.confidence, a.manually_set
            FROM attendance a JOIN students s ON s.id = a.student_id
            WHERE a.session_id = %s
            ORDER BY a.time_in
            """,
            (session_id,),
        ).fetchall()
        return [
            {
                "id": r[0], "enrollment_no": r[1], "name": r[2], "student_id": r[3],
                "session_date": str(r[4]), "time_in": str(r[5]),
                "status": r[6], "confidence": r[7], "manually_set": r[8],
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Subject management
# ---------------------------------------------------------------------------

def _generate_join_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_subject(faculty_id: int, name: str, code: str | None = None,
                   section: str | None = None, capacity: int = 60,
                   allow_self_registration: bool = True) -> dict:
    join_code = _generate_join_code()
    with _get_pool().connection() as conn:
        while conn.execute("SELECT 1 FROM subjects WHERE join_code = %s", (join_code,)).fetchone():
            join_code = _generate_join_code()
        row = conn.execute(
            """INSERT INTO subjects (name, code, section, capacity, join_code, allow_self_registration, faculty_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (name, code, section, capacity, join_code, allow_self_registration, faculty_id),
        ).fetchone()
        return {
            "id": row[0], "name": name, "code": code, "section": section,
            "capacity": capacity, "join_code": join_code,
            "allow_self_registration": allow_self_registration, "faculty_id": faculty_id,
        }


def get_subject(subject_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            """SELECT id, name, code, section, capacity, join_code,
               allow_self_registration, faculty_id, created_at FROM subjects WHERE id = %s""",
            (subject_id,),
        ).fetchone()
        if not r:
            return None
        return {
            "id": r[0], "name": r[1], "code": r[2], "section": r[3],
            "capacity": r[4], "join_code": r[5], "allow_self_registration": bool(r[6]),
            "faculty_id": r[7], "created_at": str(r[8]),
        }


def get_subject_by_join_code(join_code: str) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            """SELECT id, name, code, section, capacity, join_code,
               allow_self_registration, faculty_id, created_at FROM subjects WHERE join_code = %s""",
            (join_code,),
        ).fetchone()
        if not r:
            return None
        return {
            "id": r[0], "name": r[1], "code": r[2], "section": r[3],
            "capacity": r[4], "join_code": r[5], "allow_self_registration": bool(r[6]),
            "faculty_id": r[7], "created_at": str(r[8]),
        }


def list_subjects_for_faculty(faculty_id: int) -> list[dict]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """SELECT s.id, s.name, s.code, s.section, s.capacity, s.join_code,
               s.allow_self_registration, s.faculty_id, s.created_at,
               (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id AND e.status = 'approved') as enrolled_count,
               (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id AND e.status = 'pending') as pending_count
               FROM subjects s WHERE s.faculty_id = %s ORDER BY s.created_at DESC""",
            (faculty_id,),
        ).fetchall()
        return [
            {
                "id": r[0], "name": r[1], "code": r[2], "section": r[3],
                "capacity": r[4], "join_code": r[5], "allow_self_registration": bool(r[6]),
                "faculty_id": r[7], "created_at": str(r[8]),
                "enrolled_count": r[9], "pending_count": r[10],
            }
            for r in rows
        ]


def update_subject(subject_id: int, **kwargs) -> bool:
    allowed = {"name", "code", "section", "capacity", "allow_self_registration"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return False
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [subject_id]
    with _get_pool().connection() as conn:
        conn.execute(f"UPDATE subjects SET {set_clause} WHERE id = %s", values)
        return True


# ---------------------------------------------------------------------------
# Enrollment management
# ---------------------------------------------------------------------------

def create_enrollment(student_user_id: int, subject_id: int) -> dict:
    with _get_pool().connection() as conn:
        row = conn.execute(
            "INSERT INTO enrollments (student_user_id, subject_id) VALUES (%s, %s) RETURNING id",
            (student_user_id, subject_id),
        ).fetchone()
        return {"id": row[0], "student_user_id": student_user_id,
                "subject_id": subject_id, "status": "pending"}


def get_enrollment(enrollment_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
               u.name as student_name, u.email as student_email
               FROM enrollments e JOIN users u ON u.id = e.student_user_id
               WHERE e.id = %s""",
            (enrollment_id,),
        ).fetchone()
        if not r:
            return None
        return {
            "id": r[0], "student_user_id": r[1], "subject_id": r[2],
            "status": r[3], "requested_at": str(r[4]),
            "responded_at": str(r[5]) if r[5] else None,
            "student_name": r[6], "student_email": r[7],
        }


def get_enrollment_by_student_subject(student_user_id: int, subject_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT id, student_user_id, subject_id, status FROM enrollments WHERE student_user_id = %s AND subject_id = %s",
            (student_user_id, subject_id),
        ).fetchone()
        if not r:
            return None
        return {"id": r[0], "student_user_id": r[1], "subject_id": r[2], "status": r[3]}


def update_enrollment_status(enrollment_id: int, status: str) -> bool:
    with _get_pool().connection() as conn:
        conn.execute(
            "UPDATE enrollments SET status = %s, responded_at = now() WHERE id = %s",
            (status, enrollment_id),
        )
        return True


def list_enrollments_for_subject(subject_id: int, status: str | None = None) -> list[dict]:
    with _get_pool().connection() as conn:
        if status:
            rows = conn.execute(
                """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
                   u.name as student_name, u.email as student_email
                   FROM enrollments e JOIN users u ON u.id = e.student_user_id
                   WHERE e.subject_id = %s AND e.status = %s ORDER BY e.requested_at""",
                (subject_id, status),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
                   u.name as student_name, u.email as student_email
                   FROM enrollments e JOIN users u ON u.id = e.student_user_id
                   WHERE e.subject_id = %s ORDER BY e.requested_at""",
                (subject_id,),
            ).fetchall()
        return [
            {
                "id": r[0], "student_user_id": r[1], "subject_id": r[2],
                "status": r[3], "requested_at": str(r[4]),
                "responded_at": str(r[5]) if r[5] else None,
                "student_name": r[6], "student_email": r[7],
            }
            for r in rows
        ]


def list_enrollments_for_student(student_user_id: int) -> list[dict]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at,
               s.name as subject_name, s.code as subject_code, s.section,
               u.name as faculty_name
               FROM enrollments e
               JOIN subjects s ON s.id = e.subject_id
               JOIN users u ON u.id = s.faculty_id
               WHERE e.student_user_id = %s
               ORDER BY e.requested_at DESC""",
            (student_user_id,),
        ).fetchall()
        return [
            {
                "id": r[0], "student_user_id": r[1], "subject_id": r[2],
                "status": r[3], "requested_at": str(r[4]),
                "subject_name": r[5], "subject_code": r[6], "section": r[7],
                "faculty_name": r[8],
            }
            for r in rows
        ]


def approved_student_ids_for_subject(subject_id: int) -> list[int]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """SELECT s.id FROM students s
               JOIN enrollments e ON e.student_user_id = s.user_id
               WHERE e.subject_id = %s AND e.status = 'approved'""",
            (subject_id,),
        ).fetchall()
        return [r[0] for r in rows]


# ---------------------------------------------------------------------------
# Attendance sessions
# ---------------------------------------------------------------------------

def create_attendance_session(subject_id: int, faculty_id: int, method: str = "live") -> dict:
    session_date = date.today()
    start_time = datetime.now().strftime("%H:%M:%S")
    with _get_pool().connection() as conn:
        row = conn.execute(
            """INSERT INTO attendance_sessions (subject_id, faculty_id, session_date, start_time, method)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (subject_id, faculty_id, session_date, start_time, method),
        ).fetchone()
        return {
            "id": row[0], "subject_id": subject_id, "faculty_id": faculty_id,
            "session_date": str(session_date), "start_time": start_time,
            "status": "active", "method": method,
        }


def get_attendance_session(session_id: int) -> dict | None:
    with _get_pool().connection() as conn:
        r = conn.execute(
            """SELECT s.id, s.subject_id, s.faculty_id, s.session_date, s.start_time,
               s.end_time, s.status, s.method, s.created_at,
               sub.name as subject_name, sub.code as subject_code, sub.section
               FROM attendance_sessions s
               JOIN subjects sub ON sub.id = s.subject_id
               WHERE s.id = %s""",
            (session_id,),
        ).fetchone()
        if not r:
            return None
        return {
            "id": r[0], "subject_id": r[1], "faculty_id": r[2],
            "session_date": str(r[3]), "start_time": str(r[4]),
            "end_time": str(r[5]) if r[5] else None, "status": r[6],
            "method": r[7], "created_at": str(r[8]),
            "subject_name": r[9], "subject_code": r[10], "section": r[11],
        }


def finalize_session(session_id: int) -> bool:
    end_time = datetime.now().strftime("%H:%M:%S")
    with _get_pool().connection() as conn:
        conn.execute(
            "UPDATE attendance_sessions SET status = 'finalized', end_time = %s WHERE id = %s",
            (end_time, session_id),
        )
        return True


def list_sessions_for_subject(subject_id: int) -> list[dict]:
    with _get_pool().connection() as conn:
        rows = conn.execute(
            """SELECT s.id, s.subject_id, s.faculty_id, s.session_date, s.start_time,
               s.end_time, s.status, s.method,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status = 'Present') as present_count,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) as total_count
               FROM attendance_sessions s
               WHERE s.subject_id = %s
               ORDER BY s.session_date DESC, s.start_time DESC""",
            (subject_id,),
        ).fetchall()
        return [
            {
                "id": r[0], "subject_id": r[1], "faculty_id": r[2],
                "session_date": str(r[3]), "start_time": str(r[4]),
                "end_time": str(r[5]) if r[5] else None,
                "status": r[6], "method": r[7],
                "present_count": r[8], "total_count": r[9],
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def create_notification(user_id: int, title: str, message: str,
                        notification_type: str = "info",
                        related_session_id: int | None = None) -> int:
    with _get_pool().connection() as conn:
        row = conn.execute(
            """INSERT INTO notifications (user_id, title, message, type, related_session_id)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (user_id, title, message, notification_type, related_session_id),
        ).fetchone()
        return row[0]


def get_notifications(user_id: int, unread_only: bool = False) -> list[dict]:
    with _get_pool().connection() as conn:
        if unread_only:
            rows = conn.execute(
                """SELECT id, user_id, title, message, type, related_session_id, is_read, created_at
                   FROM notifications WHERE user_id = %s AND is_read = FALSE ORDER BY created_at DESC""",
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, user_id, title, message, type, related_session_id, is_read, created_at
                   FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 50""",
                (user_id,),
            ).fetchall()
        return [
            {
                "id": r[0], "user_id": r[1], "title": r[2], "message": r[3],
                "type": r[4], "related_session_id": r[5],
                "is_read": bool(r[6]), "created_at": str(r[7]),
            }
            for r in rows
        ]


def mark_notification_read(notification_id: int, user_id: int) -> bool:
    with _get_pool().connection() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
            (notification_id, user_id),
        )
        return True


def mark_all_notifications_read(user_id: int) -> bool:
    with _get_pool().connection() as conn:
        conn.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (user_id,))
        return True


def notification_exists(user_id: int, related_session_id: int, notification_type: str) -> bool:
    with _get_pool().connection() as conn:
        r = conn.execute(
            "SELECT 1 FROM notifications WHERE user_id = %s AND related_session_id = %s AND type = %s",
            (user_id, related_session_id, notification_type),
        ).fetchone()
        return r is not None
