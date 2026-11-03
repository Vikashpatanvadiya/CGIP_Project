"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Flask REST API — the "API Gateway" block in the system architecture diagram.
Exposes endpoints for the React frontend to register users, manage subjects,
track attendance, submit camera frames for recognition, and export reports.
"""

import base64
import os
import sys
from datetime import date
from functools import wraps
from pathlib import Path

# Ensure project root is on sys.path when running `python backend/app.py` directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import numpy as np
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from backend.database import store as models
from backend.services import report_service
from backend.services.attendance_service import process_frame
from backend.services.enrollment_service import NoFaceDetectedError, register_student
from backend.services.self_mark_service import SelfMarkError, self_mark
from backend.services.timetable_service import parse_timetable_text

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY", "facial-attendance-system-secret-2025")
_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="auth_token")


def _create_token(user_id: int) -> str:
    return _serializer.dumps({"user_id": user_id})


def _verify_token(token: str) -> dict | None:
    try:
        data = _serializer.loads(token, max_age=86400 * 30)
        return models.get_user_by_id(data["user_id"])
    except (BadSignature, SignatureExpired, KeyError, TypeError):
        return None


def get_auth_user() -> dict | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        return _verify_token(token)
    return None


def _decode_base64_image(data_url: str) -> np.ndarray | None:
    """Decode a `data:image/jpeg;base64,...` string (sent by the browser's
    <canvas>.toDataURL()) into a BGR numpy image.
    """
    if not data_url:
        return None
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    try:
        binary = base64.b64decode(data_url)
        array = np.frombuffer(binary, dtype=np.uint8)
        return cv2.imdecode(array, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _face_result_json(r) -> dict:
    return {
        "box": {"x": r.box.x, "y": r.box.y, "w": r.box.w, "h": r.box.h},
        "student_id": r.student_id,
        "name": r.name,
        "enrollment_no": r.enrollment_no,
        "confidence": round(r.confidence, 3),
        "attendance_marked": r.attendance_marked,
    }


# ==========================================
# Health
# ==========================================

@app.get("/api/health")
def health():
    return jsonify(status="ok")


# ==========================================
# Auth API
# ==========================================

@app.post("/api/auth/register")
def register_user():
    payload = request.get_json(force=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    name = str(payload.get("name", "")).strip()
    role = str(payload.get("role", "faculty")).strip().lower()

    if not email or not password or not name:
        return jsonify(error="Email, password, and name are required"), 400
    if len(password) < 6:
        return jsonify(error="Password must be at least 6 characters"), 400
    if role not in ("faculty", "student"):
        return jsonify(error="Role must be either 'faculty' or 'student'"), 400

    existing = models.get_user_by_email(email)
    if existing:
        return jsonify(error="An account with this email already exists"), 400

    password_hash = generate_password_hash(password)
    user_id = models.create_user(email, password_hash, name, role)
    token = _create_token(user_id)
    user_data = {"id": user_id, "email": email, "name": name, "role": role}
    return jsonify(token=token, user=user_data), 201


@app.post("/api/auth/login")
def login_user():
    payload = request.get_json(force=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify(error="Email and password are required"), 400

    user = models.get_user_by_email(email)
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify(error="Invalid email or password"), 401

    token = _create_token(user["id"])
    user_data = {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    return jsonify(token=token, user=user_data)


@app.get("/api/auth/me")
def get_me():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    user_data = {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    return jsonify(user=user_data)


# ==========================================
# Subjects (Faculty) API
# ==========================================

@app.get("/api/subjects")
def get_subjects():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    return jsonify(models.list_subjects_for_faculty(user["id"]))


@app.post("/api/subjects")
def create_subject():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    name = str(payload.get("name", "")).strip()
    if not name:
        return jsonify(error="Subject name is required"), 400
    code = str(payload.get("code", "")).strip() or None
    section = str(payload.get("section", "")).strip() or None
    capacity = int(payload.get("capacity") or 60)
    allow_self_registration = bool(payload.get("allow_self_registration", False))

    subject = models.create_subject(
        faculty_id=user["id"],
        name=name,
        code=code,
        section=section,
        capacity=capacity,
        allow_self_registration=allow_self_registration,
    )
    return jsonify(subject), 201


@app.get("/api/subjects/<int:subject_id>")
def get_subject_detail(subject_id: int):
    subject = models.get_subject(subject_id)
    if not subject:
        return jsonify(error="Subject not found"), 404
    return jsonify(subject)


@app.put("/api/subjects/<int:subject_id>")
def update_subject_detail(subject_id: int):
    payload = request.get_json(force=True) or {}
    models.update_subject(subject_id, **payload)
    subject = models.get_subject(subject_id)
    return jsonify(subject)


@app.delete("/api/subjects/<int:subject_id>")
def delete_subject_detail(subject_id: int):
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    ok = models.delete_subject(subject_id, user["id"])
    if not ok:
        return jsonify(error="Subject not found or not yours to delete"), 403
    return jsonify(success=True)


@app.get("/api/subjects/<int:subject_id>/roster")
def get_subject_roster(subject_id: int):
    return jsonify(models.list_enrollments_for_subject(subject_id, status="approved"))


@app.get("/api/subjects/<int:subject_id>/enrollments")
def get_subject_enrollments(subject_id: int):
    status = request.args.get("status")
    return jsonify(models.list_enrollments_for_subject(subject_id, status=status))


# ==========================================
# Enrollments API
# ==========================================

@app.post("/api/enrollments/join")
def join_class():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    join_code = str(payload.get("join_code", "")).strip().upper()
    if not join_code:
        return jsonify(error="Join code is required"), 400

    subject = models.get_subject_by_join_code(join_code)
    if not subject:
        return jsonify(error="No class found with that code"), 404

    existing = models.get_enrollment_by_student_subject(user["id"], subject["id"])
    if existing:
        return jsonify(error=f"You already joined or requested this class (Status: {existing['status']})"), 400

    enrollment = models.create_enrollment(user["id"], subject["id"])
    if subject.get("allow_self_registration"):
        models.update_enrollment_status(enrollment["id"], "approved")
        enrollment["status"] = "approved"

    return jsonify(enrollment), 201


@app.get("/api/enrollments/my")
def get_my_enrollments():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    return jsonify(models.list_enrollments_for_student(user["id"]))


@app.post("/api/enrollments/<int:enrollment_id>/approve")
def approve_enrollment(enrollment_id: int):
    models.update_enrollment_status(enrollment_id, "approved")
    enr = models.get_enrollment(enrollment_id)
    if enr:
        models.create_notification(
            enr["student_user_id"],
            "Enrollment Approved",
            "Your request to join class was approved.",
            "enrollment",
        )
    return jsonify(success=True)


@app.post("/api/enrollments/<int:enrollment_id>/reject")
def reject_enrollment(enrollment_id: int):
    models.update_enrollment_status(enrollment_id, "rejected")
    enr = models.get_enrollment(enrollment_id)
    if enr:
        models.create_notification(
            enr["student_user_id"],
            "Enrollment Rejected",
            "Your request to join class was not approved.",
            "enrollment",
        )
    return jsonify(success=True)


# ==========================================
# Sessions (Faculty) API
# ==========================================

@app.post("/api/subjects/<int:subject_id>/sessions")
def create_session(subject_id: int):
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    method = payload.get("method", "live")
    duration_minutes = payload.get("duration_minutes")
    try:
        duration_minutes = int(duration_minutes) if duration_minutes else None
    except (TypeError, ValueError):
        duration_minutes = None
    allow_self_mark = bool(payload.get("allow_self_mark", True))
    session = models.create_attendance_session(
        subject_id, user["id"], method=method,
        duration_minutes=duration_minutes, allow_self_mark=allow_self_mark,
    )
    return jsonify(session), 201


@app.get("/api/subjects/<int:subject_id>/sessions")
def get_subject_sessions(subject_id: int):
    return jsonify(models.list_sessions_for_subject(subject_id))


@app.get("/api/sessions/<int:session_id>")
def get_session(session_id: int):
    session = models.get_attendance_session(session_id)
    if not session:
        return jsonify(error="Session not found"), 404
    return jsonify(session)


@app.post("/api/sessions/<int:session_id>/mark-frame")
def mark_session_frame(session_id: int):
    payload = request.get_json(force=True) or {}
    image_b64 = payload.get("image")
    if not image_b64:
        return jsonify(error="image is required"), 400

    frame = _decode_base64_image(image_b64)
    if frame is None:
        return jsonify(error="could not decode image"), 400

    session = models.get_attendance_session(session_id)
    allowed_ids = models.approved_student_ids_for_subject(session["subject_id"]) if session else None
    results = process_frame(frame, session_id=session_id, allowed_student_ids=allowed_ids)
    return jsonify([_face_result_json(r) for r in results])


@app.post("/api/sessions/<int:session_id>/mark-group-photo")
def mark_session_group_photo(session_id: int):
    payload = request.get_json(force=True) or {}
    image_b64 = payload.get("image")
    if not image_b64:
        return jsonify(error="image is required"), 400

    photo = _decode_base64_image(image_b64)
    if photo is None:
        return jsonify(error="could not decode image"), 400

    session = models.get_attendance_session(session_id)
    allowed_ids = models.approved_student_ids_for_subject(session["subject_id"]) if session else None
    results = process_frame(photo, session_id=session_id, allowed_student_ids=allowed_ids)
    recognized = [r for r in results if r.student_id is not None]

    # Save the uploaded photo as attendance evidence (re-encoded to JPEG).
    try:
        ok, buf = cv2.imencode(".jpg", photo, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if ok:
            models.save_session_photo(session_id, buf.tobytes(), "image/jpeg")
    except Exception as exc:  # noqa: BLE001 - never fail attendance over evidence save
        app.logger.warning("Could not save session photo: %s", exc)

    return jsonify({
        "faces_detected": len(results),
        "recognized": len(recognized),
        "newly_marked": sum(1 for r in recognized if r.attendance_marked),
        "results": [_face_result_json(r) for r in results],
    })


@app.get("/api/sessions/<int:session_id>/photos")
def get_session_photos(session_id: int):
    """Faculty-only: the evidence photos stored for a session (as data URLs)."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    return jsonify(models.session_photos_with_data(session_id))


