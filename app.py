"""Entry point for the Hugging Face **Gradio** Space (free CPU tier).

HF's free tier allows the Gradio SDK (not Docker). A Gradio Space just runs this
file, so we:
  1. build the existing Flask REST API (backend/app.py),
  2. mount it under FastAPI (which Gradio already provides) so every /api/* route
     works unchanged,
  3. attach a tiny Gradio status page at /ui so HF sees a valid Gradio app,
  4. serve it all on port 7860 (the port HF routes to).

Local development is unchanged — you still run `backend/app.py`. This file is
only used by the Space.
"""

import os

import gradio as gr
from fastapi import FastAPI
from fastapi.middleware.wsgi import WSGIMiddleware

from backend.app import create_app

# Build the Flask app (runs init_db against Supabase using the Space secret).
flask_app = create_app()

# Load the face model once at startup so the first request is fast.
try:
    from backend.vision.face_engine import warm_up
    warm_up()
    print("[startup] face engine warmed up")
except Exception as exc:  # noqa: BLE001
    print(f"[startup] face engine warm-up skipped: {exc}")

# A minimal human-facing status page (so the Space shows something at /ui).
with gr.Blocks(title="Attendance backend") as status_page:
    gr.Markdown(
        "## Attendance backend is running ✅\n"
        "This Space hosts the REST API. Base path: `/api` "
        "(e.g. [`/api/health`](/api/health)).\n\n"
        "The web UI is deployed separately (Vercel) and points here."
    )

app = FastAPI(title="Attendance backend")
app = gr.mount_gradio_app(app, status_page, path="/ui")
# Everything else (the whole REST API) is served by the existing Flask app.
app.mount("/", WSGIMiddleware(flask_app))


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "7860"))
    print(f"[startup] serving on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
