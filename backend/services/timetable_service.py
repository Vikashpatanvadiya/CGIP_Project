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


def parse_timetable_text(text: str) -> list[dict]:
    """Parse pasted timetable text into a de-duplicated list of weekly slots.

    Each slot: {course_code, course_name, section, day_of_week, day_name,
                start_time, end_time, room, faculty_name}
    Slots without a resolvable weekday are still returned with day_of_week=None
    so the UI can let the user assign a day.
    """
    current_day: int | None = None
    slots: dict[tuple, dict] = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        time_match = _TIME_RANGE.search(line)
        if not time_match:
            # Header line (date / day) — update the running weekday context.
            day = _day_from_line(line)
            if day is not None:
                current_day = day
            continue

        start_time = _parse_time(time_match.group(1))
        end_time = _parse_time(time_match.group(2))
        if not start_time:
            continue

        # Everything after the time range is the class description.
        rest = line[time_match.end():].strip().lstrip("●•*-– ").strip()

        code_match = _COURSE_CODE.search(rest)
        course_code = code_match.group(1) if code_match else None

        brackets = _BRACKET.findall(rest)
        section = None
        room = None
        faculty_name = None
        for b in brackets:
            b = b.strip()
            if re.match(r"(?i)section\b", b):
                section = re.sub(r"(?i)section", "", b).strip()
            elif room is None:
                room = b
            else:
                faculty_name = b

        # Course name = text between the code and the first bracket.
        name_region = rest
        if code_match:
            name_region = rest[code_match.end():]
        name_region = name_region.split("[", 1)[0].strip(" -–●•")
        course_name = name_region or None

        key = (course_code or course_name, section, current_day, start_time)
        slots[key] = {
            "course_code": course_code,
            "course_name": course_name,
            "section": section,
            "day_of_week": current_day,
            "day_name": _DAYS[current_day].title() if current_day is not None else None,
            "start_time": start_time,
            "end_time": end_time,
            "room": room,
            "faculty_name": faculty_name,
        }

    # Stable ordering: by day then start time (None days last).
    return sorted(
        slots.values(),
        key=lambda s: (s["day_of_week"] if s["day_of_week"] is not None else 99, s["start_time"]),
    )