@app.post("/api/sessions/<int:session_id>/self-mark")
def session_self_mark(session_id: int):
    """A student marks their own attendance during an open session window.
    Requires head-turn liveness + a match to their registered face."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    if user.get("role") != "student":
        return jsonify(error="Only students can self check-in"), 403

    session = models.get_attendance_session(session_id)
    if not session:
        return jsonify(error="Session not found"), 404
    if not session.get("is_open"):
        return jsonify(error="This attendance session is closed.", code="closed"), 403
    if not session.get("allow_self_mark", True):
        return jsonify(error="Self check-in is not enabled for this session.", code="disabled"), 403

    # Must be an approved student of this subject.
    approved_ids = models.approved_student_ids_for_subject(session["subject_id"])
    student = models.get_student_by_user_id(user["id"])
    if not student:
        return jsonify(error="Register your Face ID first, then try again.", code="no_face"), 422
    if student["id"] not in approved_ids:
        return jsonify(error="You are not enrolled in this class.", code="not_enrolled"), 403

    payload = request.get_json(force=True) or {}
    images_b64 = payload.get("images", [])
    frames = [img for img in (_decode_base64_image(i) for i in images_b64) if img is not None]

    try:
        result = self_mark(student, session, frames)
    except SelfMarkError as exc:
        return jsonify(error=str(exc), code=exc.code), 422

    return jsonify(result)


@app.post("/api/sessions/<int:session_id>/finalize")
def finalize_session_route(session_id: int):
    payload = request.get_json(force=True) or {}
    corrections = payload.get("corrections", [])
    for c in corrections:
        student_id = c.get("student_id")
        status = c.get("status", "Present")
        if student_id:
            models.update_attendance_status(student_id, session_id, status, manually_set=True)
    models.finalize_session(session_id)
    return jsonify(success=True)


@app.get("/api/sessions/<int:session_id>/attendance")
def get_session_attendance(session_id: int):
    return jsonify(models.attendance_for_session(session_id))


# ==========================================
# Student API
# ==========================================

@app.get("/api/student/subjects")
def get_student_subjects():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    enrollments = models.list_enrollments_for_student(user["id"])
    student = models.get_student_by_user_id(user["id"])
    result = []
    for e in enrollments:
        if e.get("status") == "approved":
            sessions = models.list_sessions_for_subject(e["subject_id"])
            total_sessions = len(sessions)
            attended_sessions = 0
            if student:
                for s in sessions:
                    if models.has_marked_attendance_session(student["id"], s["id"]):
                        attended_sessions += 1
            result.append({
                "id": e["subject_id"],
                "subject_id": e["subject_id"],
                "name": e["subject_name"],
                "code": e.get("code") or e.get("subject_code"),
                "section": e.get("section"),
                "faculty_name": e.get("faculty_name"),
                "status": e["status"],
                "total_sessions": total_sessions,
                "attended_sessions": attended_sessions,
            })
    return jsonify(result)


@app.get("/api/student/attendance")
def get_student_attendance():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    subject_id_str = request.args.get("subject_id")
    student = models.get_student_by_user_id(user["id"])
    if not student:
        return jsonify([])

    if subject_id_str:
        try:
            subject_id = int(subject_id_str)
            sessions = models.list_sessions_for_subject(subject_id)
            records = []
            for s in sessions:
                att_rows = [a for a in models.attendance_for_session(s["id"]) if a.get("student_id") == student["id"]]
                att = att_rows[0] if att_rows else None
                is_present = att is not None and str(att.get("status", "")).lower() == "present"
                records.append({
                    "id": s["id"],
                    "session_id": s["id"],
                    "session_date": s.get("session_date"),
                    "time_in": att.get("time_in") if att else None,
                    "status": "present" if is_present else "absent",
                    "confidence": round(float(att.get("confidence", 0.0)), 3) if att and att.get("confidence") else 0.0,
                    "method": s.get("method", "live"),
                })
            return jsonify(records)
        except Exception:
            return jsonify([])
    return jsonify([])


@app.get("/api/student/open-sessions")
def student_open_sessions():
    """Self check-in windows the student can act on right now — independent of
    the timetable. Used to always surface a 'Give Attendance' prompt."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    student = models.get_student_by_user_id(user["id"])
    sessions = models.open_self_mark_sessions_for_student(user["id"])
    out = []
    for s in sessions:
        attended = bool(student) and models.has_marked_attendance_session(student["id"], s["id"])
        out.append({**s, "attended": attended})
    return jsonify(has_face=bool(student), sessions=out)


