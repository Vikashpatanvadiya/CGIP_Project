"""
Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module

Student self check-in: during an open session window, an enrolled student proves
they are physically present by (1) passing the head-turn liveness challenge and
(2) matching their OWN registered face. Only then is attendance marked.

This is the flow the faculty opens for a fixed amount of time; students mark
themselves on their own camera (no photo upload for students), and a static
phone photo is rejected by the liveness check.
"""

from backend.database import store as models
from backend.services.liveness import check_head_turn
from backend.vision.recognition import ARCFACE_MATCH_THRESHOLD, match_embedding


class SelfMarkError(Exception):
    def __init__(self, message: str, code: str = "error"):
        super().__init__(message)
        self.code = code


def self_mark(student: dict, session: dict, frames: list) -> dict:
    """Run liveness + identity checks and mark the student present.

    Raises SelfMarkError (with a .code) on any failed gate so the API can return
    a helpful message.
    """
    if not frames:
        raise SelfMarkError("No camera frames were received.", "no_frames")

    # 1. Liveness — reject a flat photo / phone screen.
    live = check_head_turn(frames)
    if not live.is_live:
        raise SelfMarkError(live.reason, "liveness")

    # 2. Identity — must match THIS student's registered face, not anyone's.
    own = models.embeddings_for_students([student["id"]])
    if not own:
        raise SelfMarkError("Register your Face ID first, then try again.", "no_face")

    best_conf = 0.0
    for emb in live.embeddings:
        result = match_embedding(emb, own, k=1)
        best_conf = max(best_conf, result.confidence)

    if best_conf < ARCFACE_MATCH_THRESHOLD:
        raise SelfMarkError("Face did not match your registered Face ID.", "mismatch")

    # 3. Mark present for this session (duplicate-safe).
    newly_marked = models.mark_attendance(student["id"], best_conf, session_id=session["id"])
    return {"present": True, "confidence": round(best_conf, 3), "newly_marked": newly_marked}
