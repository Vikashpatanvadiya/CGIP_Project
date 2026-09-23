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

from backend.database import models
from backend.database.db import init_db
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
    return jsonify([
        {
            "box": {"x": r.box.x, "y": r.box.y, "w": r.box.w, "h": r.box.h},
            "student_id": r.student_id,
            "name": r.name,
            "confidence": round(r.confidence, 3),
            "attendance_marked": r.attendance_marked,
        }
        for r in results
    ])


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
        data = report_service.export_xlsx(session_date)
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
    init_db()
    return app


if __name__ == "__main__":
    # Port 5050, not 5000: macOS's AirPlay Receiver listens on 5000 (IPv6)
    # and will intercept requests with a 403 before Flask ever sees them.
    create_app().run(debug=True, port=5050)
