"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Single entry point for all data access. Picks the backend at runtime:
  - Supabase/Postgres (backend.database.pg_store) when a connection string is
    configured in .env — shared cloud DB, register once, all teammates share it.
  - Local SQLite (backend.database.models) otherwise.

Both backends expose the identical function surface, so the rest of the app
(services, app.py) imports from here and never needs to know which is active.
"""

from backend.database.config import using_supabase

if using_supabase():
    from backend.database import pg_store as _backend
else:
    from backend.database import models as _backend

BACKEND_NAME = "supabase" if using_supabase() else "sqlite"

init_db = _backend.init_db
create_student = _backend.create_student
add_embedding = _backend.add_embedding
list_students = _backend.list_students
get_student = _backend.get_student
all_embeddings = _backend.all_embeddings
has_marked_attendance_today = _backend.has_marked_attendance_today
mark_attendance = _backend.mark_attendance
attendance_for_date = _backend.attendance_for_date
