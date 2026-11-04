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
