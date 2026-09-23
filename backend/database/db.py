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

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_section TEXT,
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
    UNIQUE(student_id, session_date)
);
"""


@contextmanager
def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)
