# Facial Attendance Marking System — Explained Simply

**Course:** CMP513 + CMP514 (Computer Graphics and Image Processing)
**Team:** Krishna Patel (24000131) · Maitra Prajapati (24000493) · Vikas Patanwadiya (24000605)

This document explains, in plain language, what the project is, how it's built,
which libraries it uses, and — most importantly for our subject — which **image
processing methods and concepts** it uses.

---

## 1. What the project does

It is an **automatic attendance system that recognizes students by their face.**
Instead of calling roll or signing a sheet, a camera sees a student's face, the
computer figures out *who* it is, and marks them present in a database — with the
date and time. It works three ways:

1. **Student self check-in** — the teacher opens a timed window (say 5 minutes).
   Each enrolled student opens the camera on their own phone and marks
   themselves present. A **liveness check** stops someone holding up a photo.
2. **Live camera** — the teacher points a camera at the class and faces are
   recognized in real time.
3. **Group photo** — the teacher uploads one class photo and everyone in it is
   recognized and marked at once.

The teacher logs in and sees **today's classes** (built from an uploaded
timetable), takes attendance, and can review/correct it. Students log in and see
**today's classes and their attendance status.**

---

## 2. How the project is built (the big picture)

The system has three layers:

```
┌─────────────────────────────┐
│  FRONTEND (what you see)     │   React + Tailwind CSS, runs in the browser
│  login, dashboards, camera   │
└──────────────┬──────────────┘
               │  HTTP (JSON) requests
┌──────────────▼──────────────┐
│  BACKEND (the brain)         │   Python + Flask
│  recognition, rules, API     │
└──────────────┬──────────────┘
               │  SQL
┌──────────────▼──────────────┐
│  DATABASE (the memory)       │   Supabase (PostgreSQL) in the cloud,
│  students, faces, attendance │   or local SQLite when offline
└─────────────────────────────┘
```

- The **frontend** is the website: pages for login, the teacher dashboard, the
  student dashboard, and the camera screens. It never does the recognition
  itself — it just captures images and shows results.
- The **backend** is a Python program. It receives an image, runs the face
  recognition, applies the rules (is this student enrolled? is the window still
  open? is this a real face?), and reads/writes the database.
- The **database** permanently stores the students, their face "fingerprints"
  (embeddings), the timetable, and every attendance record. Because it's in the
  cloud (Supabase), all three team members share the same data and students only
  register **once**.

### How a face becomes "present" (the pipeline)

```
Camera frame
   → Preprocessing (clean up the image: grayscale, blur, fix lighting)
   → Face detection (find where the face is in the picture)
   → Feature extraction (turn the face into a list of numbers = "embedding")
   → Matching (compare those numbers to every enrolled student)
   → If it matches well enough → mark Present (name, date, time) in the database
   → Draw a box + name on the screen
```

---

## 3. Libraries used (and what each one is for)

### Backend (Python)
| Library | What it does in this project |
|---|---|
| **OpenCV** (`opencv-contrib-python`) | Reads/decodes images, resizes them, basic image operations, and the classical Haar-Cascade face detector. OpenCV *is* the core image-processing toolkit. |
| **NumPy** | Treats every image as a grid of numbers (a matrix) so we can do pixel math — the foundation of all the image processing below. |
| **InsightFace** | The modern deep-learning face engine. It gives us **SCRFD** (a strong face detector) and **ArcFace** (turns a face into a 512-number embedding). This is what makes recognition accurate. |
| **ONNX Runtime** | Runs the InsightFace neural-network models fast on the CPU. |
| **Flask** + **Flask-CORS** | The web server that exposes the API the frontend talks to. |
| **psycopg** + **psycopg-pool** | Talks to the Supabase PostgreSQL database. |
| **openpyxl** | Exports attendance to Excel files. |
| **Werkzeug / itsdangerous** | Password hashing and secure login tokens. |

### Frontend (JavaScript)
| Library | What it does |
|---|---|
| **React** | Builds the interactive pages. |
| **Vite** | Bundles and serves the frontend during development. |
| **Tailwind CSS** | Styles everything (the dark theme, cards, buttons). |
| **Browser `getUserMedia` API** | Opens the webcam/phone camera to capture frames. |

### Database
- **Supabase (PostgreSQL)** — cloud database, shared by the whole team.
- **SQLite** — automatic local fallback if no cloud credentials are set.

---

## 4. Image Processing methods & concepts used (the core of our subject)

An image is just a **matrix of pixels** — rows and columns of numbers, where each
number is how bright a pixel is. Everything below is math done on that matrix.
We implemented the classical techniques **from scratch** (so the pixel-level
concepts from class are visible), and also use a modern deep model for accuracy.

### A) Classical techniques — written by hand (`backend/vision/`)

1. **Grayscale conversion** (`pixel_ops.py`)
   A color image has 3 numbers per pixel (Blue, Green, Red). We combine them
   into **one** brightness value per pixel using a weighted sum:
   `gray = 0.114·B + 0.587·G + 0.299·R`.
   *Concept:* per-pixel intensity, luminosity weighting.