@app.post("/api/student/register-face")
def student_register_face():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    enrollment_no = payload.get("enrollment_no")
    name = payload.get("name") or user["name"]
    images_b64 = payload.get("images", [])

    if not enrollment_no:
        return jsonify(error="Enrollment number is required"), 400
    if not images_b64:
        return jsonify(error="At least one sample image is required"), 400

    try:
        images = [_decode_base64_image(img) for img in images_b64]
        student_id = register_student(enrollment_no, name, images)
        models.link_student_to_user(student_id, user["id"])
    except NoFaceDetectedError as exc:
        return jsonify(error=str(exc)), 422
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    return jsonify(id=student_id, enrollment_no=enrollment_no, name=name), 201


# ==========================================
# Timetable API
# ==========================================

_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@app.post("/api/timetable/parse")
def timetable_parse():
    """Parse pasted timetable text and return a preview (nothing is saved)."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    text = str(payload.get("text", ""))
    if not text.strip():
        return jsonify(error="Paste your timetable text first"), 400
    return jsonify(classes=parse_timetable_text(text))


@app.post("/api/timetable/import")
def timetable_import():
    """Create subjects + weekly scheduled classes from the selected slots."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    payload = request.get_json(force=True) or {}
    classes = payload.get("classes", [])
    if not classes:
        return jsonify(error="No classes to import"), 400

    imported = 0
    subjects_created = {}
    for c in classes:
        day = c.get("day_of_week")
        start = c.get("start_time")
        if day is None or not start:
            continue  # a slot with no day/time can't be scheduled

        code = (c.get("course_code") or "").strip() or None
        name = (c.get("course_name") or code or "Untitled Class").strip()
        section = (c.get("section") or "").strip() or None

        subj_key = (code, section)
        if subj_key in subjects_created:
            subject = subjects_created[subj_key]
        else:
            subject = models.get_or_create_subject_by_code(user["id"], code, name, section)
            subjects_created[subj_key] = subject

        if models.create_scheduled_class(
            faculty_id=user["id"], subject_id=subject["id"], course_code=code,
            course_name=name, section=section, day_of_week=int(day),
            start_time=start, end_time=c.get("end_time"),
            room=c.get("room"), faculty_name=c.get("faculty_name"),
        ):
            imported += 1

    return jsonify(imported=imported, subjects=len(subjects_created)), 201


