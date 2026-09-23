// Module Owner: Krishna Patel (24000131) — Database & GUI
// Thin wrapper around the Flask REST API (see backend/app.py).

const BASE_URL = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res
}

export async function getStudents() {
  const res = await request('/students')
  return res.json()
}

export async function registerStudent({ enrollmentNo, name, classSection, images }) {
  const res = await request('/students', {
    method: 'POST',
    body: JSON.stringify({
      enrollment_no: enrollmentNo,
      name,
      class_section: classSection,
      images,
    }),
  })
  return res.json()
}

export async function markAttendanceFromFrame(imageDataUrl) {
  const res = await request('/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl }),
  })
  return res.json()
}

export async function getAttendance(date) {
  const query = date ? `?date=${date}` : ''
  const res = await request(`/attendance${query}`)
  return res.json()
}

export function exportUrl(date, format) {
  const params = new URLSearchParams({ format })
  if (date) params.set('date', date)
  return `${BASE_URL}/attendance/export?${params.toString()}`
}
