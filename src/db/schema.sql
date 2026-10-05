CREATE TABLE IF NOT EXISTS sections (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS subjects (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  roll_no       TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('teacher','student')),
  section_id    INTEGER REFERENCES sections(id)
);
CREATE TABLE IF NOT EXISTS classes (
  id         SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  time_label TEXT NOT NULL,
  days       TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri'
);
CREATE TABLE IF NOT EXISTS attendance (
  class_id   INTEGER NOT NULL REFERENCES classes(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  date       DATE    NOT NULL,
  status     CHAR(1) NOT NULL CHECK (status IN ('P','A')),
  PRIMARY KEY (class_id, student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_att_student ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_att_date    ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_users_section ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE TABLE IF NOT EXISTS announcements (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS activity (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC);
