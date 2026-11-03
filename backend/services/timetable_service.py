"""
Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Database & GUI

Parses a pasted university timetable into structured, weekly-recurring class
slots. Built around the Navrachana/eMLI portal format, e.g.:

    October 27, 2026                                   Tuesday
    1:00pm - 2:00pm  ●  CS236 Theory of Computation [SECTION 2] [A604 Lecture Hall, Block A ] [Sanjay Kumar Vij]
    2:00pm - 3:00pm  ●  CMP513 Computer Graphics and Image Processing [SECTION 1] [A303 Computer Laboratory, Block A ] [Yogesh Chaudhari]

Each slot line yields: course code, course name, section, start/end time, room,
faculty name, and the weekday it falls on (from the nearest preceding date or
day-name header). Slots are de-duplicated into weekly entries, so pasting a
whole week produces one recurring entry per distinct (code, section, day, time).

This is the "paste text → detect my subjects from the course code" feature: no
fixed template required, just paste from the portal.
"""

import re
from datetime import datetime

_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_DAY_INDEX = {d: i for i, d in enumerate(_DAYS)}

# "1:00pm - 2:00pm" or "10:00am - 12:00pm" (also tolerates en-dash and spacing)
_TIME_RANGE = re.compile(
    r"(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[ap]\.?m\.?)",
    re.IGNORECASE,
)
# A course code like CMP513, CS236, TEC101 (2-4 letters then 3+ digits)
_COURSE_CODE = re.compile(r"\b([A-Z]{2,4}\d{3,})\b")
# Bracketed groups: [SECTION 2], [A604 Lecture Hall, Block A ], [Sanjay Kumar Vij]
_BRACKET = re.compile(r"\[([^\]]*)\]")
_DATE_FORMATS = ["%B %d, %Y", "%B %d %Y", "%d %B %Y", "%d/%m/%Y", "%Y-%m-%d"]


def _parse_time(raw: str) -> str | None:
    cleaned = raw.strip().lower().replace(".", "").replace(" ", "")
    for fmt in ("%I:%M%p",):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%H:%M:%S")
        except ValueError:
            continue
    return None


def _day_from_line(line: str) -> int | None:
    """Return weekday index (0=Mon) if the line is a date or day-name header."""
    lowered = line.strip().lower()

    # Explicit day name anywhere in a short header line
    for day, idx in _DAY_INDEX.items():
        if re.search(rf"\b{day}\b", lowered):
            return idx

    # A full date we can convert to a weekday
    candidate = lowered.strip().rstrip(",")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(candidate.title(), fmt).weekday()
        except ValueError:
            continue
    return None


def _looks_like_class(text: str) -> bool:
    """True if a line carries class info (a course code or bracketed fields),
    so it is a description line rather than a date/day header."""
    return bool(_COURSE_CODE.search(text) or "[" in text)


def _build_slot(description: str, day: int | None, start_time: str, end_time: str | None) -> dict:
    """Extract course code/name/section/room/faculty from a description string."""
    rest = description.strip().lstrip("●•*-– ").strip()

    code_match = _COURSE_CODE.search(rest)
    course_code = code_match.group(1) if code_match else None

    section = room = faculty_name = None
    for b in (x.strip() for x in _BRACKET.findall(rest)):
        if re.match(r"(?i)section\b", b):
            section = re.sub(r"(?i)section", "", b).strip()
        elif room is None:
            room = b
        else:
            faculty_name = b

    name_region = rest[code_match.end():] if code_match else rest
    course_name = name_region.split("[", 1)[0].strip(" -–●•") or None

    return {
        "course_code": course_code,
        "course_name": course_name,
        "section": section,
        "day_of_week": day,
        "day_name": _DAYS[day].title() if day is not None else None,
        "start_time": start_time,
        "end_time": end_time,
        "room": room,
        "faculty_name": faculty_name,
    }


def parse_timetable_text(text: str) -> list[dict]:
    """Parse pasted timetable text into a de-duplicated list of weekly slots.

    Handles two layouts:
      1. Time and class on one line:
         "2:00pm - 3:00pm  CMP513 Computer Graphics [SECTION 1] [A303] [Prof]"
      2. Time and class on separate lines (portal "list" view):
         "2:00pm - 3:00pm"
         "CS236 Theory of Computation [SECTION 2] [A702] [Prof]"

    Each slot: {course_code, course_name, section, day_of_week, day_name,
                start_time, end_time, room, faculty_name}. Slots without a
    resolvable weekday keep day_of_week=None so the UI can assign a day.
    """
    current_day: int | None = None
    pending: tuple[str, str | None] | None = None  # (start, end) awaiting a description line
    slots: dict[tuple, dict] = {}

    def emit(slot: dict) -> None:
        key = (slot["course_code"] or slot["course_name"], slot["section"],
               slot["day_of_week"], slot["start_time"])
        slots[key] = slot

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        time_match = _TIME_RANGE.search(line)
        if time_match:
            start_time = _parse_time(time_match.group(1))
            end_time = _parse_time(time_match.group(2))
            if not start_time:
                continue
            rest = line[time_match.end():].strip().lstrip("●•*-– ").strip()
            if _looks_like_class(rest):
                emit(_build_slot(rest, current_day, start_time, end_time))  # layout 1
                pending = None
            else:
                pending = (start_time, end_time)  # layout 2: wait for the class line
            continue

        # Not a time line: either a date/day header or a class-description line.
        day = _day_from_line(line)
        if day is not None and not _looks_like_class(line):
            current_day = day
            continue

        if pending is not None:
            emit(_build_slot(line, current_day, pending[0], pending[1]))
            pending = None

    return sorted(
        slots.values(),
        key=lambda s: (s["day_of_week"] if s["day_of_week"] is not None else 99, s["start_time"]),
    )
