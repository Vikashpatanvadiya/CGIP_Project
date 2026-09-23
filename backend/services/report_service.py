"""
Module Owner: Krishna Patel (24000131) — Database & GUI

Generates exportable attendance reports (CSV/Excel), per Functional
Requirement #9 and the "Report Generator" block in the system architecture
diagram.
"""

import csv
import io
from datetime import date

from openpyxl import Workbook

from backend.database import models


def export_csv(session_date: date | None = None) -> str:
    rows = models.attendance_for_date(session_date)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Enrollment No.", "Name", "Date", "Time In", "Status", "Confidence"])
    for row in rows:
        writer.writerow([
            row["enrollment_no"], row["name"], row["session_date"],
            row["time_in"], row["status"], round(row["confidence"] or 0, 3),
        ])
    return buffer.getvalue()


def export_xlsx(session_date: date | None = None) -> bytes:
    rows = models.attendance_for_date(session_date)
    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"
    ws.append(["Enrollment No.", "Name", "Date", "Time In", "Status", "Confidence"])
    for row in rows:
        ws.append([
            row["enrollment_no"], row["name"], row["session_date"],
            row["time_in"], row["status"], round(row["confidence"] or 0, 3),
        ])

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
