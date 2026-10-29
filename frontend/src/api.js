// Module Owner: Krishna Patel (24000131) — Database & GUI
// Thin wrapper around the Flask REST API (see backend/app.py).

const BASE_URL = '/api'
const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res
}

// ==========================================
// Auth API
// ==========================================

export async function registerUser({ email, password, name, role }) {
  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  })
  return res.json()
}

export async function loginUser(email, password) {
  const payload = typeof email === 'object' ? email : { email, password }
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function getMe() {
  const res = await request('/auth/me')
  return res.json()
}

// ==========================================
// Subjects (Faculty) API
// ==========================================

export async function createSubject({ name, code, section, capacity, allow_self_registration }) {
  const res = await request('/subjects', {
    method: 'POST',
    body: JSON.stringify({
      name,
      code,
      section,
      capacity: Number(capacity) || 60,
      allow_self_registration: Boolean(allow_self_registration),
    }),
  })
  return res.json()
}

export async function getSubjects() {
  const res = await request('/subjects')
  return res.json()
}

export async function getSubject(id) {
  const res = await request(`/subjects/${id}`)
  return res.json()
}

export async function updateSubject(id, data) {
  const res = await request(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getSubjectRoster(id) {
  const res = await request(`/subjects/${id}/roster`)
  return res.json()
}

// ==========================================
// Enrollments API
// ==========================================

export async function joinClass(joinCodeOrObj) {
  const body = typeof joinCodeOrObj === 'string' ? { join_code: joinCodeOrObj } : joinCodeOrObj
  const res = await request('/enrollments/join', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function getMyEnrollments() {
  const res = await request('/enrollments/my')
  return res.json()
}

export async function getPendingEnrollments(subjectId) {
  const res = await request(`/subjects/${subjectId}/enrollments?status=pending`)
  return res.json()
}

export async function approveEnrollment(id) {
  const res = await request(`/enrollments/${id}/approve`, {
    method: 'POST',
  })
  return res.json()
}

export async function rejectEnrollment(id) {
  const res = await request(`/enrollments/${id}/reject`, {
    method: 'POST',
  })
  return res.json()
}

// ==========================================
// Sessions (Faculty) API
// ==========================================

export async function createSession(subjectId, { method }) {
  const res = await request(`/subjects/${subjectId}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  })
  return res.json()
}

export async function getSubjectSessions(subjectId) {
  const res = await request(`/subjects/${subjectId}/sessions`)
  return res.json()
}

export async function getSession(id) {
  const res = await request(`/sessions/${id}`)
  return res.json()
}

export async function markSessionFrame(sessionId, imageDataUrl) {
  const res = await request(`/sessions/${sessionId}/mark-frame`, {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl }),
  })
  return res.json()
}

export async function markSessionGroupPhoto(sessionId, imageDataUrl) {
  const res = await request(`/sessions/${sessionId}/mark-group-photo`, {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl }),
  })
  return res.json()
}

export async function finalizeSession(sessionId, corrections = []) {
  const res = await request(`/sessions/${sessionId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ corrections }),
  })
  return res.json()
}

export async function getSessionAttendance(sessionId) {
  const res = await request(`/sessions/${sessionId}/attendance`)
  return res.json()
}

// ==========================================
// Student API
// ==========================================

export async function getStudentSubjects() {
  const res = await request('/student/subjects')
  return res.json()
}

export async function getStudentAttendance(subjectId) {
  const query = subjectId ? `?subject_id=${subjectId}` : ''
  const res = await request(`/student/attendance${query}`)
  return res.json()
}

export async function registerStudentFace({ enrollment_no, name, images }) {
  const res = await request('/student/register-face', {
    method: 'POST',
    body: JSON.stringify({ enrollment_no, name, images }),
  })
  return res.json()
}

// ==========================================
// Timetable API
// ==========================================

export async function parseTimetable(text) {
  const res = await request('/timetable/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  return res.json()
}

export async function importTimetable(classes) {
  const res = await request('/timetable/import', {
    method: 'POST',
    body: JSON.stringify({ classes }),
  })
  return res.json()
}

export async function getTimetable() {
  const res = await request('/timetable')
  return res.json()
}

export async function deleteScheduledClass(id) {
  const res = await request(`/timetable/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function getFacultyToday() {
  const res = await request('/faculty/today')
  return res.json()
}

export async function getStudentToday() {
  const res = await request('/student/today')
  return res.json()
}

// ==========================================
// Notifications API
// ==========================================

export async function getNotifications() {
  const res = await request('/notifications')
  return res.json()
}

export async function markNotificationRead(id) {
  const res = await request(`/notifications/${id}/read`, {
    method: 'POST',
  })
  return res.json()
}

export async function markAllNotificationsRead() {
  const res = await request('/notifications/read-all', {
    method: 'POST',
  })
  return res.json()
}

// ==========================================
// Legacy API (kept working, no auth needed)
// ==========================================

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

export async function markAttendanceFromGroupPhoto(imageDataUrl) {
  const res = await request('/attendance/group-photo', {
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
