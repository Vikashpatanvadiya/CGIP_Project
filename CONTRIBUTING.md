# Contributing (team workflow)

This repo is set up so all three of us can work in parallel without stepping on
each other. `main` stays deployable; everyone works on their own branch and
opens a Pull Request back into `main`.

## Branches

| Branch | Owner(s) | Scope |
|---|---|---|
| `feature/face-detection` | Maitra Prajapati | `backend/vision/pixel_ops.py`, `backend/vision/face_detection.py` |
| `feature/recognition` | Maitra Prajapati, Vikas Patanwadiya | `backend/vision/lbp.py`, `backend/vision/recognition.py`, `backend/vision/drawing.py`, `backend/services/attendance_service.py` |
| `feature/database-gui` | Krishna Patel (+ everyone for their own endpoints) | `backend/database/`, `backend/app.py`, `backend/services/enrollment_service.py`, `backend/services/report_service.py`, `frontend/` |
| `feature/testing-docs` | Krishna Patel, Vikas Patanwadiya | `backend/tests/`, `docs/` |

This mirrors the Work Breakdown Structure in `Project_Documentation.pdf` (§16).

## Workflow

1. `git checkout main && git pull`
2. `git checkout your-feature-branch` (created for you — see table above), or
   `git checkout -b feature/your-thing` for something new.
3. Commit under **your own name/GitHub account** — don't commit as someone else.
   Keep commits scoped to your module so history stays readable.
4. Push and open a PR into `main`. Tag at least one other teammate for review.
5. Before merging: `python3 -m pytest backend/tests` must pass, and `npm run build`
   (in `frontend/`) must succeed.

## Adding yourself as a collaborator

Whoever creates the GitHub repo (`git remote add origin <url>` + `git push -u
origin main`) should add the other two as collaborators (Settings → Collaborators
on GitHub), so each of you can push your own branch and open PRs from your own
account.

## Code ownership headers

Every module has a `Module Owner:` line in its docstring/comment header. If you
pick up work outside your usual module, that's fine — just update the header to
add your name so the doc stays accurate.
