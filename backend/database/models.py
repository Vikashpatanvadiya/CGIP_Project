"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Data-access helpers for students, their face embeddings, and attendance
records. Kept as plain functions over sqlite3 rows rather than an ORM to
match the project's lightweight, dependency-minimal stack.

Extended with data access for users, subjects, enrollments, attendance
sessions, and notifications for the subject-wise attendance system.
"""

import json
import secrets
import sqlite3
import string
from datetime import date, datetime

import numpy as np

from backend.database.db import get_connection


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

def create_user(email: str, password_hash: str, name: str, role: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
            (email, password_hash, name, role),
        )
        return cursor.lastrowid


def get_user_by_email(email: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Student management (original + extensions)
# ---------------------------------------------------------------------------

def create_student(enrollment_no: str, name: str, class_section: str | None = None,
                   user_id: int | None = None) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO students (enrollment_no, name, class_section, user_id) VALUES (?, ?, ?, ?)",
            (enrollment_no, name, class_section, user_id),
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


def get_student_by_user_id(user_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, enrollment_no, name, class_section, user_id FROM students WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


def link_student_to_user(student_id: int, user_id: int) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE students SET user_id = ? WHERE id = ?", (user_id, student_id))


def all_embeddings() -> list[tuple[int, np.ndarray]]:
    """Every stored face embedding across all students, for k-NN matching."""
    with get_connection() as conn:
        rows = conn.execute("SELECT student_id, embedding FROM face_embeddings").fetchall()
        return [(row["student_id"], np.array(json.loads(row["embedding"]), dtype=np.float32)) for row in rows]


def embeddings_for_students(student_ids: list[int]) -> list[tuple[int, np.ndarray]]:
    """Face embeddings only for the specified student IDs (for subject-scoped matching)."""
    if not student_ids:
        return []
    placeholders = ",".join("?" * len(student_ids))
    with get_connection() as conn:
        rows = conn.execute(
            f"SELECT student_id, embedding FROM face_embeddings WHERE student_id IN ({placeholders})",
            student_ids,
        ).fetchall()
        return [(row["student_id"], np.array(json.loads(row["embedding"]), dtype=np.float32)) for row in rows]


# ---------------------------------------------------------------------------
# Attendance (original + session-scoped extensions)
# ---------------------------------------------------------------------------

def has_marked_attendance_today(student_id: int, session_date: date | None = None) -> bool:
    session_date = session_date or date.today()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = ? AND session_date = ? AND session_id IS NULL",
            (student_id, session_date.isoformat()),
        ).fetchone()
        return row is not None


def mark_attendance(student_id: int, confidence: float, session_date: date | None = None,
                    session_id: int | None = None, status: str = "Present",
                    manually_set: bool = False) -> bool:
    """Insert an attendance row for today, unless already marked (duplicate
    prevention required by Functional Requirement #6). Returns True if a new
    row was inserted.
    """
    session_date = session_date or date.today()
    now_time = datetime.now().strftime("%H:%M:%S")
    with get_connection() as conn:
        try:
            conn.execute(
                """INSERT INTO attendance (student_id, session_date, time_in, confidence,
                   session_id, status, manually_set) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (student_id, session_date.isoformat(), now_time, confidence,
                 session_id, status, 1 if manually_set else 0),
            )
            return True
        except Exception:
            return False  # UNIQUE violation -> already marked


def has_marked_attendance_session(student_id: int, session_id: int) -> bool:
    """Check if a student already has an attendance record in a specific session."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM attendance WHERE student_id = ? AND session_id = ?",
            (student_id, session_id),
        ).fetchone()
        return row is not None


def _canonical_status(status: str) -> str:
    """Normalize status casing so counts stay consistent ('Present'/'Absent')."""
    s = (status or "").strip().lower()
    if s == "present":
        return "Present"
    if s == "absent":
        return "Absent"
    if s == "pending_review":
        return "Pending_Review"
    return status or "Absent"


def update_attendance_status(student_id: int, session_id: int, status: str, manually_set: bool = True) -> bool:
    """Update or insert an attendance record for a student in a session."""
    status = _canonical_status(status)
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM attendance WHERE student_id = ? AND session_id = ?",
            (student_id, session_id),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE attendance SET status = ?, manually_set = ? WHERE id = ?",
                (status, 1 if manually_set else 0, existing["id"]),
            )
            return True
        else:
            now_time = datetime.now().strftime("%H:%M:%S")
            session_date = date.today().isoformat()
            # Get session date from the session itself
            sess = conn.execute(
                "SELECT session_date FROM attendance_sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if sess:
                session_date = sess["session_date"]
            conn.execute(
                """INSERT INTO attendance (student_id, session_date, time_in, confidence,
                   session_id, status, manually_set) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (student_id, session_date, now_time, 0.0, session_id, status, 1 if manually_set else 0),
            )
            return True


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


