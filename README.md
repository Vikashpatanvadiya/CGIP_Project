---
title: Attendance Backend
emoji: 🧑‍🏫
colorFrom: indigo
colorTo: blue
sdk: gradio
sdk_version: 5.9.1
app_file: app.py
python_version: "3.11"
pinned: false
---

# Attendance — face-recognition backend

Flask + InsightFace (ArcFace/SCRFD) REST API, served inside a free Gradio Space
via `app.py`. Set `Database_connection` (and ideally `SECRET_KEY`) as **Secrets**
in the Space settings.

- Human status page: `/ui`
- REST API base: `/api` (e.g. `/api/health`)

> When pushing to a Hugging Face Space, this front-matter (the block between the
> `---` lines) must be at the top of the Space's `README.md`.
# Facial Attendance Marking System

**CMP513 + CMP514 — Computer Graphics and Image Processing**

An automated, contactless attendance system that detects and recognizes student
faces from a live camera feed and logs attendance into a database in real time.
Full brief: [`Project_Documentation.pdf`](./Project_Documentation.pdf).

## Team

| Sr. No. | Enrollment No. | Name | Primary Module |
|---|---|---|---|
| 1 | 24000131 | Krishna Patel | Database & GUI, Literature Survey, Testing & Documentation |
| 2 | 24000493 | Maitra Prajapati | Face Detection Module, Feature Extraction & Recognition |
| 3 | 24000605 | Vikas Patanwadiya | Feature Extraction & Recognition, Attendance Logic, Testing & Documentation |

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the branch each person works on and
how to pick up your part.

## Architecture

The system, data-flow/processing pipeline, database ER diagram, and the team's
git branching model were drawn in the connected draw.io workspace. In short:

```
Camera Feed → Preprocessing (grayscale, Gaussian blur, histogram equalization)
            → Face Detection (Haar Cascade)
            → Feature Extraction (Local Binary Pattern histogram)
            → Identification/Matching (Euclidean distance + k-NN)
            → Database Update (duplicate-safe attendance log)
            → Output Attendance Report (CSV / Excel)
```

- **Frontend**: React + Tailwind CSS (`frontend/`) — live recognition, **group-photo
  attendance**, student registration, attendance reports.
- **Backend**: Python + Flask REST API (`backend/`) — face detection, feature
  extraction, matching, and attendance logic.
- **Recognition**: **ArcFace** deep embeddings + SCRFD detector (InsightFace) for
  accurate, multi-face recognition; the from-scratch **LBP** classical pipeline is
  kept as the documented baseline (see `docs/image_processing_concepts.md`).
- **Database**: **Supabase (Postgres)** when a `.env` is configured — a shared cloud
  DB so students register once and all teammates see the same data; automatically
  falls back to local **SQLite** otherwise. See `.env.example`.

## Project layout

```
backend/
  app.py                        Flask API (Database & GUI)
  database/
    db.py, models.py            Schema + data access (Database & GUI)
  vision/
    pixel_ops.py                Hand-written grayscale / Gaussian blur / histogram
                                 equalization (Face Detection Module)
    face_detection.py           Haar Cascade face detection (Face Detection Module)
    lbp.py                      Local Binary Pattern feature extraction
                                 (Feature Extraction & Recognition Module)
    recognition.py              Distance-based k-NN matching
                                 (Feature Extraction & Recognition Module)
    drawing.py                  Bresenham's-algorithm bounding-box drawing
                                 (ties the CG labs into the IP project)
  services/
    enrollment_service.py       Student registration
    attendance_service.py       Per-frame detect → match → log pipeline
    report_service.py           CSV / Excel export
  tests/                        pytest unit tests (Testing & Documentation)
frontend/
  src/components/               LiveAttendance, RegisterStudent, Reports
  src/hooks/useCamera.js        Webcam capture
docs/
  literature_survey.md
  image_processing_concepts.md  Maps course topics → where they're used in code
  user_manual.md
Topics/                         Class LAB/Tutorial materials referenced above
```

## Running it locally

**Backend**
```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# IMPORTANT one-time cv2 fix: insightface pulls opencv-python, which collides
# with opencv-contrib-python. Run these once after install:
pip uninstall -y opencv-python
pip install --force-reinstall --no-deps opencv-contrib-python==4.14.0.94
./run-backend.sh                # http://127.0.0.1:5050  (macOS/Linux)
```
On Windows (no helper script): `python -m backend.app`.

> **First run downloads the face model** (~330MB `buffalo_l` from InsightFace)
> to `~/.insightface/` — needs internet once, then it's cached.
>
> **Cloud database (optional):** copy `.env.example` to `.env` and fill in your
> Supabase URL + connection string to share one database across all three
> laptops. Without `.env` it uses a local SQLite file.

> **macOS notes:**
> - The server runs on port **5050**, not 5000 — macOS's AirPlay Receiver
>   squats on port 5000 and will silently 403 your requests.
> - `run-backend.sh` points Python at Homebrew's `expat` so Excel export works
>   on Homebrew Python 3.14.x (the system libexpat is missing a symbol
>   `openpyxl` needs). If you ever see a `pyexpat` / `libexpat` import error,
>   run `brew install expat` once. CSV export works regardless.

**Frontend** (separate terminal)
```bash
cd frontend
npm install
./../run-frontend.sh            # or: npm run dev  → http://localhost:5173
```

**Tests**
```bash
source .venv/bin/activate
python3 -m pytest backend/tests -v
```

## Notes

- The webcam is accessed from the **browser** (`getUserMedia`), not the Python
  backend, so it works from whichever laptop opens the frontend — no server-side
  camera wiring needed.
- Recognition uses Local Binary Pattern histograms + k-NN distance matching
  (see `docs/image_processing_concepts.md`), which is dependency-light (pure
  OpenCV + NumPy) and doesn't require compiling `dlib`/`face_recognition`.