2. **Gaussian blur / smoothing** (`pixel_ops.py`)
   To remove noise, we slide a small **kernel (matrix)** over the image and
   replace each pixel with a weighted average of its neighbors. This is
   **convolution** — the same "combine a matrix with a neighborhood" idea as
   matrix multiplication (Tutorials 1 & 2 on matrices).
   *Concept:* convolution, kernels, noise reduction.

3. **Histogram equalization** (`pixel_ops.py`)
   If a photo is too dark or too bright, we fix the lighting by looking at the
   **histogram** (how many pixels have each brightness), computing its
   cumulative distribution (CDF), and re-mapping every pixel's brightness so the
   range is spread out evenly.
   *Concept:* image histogram, intensity transformation, contrast normalization.

4. **Local Binary Patterns — LBP** (`lbp.py`)
   A classical way to describe a face's **texture**. For every pixel we look at
   its 8 neighbors, write `1` if a neighbor is brighter than the center and `0`
   if not, and read those 8 bits as a number (0–255). Counting these numbers
   over the image gives a **histogram feature vector** that describes the face.
   *Concept:* local texture descriptors, per-pixel neighborhood comparison.

5. **Bresenham's line algorithm** (`drawing.py`)
   The classic Computer Graphics line-drawing algorithm (Lab 5 / Tutorial 4).
   We use it to draw the **bounding box** around each detected face using only
   integer pixel math — exactly the `putpixel`-style drawing from the graphics
   labs, applied to real camera images.
   *Concept:* rasterization, integer line drawing, `putpixel`.

### B) Detection & recognition

6. **Face detection**
   Finding *where* a face is in the frame.
   - Classical: **Haar Cascade Classifier** (OpenCV) — slides patterns across the
     image to find face-like regions.
   - Modern: **SCRFD** (InsightFace) — a neural network that is far better with
     angles and group photos.
   *Concept:* object detection, sliding-window / bounding boxes.

7. **Feature extraction → embeddings**
   Turning a face into a fixed list of numbers that uniquely describes it.
   - Classical: the **LBP histogram** above.
   - Modern: **ArcFace** — a deep network that outputs a **512-dimensional
     embedding** trained so that the *same* person's faces are close together
     and *different* people are far apart.
   *Concept:* feature vectors, face embeddings.

8. **Matching — who is this?**
   We compare the new face's embedding to every enrolled student's stored
   embedding and pick the closest one.
   - **Cosine similarity** measures how "aligned" two embedding vectors are
     (1 = identical direction, 0 = unrelated).
   - **k-Nearest Neighbours (k-NN)** takes the few closest matches and votes.
   - A **threshold** rejects weak matches as "Unknown" so a stranger isn't
     forced onto the nearest student.
   *Concept:* distance/similarity metrics, nearest-neighbour classification.

   > We switched the live matcher from LBP to ArcFace because LBP confused
   > different people (it only sees local texture). ArcFace's trained embeddings
   > separate identities cleanly. LBP is kept and documented as the **classical
   > baseline we compare against** — "classical vs. deep" is a stronger result
   > than either alone.

### C) Liveness / anti-spoofing (`liveness.py`)

9. **Head-turn liveness check**
   To stop someone marking attendance by holding up a **photo** of a face, the
   student is asked to slowly **turn their head**. Using the 5 facial keypoints
   (eyes, nose, mouth corners), we track how the **nose shifts relative to the
   eyes** across several frames. A real 3-D head makes this ratio change a lot;
   a flat photo or phone screen barely changes it, so the photo is rejected.
   *Concept:* facial landmarks/keypoints, geometric reasoning, challenge-response.

---

## 5. The attendance flow, step by step

**Teacher**
1. Log in → lands on **Today's Classes** (built from the uploaded timetable).
2. Paste the university timetable once → the app detects each course code, name,
   section, time, room, and day, and creates the weekly schedule.
3. For the current class, press **Start Attendance** and pick a method
   (self check-in window / live camera / group photo).
4. Watch students get recognized, then **Review** and **Finalize** (with the
   option to manually correct anyone).

**Student**
1. Log in → **Register Face** once (a few camera samples → stored embedding).
2. Join a class with the 6-character join code.
3. On **Today**, when the teacher opens a window, press **Give Attendance**,
   turn your head for the liveness check, and you're marked present.

---

## 6. Who built what (team split)

| Member | Main area |
|---|---|
| **Maitra Prajapati** | Face detection + the classical preprocessing (grayscale, Gaussian, histogram equalization) and LBP feature extraction |
| **Vikas Patanwadiya** | Recognition & matching (ArcFace, cosine + k-NN), liveness/anti-spoofing, attendance logic |
| **Krishna Patel** | Database, the web app (React GUI), subjects/timetable, reports, testing & documentation |

See `docs/image_processing_concepts.md` for a deeper classical-vs-deep comparison
and exact file references.