def attendance_for_session(session_id: int) -> list[dict]:
    """Get all attendance records for a specific session."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT a.id, s.enrollment_no, s.name, s.id as student_id,
                   a.session_date, a.time_in, a.status, a.confidence, a.manually_set
            FROM attendance a JOIN students s ON s.id = a.student_id
            WHERE a.session_id = ?
            ORDER BY a.time_in
            """,
            (session_id,),
        ).fetchall()
        return [dict(row) for row in rows]


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
    with get_connection() as conn:
        # Ensure unique join code
        while conn.execute("SELECT 1 FROM subjects WHERE join_code = ?", (join_code,)).fetchone():
            join_code = _generate_join_code()
        cursor = conn.execute(
            """INSERT INTO subjects (name, code, section, capacity, join_code,
               allow_self_registration, faculty_id) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (name, code, section, capacity, join_code,
             1 if allow_self_registration else 0, faculty_id),
        )
        return {
            "id": cursor.lastrowid, "name": name, "code": code, "section": section,
            "capacity": capacity, "join_code": join_code,
            "allow_self_registration": allow_self_registration, "faculty_id": faculty_id,
        }


def get_subject(subject_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT id, name, code, section, capacity, join_code,
               allow_self_registration, faculty_id, created_at
               FROM subjects WHERE id = ?""",
            (subject_id,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["allow_self_registration"] = bool(d["allow_self_registration"])
        return d


def get_subject_by_join_code(join_code: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT id, name, code, section, capacity, join_code,
               allow_self_registration, faculty_id, created_at
               FROM subjects WHERE join_code = ?""",
            (join_code,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["allow_self_registration"] = bool(d["allow_self_registration"])
        return d


def list_subjects_for_faculty(faculty_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT s.id, s.name, s.code, s.section, s.capacity, s.join_code,
               s.allow_self_registration, s.faculty_id, s.created_at,
               (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id AND e.status = 'approved') as enrolled_count,
               (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id AND e.status = 'pending') as pending_count
               FROM subjects s WHERE s.faculty_id = ? ORDER BY s.created_at DESC""",
            (faculty_id,),
        ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["allow_self_registration"] = bool(d["allow_self_registration"])
            result.append(d)
        return result


def delete_subject(subject_id: int, faculty_id: int) -> bool:
    """Delete a subject the faculty owns, plus attendance, sessions,
    enrollments, and scheduled classes attached to it."""
    with get_connection() as conn:
        owns = conn.execute(
            "SELECT 1 FROM subjects WHERE id = ? AND faculty_id = ?",
            (subject_id, faculty_id),
        ).fetchone()
        if not owns:
            return False
        conn.execute(
            "DELETE FROM attendance WHERE session_id IN "
            "(SELECT id FROM attendance_sessions WHERE subject_id = ?)",
            (subject_id,),
        )
        conn.execute("DELETE FROM attendance_sessions WHERE subject_id = ?", (subject_id,))
        conn.execute("DELETE FROM enrollments WHERE subject_id = ?", (subject_id,))
        conn.execute("DELETE FROM scheduled_classes WHERE subject_id = ?", (subject_id,))
        conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
        return True


def update_subject(subject_id: int, **kwargs) -> bool:
    allowed = {"name", "code", "section", "capacity", "allow_self_registration"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return False
    if "allow_self_registration" in updates:
        updates["allow_self_registration"] = 1 if updates["allow_self_registration"] else 0
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [subject_id]
    with get_connection() as conn:
        conn.execute(f"UPDATE subjects SET {set_clause} WHERE id = ?", values)
        return True


# ---------------------------------------------------------------------------
# Enrollment management
# ---------------------------------------------------------------------------

def create_enrollment(student_user_id: int, subject_id: int) -> dict:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO enrollments (student_user_id, subject_id) VALUES (?, ?)",
            (student_user_id, subject_id),
        )
        return {"id": cursor.lastrowid, "student_user_id": student_user_id,
                "subject_id": subject_id, "status": "pending"}


def get_enrollment(enrollment_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
               u.name as student_name, u.email as student_email
               FROM enrollments e JOIN users u ON u.id = e.student_user_id
               WHERE e.id = ?""",
            (enrollment_id,),
        ).fetchone()
        return dict(row) if row else None


def get_enrollment_by_student_subject(student_user_id: int, subject_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, student_user_id, subject_id, status FROM enrollments WHERE student_user_id = ? AND subject_id = ?",
            (student_user_id, subject_id),
        ).fetchone()
        return dict(row) if row else None


def update_enrollment_status(enrollment_id: int, status: str) -> bool:
    with get_connection() as conn:
        conn.execute(
            "UPDATE enrollments SET status = ?, responded_at = datetime('now') WHERE id = ?",
            (status, enrollment_id),
        )
        return True


def list_enrollments_for_subject(subject_id: int, status: str | None = None) -> list[dict]:
    with get_connection() as conn:
        if status:
            rows = conn.execute(
                """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
                   u.name as student_name, u.email as student_email
                   FROM enrollments e JOIN users u ON u.id = e.student_user_id
                   WHERE e.subject_id = ? AND e.status = ?
                   ORDER BY e.requested_at""",
                (subject_id, status),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at, e.responded_at,
                   u.name as student_name, u.email as student_email
                   FROM enrollments e JOIN users u ON u.id = e.student_user_id
                   WHERE e.subject_id = ?
                   ORDER BY e.requested_at""",
                (subject_id,),
            ).fetchall()
        return [dict(row) for row in rows]


def list_enrollments_for_student(student_user_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id, e.student_user_id, e.subject_id, e.status, e.requested_at,
               s.name as subject_name, s.code as subject_code, s.section,
               u.name as faculty_name
               FROM enrollments e
               JOIN subjects s ON s.id = e.subject_id
               JOIN users u ON u.id = s.faculty_id
               WHERE e.student_user_id = ?
               ORDER BY e.requested_at DESC""",
            (student_user_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def approved_student_ids_for_subject(subject_id: int) -> list[int]:
    """Return student table IDs for all approved enrollments in a subject.
    Links through users -> students via user_id.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT s.id FROM students s
               JOIN enrollments e ON e.student_user_id = s.user_id
               WHERE e.subject_id = ? AND e.status = 'approved'""",
            (subject_id,),
        ).fetchall()
        return [row["id"] for row in rows]


def save_session_photo(session_id: int, image_bytes: bytes, content_type: str = "image/jpeg") -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO session_photos (session_id, image, content_type) VALUES (?, ?, ?)",
            (session_id, sqlite3.Binary(image_bytes), content_type),
        )
        return cur.lastrowid


def session_photos_with_data(session_id: int) -> list[dict]:
    import base64
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, image, content_type, captured_at FROM session_photos "
            "WHERE session_id = ? ORDER BY captured_at",
            (session_id,),
        ).fetchall()
        out = []
        for r in rows:
            raw = bytes(r["image"]) if r["image"] is not None else b""
            b64 = base64.b64encode(raw).decode()
            out.append({
                "id": r["id"], "content_type": r["content_type"], "captured_at": r["captured_at"],
                "image": f"data:{r['content_type']};base64,{b64}",
            })
        return out


def count_session_photos(session_id: int) -> int:
    with get_connection() as conn:
        return conn.execute(
            "SELECT COUNT(*) FROM session_photos WHERE session_id = ?", (session_id,)
        ).fetchone()[0]


def open_self_mark_sessions_for_student(student_user_id: int) -> list[dict]:
    """Active, still-open self check-in sessions for subjects this student is
    approved-enrolled in — independent of the timetable."""
    now_iso = datetime.now().isoformat()
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT s.id, s.subject_id, sub.name, sub.code, sub.section, s.open_until
               FROM attendance_sessions s
               JOIN subjects sub ON sub.id = s.subject_id
               WHERE s.status = 'active' AND s.allow_self_mark = 1
                 AND (s.open_until IS NULL OR s.open_until > ?)
                 AND s.subject_id IN (
                     SELECT subject_id FROM enrollments
                     WHERE student_user_id = ? AND status = 'approved'
                 )
               ORDER BY s.id DESC""",
            (now_iso, student_user_id),
        ).fetchall()
        return [
            {"id": r["id"], "subject_id": r["subject_id"], "subject_name": r["name"],
             "subject_code": r["code"], "section": r["section"], "open_until": r["open_until"]}
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Attendance sessions
# ---------------------------------------------------------------------------

def create_attendance_session(subject_id: int, faculty_id: int, method: str = "live",
                              duration_minutes: int | None = None,
                              allow_self_mark: bool = True) -> dict:
    from datetime import timedelta
    session_date = date.today().isoformat()
    start_time = datetime.now().strftime("%H:%M:%S")
    open_until = (datetime.now() + timedelta(minutes=duration_minutes)).isoformat() if duration_minutes else None
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO attendance_sessions
               (subject_id, faculty_id, session_date, start_time, method, open_until, allow_self_mark)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (subject_id, faculty_id, session_date, start_time, method, open_until, 1 if allow_self_mark else 0),
        )
        return {
            "id": cursor.lastrowid, "subject_id": subject_id, "faculty_id": faculty_id,
            "session_date": session_date, "start_time": start_time,
            "status": "active", "method": method,
            "open_until": open_until, "allow_self_mark": allow_self_mark,
        }


def _session_is_open(status: str, open_until: str | None) -> bool:
    if status != "active":
        return False
    if not open_until:
        return True
    try:
        return datetime.fromisoformat(open_until) > datetime.now()
    except ValueError:
        return True


def get_attendance_session(session_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT s.id, s.subject_id, s.faculty_id, s.session_date, s.start_time,
               s.end_time, s.status, s.method, s.created_at,
               sub.name as subject_name, sub.code as subject_code, sub.section,
               s.open_until, s.allow_self_mark
               FROM attendance_sessions s
               JOIN subjects sub ON sub.id = s.subject_id
               WHERE s.id = ?""",
            (session_id,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["allow_self_mark"] = bool(d.get("allow_self_mark", 1))
        d["is_open"] = _session_is_open(d.get("status"), d.get("open_until"))
        return d


def finalize_session(session_id: int) -> bool:
    end_time = datetime.now().strftime("%H:%M:%S")
    with get_connection() as conn:
        conn.execute(
            "UPDATE attendance_sessions SET status = 'finalized', end_time = ? WHERE id = ?",
            (end_time, session_id),
        )
        return True


def list_sessions_for_subject(subject_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT s.id, s.subject_id, s.faculty_id, s.session_date, s.start_time,
               s.end_time, s.status, s.method,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND LOWER(a.status) = 'present') as present_count,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) as total_count
               FROM attendance_sessions s
               WHERE s.subject_id = ?
               ORDER BY s.session_date DESC, s.start_time DESC""",
            (subject_id,),
        ).fetchall()
        return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def create_notification(user_id: int, title: str, message: str,
                        notification_type: str = "info",
                        related_session_id: int | None = None) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO notifications (user_id, title, message, type, related_session_id)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, title, message, notification_type, related_session_id),
        )
        return cursor.lastrowid


def get_notifications(user_id: int, unread_only: bool = False) -> list[dict]:
    with get_connection() as conn:
        if unread_only:
            rows = conn.execute(
                """SELECT id, user_id, title, message, type, related_session_id, is_read, created_at
                   FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC""",
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, user_id, title, message, type, related_session_id, is_read, created_at
                   FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50""",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]


def mark_notification_read(notification_id: int, user_id: int) -> bool:
    with get_connection() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
            (notification_id, user_id),
        )
        return True


def mark_all_notifications_read(user_id: int) -> bool:
    with get_connection() as conn:
        conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
        return True


def notification_exists(user_id: int, related_session_id: int, notification_type: str) -> bool:
    """Check if a notification already exists to prevent duplicates."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM notifications WHERE user_id = ? AND related_session_id = ? AND type = ?",
            (user_id, related_session_id, notification_type),
        ).fetchone()
        return row is not None


# ---------------------------------------------------------------------------
# Timetable / scheduled classes
# ---------------------------------------------------------------------------

def get_or_create_subject_by_code(faculty_id: int, code: str | None, name: str,
                                  section: str | None = None) -> dict:
    with get_connection() as conn:
        if code:
            row = conn.execute(
                "SELECT id FROM subjects WHERE faculty_id = ? AND code = ? AND IFNULL(section,'') = IFNULL(?,'')",
                (faculty_id, code, section),
            ).fetchone()
            if row:
                existing = get_subject(row["id"])
                if existing:
                    return existing
    return create_subject(faculty_id, name=name, code=code, section=section)


def create_scheduled_class(faculty_id: int, subject_id: int | None, course_code: str | None,
                           course_name: str | None, section: str | None, day_of_week: int,
                           start_time: str, end_time: str | None, room: str | None,
                           faculty_name: str | None) -> bool:
    with get_connection() as conn:
        try:
            conn.execute(
                """INSERT INTO scheduled_classes
                   (faculty_id, subject_id, course_code, course_name, section, day_of_week,
                    start_time, end_time, room, faculty_name)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (faculty_id, subject_id, course_code, course_name, section, day_of_week,
                 start_time, end_time, room, faculty_name),
            )
            return True
        except Exception:
            return False  # UNIQUE violation -> slot already exists


def _scheduled_row(row) -> dict:
    return {
        "id": row["id"], "faculty_id": row["faculty_id"], "subject_id": row["subject_id"],
        "course_code": row["course_code"], "course_name": row["course_name"],
        "section": row["section"], "day_of_week": row["day_of_week"],
        "start_time": row["start_time"], "end_time": row["end_time"],
        "room": row["room"], "faculty_name": row["faculty_name"],
    }


def list_scheduled_classes(faculty_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM scheduled_classes WHERE faculty_id = ? ORDER BY day_of_week, start_time",
            (faculty_id,),
        ).fetchall()
        return [_scheduled_row(r) for r in rows]


def scheduled_classes_for_day(faculty_id: int, day_of_week: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM scheduled_classes WHERE faculty_id = ? AND day_of_week = ? ORDER BY start_time",
            (faculty_id, day_of_week),
        ).fetchall()
        return [_scheduled_row(r) for r in rows]


def scheduled_classes_for_student_day(user_id: int, day_of_week: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT * FROM scheduled_classes sc
               WHERE sc.day_of_week = ? AND sc.subject_id IN (
                   SELECT e.subject_id FROM enrollments e
                   WHERE e.student_user_id = ? AND e.status = 'approved'
               ) ORDER BY sc.start_time""",
            (day_of_week, user_id),
        ).fetchall()
        return [_scheduled_row(r) for r in rows]


def delete_scheduled_class(class_id: int, faculty_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM scheduled_classes WHERE id = ? AND faculty_id = ?",
            (class_id, faculty_id),
        )
        return cur.rowcount > 0


def session_for_schedule_today(subject_id: int, session_date=None) -> dict | None:
    from datetime import date as _date
    session_date = session_date or _date.today()
    sd = session_date.isoformat() if hasattr(session_date, "isoformat") else session_date
    with get_connection() as conn:
        row = conn.execute(
            """SELECT s.id, s.status, s.method, s.start_time, s.open_until, s.allow_self_mark,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND LOWER(a.status) = 'present') as present_count
               FROM attendance_sessions s
               WHERE s.subject_id = ? AND s.session_date = ?
               ORDER BY s.start_time DESC LIMIT 1""",
            (subject_id, sd),
        ).fetchone()
        if not row:
            return None
        return {"id": row["id"], "status": row["status"], "method": row["method"],
                "start_time": row["start_time"], "present_count": row["present_count"],
                "allow_self_mark": bool(row["allow_self_mark"]) if row["allow_self_mark"] is not None else True,
                "is_open": _session_is_open(row["status"], row["open_until"]),
                "open_until": row["open_until"]}


# ---------------------------------------------------------------------------
# Database initialization
# ---------------------------------------------------------------------------

def init_db() -> None:
    from backend.database.db import init_db as _init_db
    _init_db()
