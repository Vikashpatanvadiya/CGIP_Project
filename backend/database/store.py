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

# Database initialization
init_db = _backend.init_db

# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------
create_user = _backend.create_user
get_user_by_email = _backend.get_user_by_email
get_user_by_id = _backend.get_user_by_id

# ---------------------------------------------------------------------------
# Student management (original)
# ---------------------------------------------------------------------------
create_student = _backend.create_student
add_embedding = _backend.add_embedding
clear_embeddings = _backend.clear_embeddings
update_student_identity = _backend.update_student_identity
set_student_photo = _backend.set_student_photo
get_student_photo = _backend.get_student_photo
face_roster_for_subject = _backend.face_roster_for_subject
list_students = _backend.list_students
get_student = _backend.get_student
get_student_by_user_id = _backend.get_student_by_user_id
link_student_to_user = _backend.link_student_to_user
all_embeddings = _backend.all_embeddings
embeddings_for_students = _backend.embeddings_for_students

# ---------------------------------------------------------------------------
# Attendance (original + session-scoped)
# ---------------------------------------------------------------------------
has_marked_attendance_today = _backend.has_marked_attendance_today
mark_attendance = _backend.mark_attendance
has_marked_attendance_session = _backend.has_marked_attendance_session
update_attendance_status = _backend.update_attendance_status
attendance_for_date = _backend.attendance_for_date
attendance_for_session = _backend.attendance_for_session

# ---------------------------------------------------------------------------
# Subject management
# ---------------------------------------------------------------------------
create_subject = _backend.create_subject
get_subject = _backend.get_subject
get_subject_by_join_code = _backend.get_subject_by_join_code
list_subjects_for_faculty = _backend.list_subjects_for_faculty
update_subject = _backend.update_subject
delete_subject = _backend.delete_subject

# ---------------------------------------------------------------------------
# Enrollment management
# ---------------------------------------------------------------------------
create_enrollment = _backend.create_enrollment
get_enrollment = _backend.get_enrollment
get_enrollment_by_student_subject = _backend.get_enrollment_by_student_subject
update_enrollment_status = _backend.update_enrollment_status
list_enrollments_for_subject = _backend.list_enrollments_for_subject
list_enrollments_for_student = _backend.list_enrollments_for_student
approved_student_ids_for_subject = _backend.approved_student_ids_for_subject
open_self_mark_sessions_for_student = _backend.open_self_mark_sessions_for_student

# ---------------------------------------------------------------------------
# Student directory + exam results
# ---------------------------------------------------------------------------
list_students_for_faculty = _backend.list_students_for_faculty
results_roster = _backend.results_roster
list_exams_for_subject = _backend.list_exams_for_subject
results_for_exam = _backend.results_for_exam
upsert_result = _backend.upsert_result
delete_exam = _backend.delete_exam
list_results_for_student = _backend.list_results_for_student

# ---------------------------------------------------------------------------
# Attendance sessions
# ---------------------------------------------------------------------------
create_attendance_session = _backend.create_attendance_session
get_attendance_session = _backend.get_attendance_session
finalize_session = _backend.finalize_session
list_sessions_for_subject = _backend.list_sessions_for_subject
save_session_photo = _backend.save_session_photo
session_photos_with_data = _backend.session_photos_with_data
count_session_photos = _backend.count_session_photos

# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
create_notification = _backend.create_notification
get_notifications = _backend.get_notifications
mark_notification_read = _backend.mark_notification_read
mark_all_notifications_read = _backend.mark_all_notifications_read
notification_exists = _backend.notification_exists

# ---------------------------------------------------------------------------
# Timetable / scheduled classes
# ---------------------------------------------------------------------------
get_or_create_subject_by_code = _backend.get_or_create_subject_by_code
create_scheduled_class = _backend.create_scheduled_class
list_scheduled_classes = _backend.list_scheduled_classes
scheduled_classes_for_day = _backend.scheduled_classes_for_day
scheduled_classes_for_student_day = _backend.scheduled_classes_for_student_day
delete_scheduled_class = _backend.delete_scheduled_class
session_for_schedule_today = _backend.session_for_schedule_today
