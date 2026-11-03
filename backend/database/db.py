"""
Module Owner: Krishna Patel (24000131) — Database & GUI

SQLite connection handling and schema creation. Kept dependency-free
(standard library sqlite3) so the whole project runs without a separate
database server, per the project doc's technology stack (Python + local
storage, no cloud storage in Excluded Features).
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "attendance.db"

# ---------------------------------------------------------------------------
# Original tables (kept for backward compatibility)
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_section TEXT,
    user_id INTEGER REFERENCES users(id),
    registered_on TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    created_on TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    session_date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present',
    confidence REAL,
    session_id INTEGER REFERENCES attendance_sessions(id),
    manually_set INTEGER NOT NULL DEFAULT 0,
    UNIQUE(student_id, session_date, session_id)
);
"""

# ---------------------------------------------------------------------------
# New tables for subject-wise attendance management
# ---------------------------------------------------------------------------
SCHEMA_V2 = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('faculty', 'student')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT,
    section TEXT,
    capacity INTEGER NOT NULL DEFAULT 60,
    join_code TEXT UNIQUE NOT NULL,
    allow_self_registration INTEGER NOT NULL DEFAULT 1,
    faculty_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_user_id INTEGER NOT NULL REFERENCES users(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT,
    UNIQUE(student_user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    faculty_id INTEGER NOT NULL REFERENCES users(id),
    session_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'finalized')),
    method TEXT NOT NULL DEFAULT 'live' CHECK(method IN ('live', 'group_photo', 'self_mark')),
    open_until TEXT,
    allow_self_mark INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    related_session_id INTEGER REFERENCES attendance_sessions(id),
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


@contextmanager
def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _safe_add_column(conn, table: str, column: str, col_type: str, default=None) -> None:
    """Add a column to an existing table if it doesn't already exist.
    SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN,
    so we catch the 'duplicate column' error silently.
    """
    default_clause = f" DEFAULT {default}" if default is not None else ""
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}")
    except sqlite3.OperationalError as e:
        if "duplicate column" not in str(e).lower():
            raise


def _migrate_attendance_constraint(conn) -> None:
    """Migrate the attendance table's UNIQUE constraint from
    (student_id, session_date) to (student_id, session_date, session_id).
    SQLite doesn't support DROP CONSTRAINT, so we recreate the table if needed.
    """
    # Check current table schema
    info = conn.execute("PRAGMA table_info(attendance)").fetchall()
    columns = {row[1] for row in info}

    if "session_id" not in columns or "manually_set" not in columns:
        # Need to recreate the table with new schema
        conn.execute("""
            CREATE TABLE IF NOT EXISTS attendance_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                session_date TEXT NOT NULL,
                time_in TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Present',
                confidence REAL,
                session_id INTEGER REFERENCES attendance_sessions(id),
                manually_set INTEGER NOT NULL DEFAULT 0,
                UNIQUE(student_id, session_date, session_id)
            )
        """)
        # Copy existing data
        conn.execute("""
            INSERT OR IGNORE INTO attendance_new (id, student_id, session_date, time_in, status, confidence)
            SELECT id, student_id, session_date, time_in, status, confidence FROM attendance
        """)
        conn.execute("DROP TABLE attendance")
        conn.execute("ALTER TABLE attendance_new RENAME TO attendance")


def _migrate_students_user_id(conn) -> None:
    """Add user_id column to students table if not present."""
    _safe_add_column(conn, "students", "user_id", "INTEGER")
    _safe_add_column(conn, "students", "photo", "BLOB")
    _safe_add_column(conn, "attendance_sessions", "open_until", "TEXT")
    _safe_add_column(conn, "attendance_sessions", "allow_self_mark", "INTEGER", default=1)


def init_db() -> None:
    with get_connection() as conn:
        # Create new tables first (users must exist before students references it)
        conn.executescript(SCHEMA_V2)

        # Migrate existing tables
        _migrate_students_user_id(conn)
        _migrate_attendance_constraint(conn)

        # Recreate students and face_embeddings with IF NOT EXISTS (safe for fresh DBs)
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_no TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                class_section TEXT,
                user_id INTEGER REFERENCES users(id),
                registered_on TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS face_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                embedding TEXT NOT NULL,
                created_on TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                session_date TEXT NOT NULL,
                time_in TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Present',
                confidence REAL,
                session_id INTEGER REFERENCES attendance_sessions(id),
                manually_set INTEGER NOT NULL DEFAULT 0,
                UNIQUE(student_id, session_date, session_id)
            );

            CREATE TABLE IF NOT EXISTS session_photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
                image BLOB NOT NULL,
                content_type TEXT NOT NULL DEFAULT 'image/jpeg',
                captured_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS scheduled_classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                faculty_id INTEGER NOT NULL REFERENCES users(id),
                subject_id INTEGER REFERENCES subjects(id),
                course_code TEXT,
                course_name TEXT,
                section TEXT,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                room TEXT,
                faculty_name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(faculty_id, course_code, section, day_of_week, start_time)
            );

            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL REFERENCES subjects(id),
                student_user_id INTEGER NOT NULL REFERENCES users(id),
                exam_name TEXT NOT NULL,
                exam_date TEXT,
                total_marks REAL,
                obtained_marks REAL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(subject_id, student_user_id, exam_name)
            );
        """)
