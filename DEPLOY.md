# Deploying the Attendance app (free, no credit card)

Architecture:

```
Frontend (React build)  →  Vercel          [free, static, fast]
        │  calls VITE_API_URL
        ▼
Backend (Flask + face model)  →  Hugging Face Gradio Space  [free, 16 GB RAM]
        │
        ▼
Database  →  Supabase (Session Pooler)     [already configured]
```

> We use HF's **Gradio** SDK (free) because Docker Spaces require a paid plan.
> The Flask API runs unchanged inside the Gradio Space via `app.py`.

---

## Part A — Backend on Hugging Face (free Gradio Space, 16 GB)

### 1. Create the Space
1. Sign in at https://huggingface.co → **New → Space**.
2. Name it `attendance`, **SDK = Gradio** (Blank template), **Public**, Create.

### 2. Push this repo to the Space
The Space is its own git repo. From this project folder:

```bash
# Put the Hugging Face metadata at the top of README.md (required once).
cat README_HF_SPACE.md README.md > README.tmp && mv README.tmp README.md
git add README.md app.py packages.txt requirements.txt backend/
git commit -m "Add Hugging Face Gradio backend"
git remote add space https://huggingface.co/spaces/<YOUR-HF-USERNAME>/attendance
git push space HEAD:main
```

When git asks for a password, paste a **Hugging Face access token** (create one at
https://huggingface.co/settings/tokens with **write** access — your login password
won't work).

### 3. Set secrets on the Space
Space → **Settings → Variables and secrets → New secret**:

| Name | Value |
|---|---|
| `Database_connection` | your Supabase **Session Pooler** URL (the one in your local `.env`) |
| `SECRET_KEY` | any long random string (keeps login tokens valid across restarts) |
| `DET_SIZE` | `320` (optional — faster recognition) |

### 4. Wait for the build
First build takes ~10–15 min (apt packages, pip install, insightface). On the
**first request** it also downloads the 281 MB face model once. When the Space
shows **Running**, your backend is live at:

```
https://<YOUR-HF-USERNAME>-attendance.hf.space
```

- Status page: `https://<YOUR-HF-USERNAME>-attendance.hf.space/ui`
- Test the API:

```bash
curl https://<YOUR-HF-USERNAME>-attendance.hf.space/api/health
```

Expect `{"status":"ok"}`.

---

## Part B — Frontend on Vercel (free)

1. Make sure this repo is pushed to GitHub.
2. https://vercel.com → **Add New → Project** → import the repo.
3. Set **Root Directory = `frontend`** (important). Vercel auto-detects Vite.
4. Add an **Environment Variable**:
   - `VITE_API_URL` = `https://<YOUR-HF-USERNAME>-attendance.hf.space/api`
     (note the trailing **/api**)
5. **Deploy.** You get a link like `https://attendance-xxxx.vercel.app`.

**That Vercel link is what you share with your sir and the students.**

---

## Part C — Test end to end
1. Open the Vercel URL.
2. Register/login as faculty, create a subject, start a session.
3. Register a student face, mark attendance.
   - Data is read/written to Supabase, so you and your teammates see the same records.

---

## Notes for the 100-student demo
- **Keep it awake:** a free Space sleeps after ~48 h idle and takes ~1 min to wake
  (and re-downloads the model on a cold rebuild). Open the backend `/ui` a few
  minutes **before** the demo so it's warm.
- **Speed:** set `DET_SIZE=320` (above) for faster recognition; requests are short
  bursts, so the free 2-vCPU / 16 GB tier handles a class fine.
- **Security:** `.env` is git-ignored, so your DB password is never pushed — it
  lives only as the HF **Secret**. Rotate the Supabase password after the demo if
  the repo is public.
- **Supabase:** if the project auto-pauses (free tier, ~1 week idle), open the
  Supabase dashboard and **Resume**; the pooler URL stays the same.

---

## Alternative: Docker (only if you later add a payment method to HF)
A root `Dockerfile` + `gunicorn.conf.py` are also included. If you ever enable the
paid Docker SDK, create a **Docker** Space instead and it builds from the
Dockerfile (which bakes the model into the image for faster cold starts). The
Gradio path above needs no card and is the recommended one.
