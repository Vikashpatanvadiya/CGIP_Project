"""Gunicorn config for the hosted backend.

One worker (the face model is large — multiple workers would multiply RAM),
with threads for concurrency. onnxruntime releases the GIL during inference, so
threads let several students be recognized without extra memory.
"""

import os

bind = f"0.0.0.0:{os.environ.get('PORT', '7860')}"
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"


def post_worker_init(worker):
    """Load the face model once per worker, after fork (safe for onnxruntime)."""
    try:
        from backend.vision.face_engine import warm_up
        warm_up()
        worker.log.info("Face engine warmed up")
    except Exception as exc:  # noqa: BLE001
        worker.log.warning("Face engine warm-up skipped: %s", exc)
