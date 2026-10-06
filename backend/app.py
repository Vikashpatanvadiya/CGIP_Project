"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Flask REST API — the "API Gateway" block in the system architecture diagram.
Exposes endpoints for the React frontend to register students, submit camera
frames for recognition/attendance, and pull attendance reports.
"""

import base64

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS

from backend.database import store as models
from backend.services import report_service
from backend.services.attendance_service import process_frame
from backend.services.enrollment_service import register_student, NoFaceDetectedError

app = Flask(__name__)
CORS(app)


def _decode_base64_image(data_url: str) -> np.ndarray:
    """Decode a `data:image/jpeg;base64,...` string (sent by the browser's
    <canvas>.toDataURL()) into a BGR numpy image.
    """
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    binary = base64.b64decode(data_url)
    array = np.frombuffer(binary, dtype=np.uint8)
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


def _face_result_json(r) -> dict:
    return {
        "box": {"x": r.box.x, "y": r.box.y, "w": r.box.w, "h": r.box.h},
        "student_id": r.student_id,
        "name": r.name,
        "enrollment_no": r.enrollment_no,
        "confidence": round(r.confidence, 3),
        "attendance_marked": r.attendance_marked,
    }


@app.get("/api/health")
def health():
    return jsonify(status="ok")


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
    """Faculty uploads a single group photo; recognize every enrolled student
    in it and mark their attendance in one shot."""
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
    from datetime import date
    date_param = request.args.get("date")
    session_date = date.fromisoformat(date_param) if date_param else date.today()
    return jsonify(models.attendance_for_date(session_date))


@app.get("/api/attendance/export")
def export_attendance():
    from datetime import date
    date_param = request.args.get("date")
    fmt = request.args.get("format", "csv")
    session_date = date.fromisoformat(date_param) if date_param else date.today()

    if fmt == "xlsx":
        try:
            data = report_service.export_xlsx(session_date)
        except ImportError:
            # openpyxl/pyexpat unavailable in this Python env — fall back to CSV
            # rather than 500ing, so the report is still downloadable.
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
    # Port 5050, not 5000: macOS's AirPlay Receiver listens on 5000 (IPv6)
    # and will intercept requests with a 403 before Flask ever sees them.
    #
    # use_reloader=False: loading the ArcFace model twice (reloader spawns a
    # child process) wastes ~600MB RAM and doubles startup time.
    flask_app = create_app()
    try:
        from backend.vision.face_engine import warm_up
        warm_up()  # load the model now so the first request isn't slow
    except Exception as exc:  # noqa: BLE001 - don't block startup on model issues
        flask_app.logger.warning("Face engine warm-up skipped: %s", exc)
    flask_app.run(debug=True, port=5050, use_reloader=False)