@app.get("/api/timetable")
def timetable_list():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    return jsonify(models.list_scheduled_classes(user["id"]))


@app.delete("/api/timetable/<int:class_id>")
def timetable_delete(class_id: int):
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    models.delete_scheduled_class(class_id, user["id"])
    return jsonify(success=True)


def _selected_date():
    """Return the ?date=YYYY-MM-DD query param as a date, or today if absent/bad."""
    raw = request.args.get("date")
    if raw:
        try:
            return date.fromisoformat(raw)
        except ValueError:
            pass
    return date.today()


@app.get("/api/faculty/today")
def faculty_today():
    """Scheduled classes for the faculty on the selected date (defaults to
    today), each with its subject and whether a session was held that date."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    day = _selected_date()
    weekday = day.weekday()
    classes = models.scheduled_classes_for_day(user["id"], weekday)
    out = []
    for c in classes:
        session = models.session_for_schedule_today(c["subject_id"], day) if c.get("subject_id") else None
        out.append({**c, "session": session})
    return jsonify(day_name=_WEEKDAYS[weekday], date=day.isoformat(), classes=out)


@app.get("/api/student/today")
def student_today():
    """Classes for the student's enrolled subjects on the selected date
    (defaults to today), with attendance status."""
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    day = _selected_date()
    weekday = day.weekday()
    student = models.get_student_by_user_id(user["id"])
    classes = models.scheduled_classes_for_student_day(user["id"], weekday)
    out = []
    for c in classes:
        session = models.session_for_schedule_today(c["subject_id"], day) if c.get("subject_id") else None
        attended = False
        if session and student:
            attended = models.has_marked_attendance_session(student["id"], session["id"])
        out.append({**c, "session": session, "attended": attended})
    return jsonify(
        day_name=_WEEKDAYS[weekday], date=day.isoformat(),
        has_face=bool(student), classes=out,
    )


# ==========================================
# Notifications API
# ==========================================

@app.get("/api/notifications")
def get_notifications_route():
    user = get_auth_user()
    if not user:
        return jsonify([])
    return jsonify(models.get_notifications(user["id"]))


@app.post("/api/notifications/<int:notification_id>/read")
def mark_notification_read_route(notification_id: int):
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    models.mark_notification_read(notification_id, user["id"])
    return jsonify(success=True)


@app.post("/api/notifications/read-all")
def mark_all_notifications_read_route():
    user = get_auth_user()
    if not user:
        return jsonify(error="Unauthorized"), 401
    models.mark_all_notifications_read(user["id"])
    return jsonify(success=True)


# ==========================================
# Legacy API (unauthenticated access preserved)
# ==========================================

@app.get("/api/students")
def get_students():
    return jsonify(models.list_students())


@app.post("/api/students")
def create_student():
    payload = request.get_json(force=True)
    enrollment_no = payload.get("enrollment_no")
    name = payload.get("name")
    class_section = payload.get("class_section")
    images_b64 = payload.get("images", [])

    if not enrollment_no or not name:
        return jsonify(error="enrollment_no and name are required"), 400
    if not images_b64:
        return jsonify(error="at least one sample image is required"), 400

    try:
        images = [_decode_base64_image(img) for img in images_b64]
        student_id = register_student(enrollment_no, name, images, class_section)
    except NoFaceDetectedError as exc:
        return jsonify(error=str(exc)), 422
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    return jsonify(id=student_id, enrollment_no=enrollment_no, name=name), 201


@app.post("/api/attendance/mark")
def mark_attendance_from_frame():
    payload = request.get_json(force=True)
    image_b64 = payload.get("image")
    if not image_b64:
        return jsonify(error="image is required"), 400

    frame = _decode_base64_image(image_b64)
    if frame is None:
        return jsonify(error="could not decode image"), 400

    results = process_frame(frame)
    return jsonify([_face_result_json(r) for r in results])


@app.post("/api/attendance/group-photo")
def mark_attendance_from_group_photo():
    payload = request.get_json(force=True)
    image_b64 = payload.get("image")
    if not image_b64:
        return jsonify(error="image is required"), 400

    photo = _decode_base64_image(image_b64)
    if photo is None:
        return jsonify(error="could not decode image"), 400

    results = process_frame(photo)
    recognized = [r for r in results if r.student_id is not None]
    return jsonify({
        "faces_detected": len(results),
        "recognized": len(recognized),
        "newly_marked": sum(1 for r in recognized if r.attendance_marked),
        "results": [_face_result_json(r) for r in results],
    })


@app.get("/api/attendance")
def get_attendance():
    date_param = request.args.get("date")
    session_date = date.fromisoformat(date_param) if date_param else date.today()
    return jsonify(models.attendance_for_date(session_date))


@app.get("/api/attendance/export")
def export_attendance():
    date_param = request.args.get("date")
    fmt = request.args.get("format", "csv")
    session_date = date.fromisoformat(date_param) if date_param else date.today()

    if fmt == "xlsx":
        try:
            data = report_service.export_xlsx(session_date)
        except ImportError:
            return jsonify(error="Excel export unavailable in this environment; use CSV export instead."), 503
        return send_file(
            __import__("io").BytesIO(data),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"attendance_{session_date.isoformat()}.xlsx",
        )

    csv_text = report_service.export_csv(session_date)
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{session_date.isoformat()}.csv"},
    )


def create_app() -> Flask:
    models.init_db()
    app.logger.warning("Database backend: %s", models.BACKEND_NAME)
    return app


if __name__ == "__main__":
    flask_app = create_app()
    try:
        from backend.vision.face_engine import warm_up
        warm_up()
    except Exception as exc:  # noqa: BLE001
        flask_app.logger.warning("Face engine warm-up skipped: %s", exc)
    flask_app.run(debug=True, port=5050, use_reloader=False)
