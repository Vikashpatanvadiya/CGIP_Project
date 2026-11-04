# Backend container for Hugging Face Spaces (Docker SDK).
# Runs the Flask + InsightFace API under gunicorn on port 7860.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    DET_SIZE=320 \
    PORT=7860

# System libraries: OpenCV runtime (libGL, glib) + build tools for insightface.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake \
        libgl1 libglib2.0-0 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (Hugging Face Spaces convention; HOME must be writable).
RUN useradd -m -u 1000 user
USER user
WORKDIR /app

# --- Python dependencies ---
COPY --chown=user requirements.txt .
RUN pip install --user -r requirements.txt \
 # insightface pulls in opencv-python, which collides with opencv-contrib-python
 # (both own the cv2/ folder). Remove it and force the contrib build back in.
 && pip uninstall -y opencv-python opencv-python-headless || true \
 && pip install --user --force-reinstall --no-deps opencv-contrib-python==4.14.0.94

# --- Application code ---
COPY --chown=user . .

# Bake the ArcFace + SCRFD model into the image so the first request is fast
# and the server never downloads 281 MB at boot (which caused the port-scan
# timeout on Render).
RUN python -c "from backend.vision.face_engine import warm_up; warm_up()"

EXPOSE 7860
CMD ["gunicorn", "backend.app:create_app()", "-c", "gunicorn.conf.py"]
