# User Manual

## Setup (once)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

## Running the system

1. Start the backend (terminal 1): `./run-backend.sh`
   (serves the API at `http://127.0.0.1:5050`).
2. Start the frontend (terminal 2): `./run-frontend.sh`
   (opens at `http://localhost:5173`).
3. Open `http://localhost:5173` in a browser on the machine with the webcam.

> Both processes must be running at the same time. If the frontend shows
> "Request failed: 502", the backend isn't running — start it with
> `./run-backend.sh`.

## Registering a student

1. Open the **Register Student** tab.
2. Allow camera access when prompted.
3. Click **Capture sample** 5 times, moving your head slightly between shots
   (straight, slight left/right/up/down) — more varied samples make matching
   more reliable.
4. Fill in Enrollment No., Name, and Class/Section, then **Register student**.

## Taking attendance

1. Open the **Live Attendance** tab and allow camera access.
2. Every ~1.5 seconds the app sends a frame to the backend, which detects and
   recognizes faces and marks attendance automatically for the first sighting
   of each student per day.
3. Green boxes = recognized student (name + confidence + a ✓ once logged);
   red boxes = unrecognized face.

## Reports

Open the **Reports** tab, pick a date, and use **Export CSV** / **Export
Excel** to download that day's attendance.

## Troubleshooting

- **Camera won't start**: the browser needs HTTPS or `localhost` to grant
  camera access — don't open the frontend over a plain `http://<lan-ip>` URL.
- **Backend requests fail on macOS**: make sure nothing else is bound to port
  5050; the backend intentionally avoids port 5000 (AirPlay Receiver).
- **"No face could be detected"** during registration: retake the sample with
  better lighting and the face facing the camera.
- **`pyexpat` / `libexpat` error when starting the backend** (Homebrew Python
  3.14.x on macOS): run `brew install expat` once, then start with
  `./run-backend.sh` (it points Python at Homebrew's expat). This only affects
  Excel export; CSV export works without it.
