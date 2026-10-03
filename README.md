# Attendly - Smart Attendance (frontend)

Plain HTML/CSS/JS. No build step. Open `index.html` in a browser (or run `python3 -m http.server` in this folder).

## Structure
- index.html         - entry point
- css/styles.css     - all styles (light/dark tokens at top)
- js/config.js       - CONFIG (USE_MOCK, BASE_URL) + app state
- js/api.real.js     - real backend calls (endpoint contract documented per method)
- js/api.mock.js     - fake data, same method signatures
- js/api.js          - picks mock or real based on CONFIG.USE_MOCK
- js/app.js          - UI: login, shell, all views

## Connecting the backend
1. In js/config.js set `USE_MOCK:false` and `BASE_URL` to your server (e.g. `http://localhost:5000/api`).
2. Make your endpoints return the shapes written in comments in js/api.real.js.
   If your backend differs, change only js/api.real.js (map the response there). UI stays untouched.

## Endpoints expected
POST /auth/login | GET /teacher/dashboard | GET /classes | GET /students
GET /classes/:id/attendance?date= | POST /classes/:id/attendance | GET /reports?class=&days= | GET /student/overview

## Demo login (mock mode)
Any email + any password = teacher. Digits only (e.g. 220101) = student.
