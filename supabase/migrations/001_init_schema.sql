-- ============================================
-- Phase 1: Full database schema
-- ============================================

-- USERS
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           text UNIQUE NOT NULL,
  full_name       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin','teacher','student')),
  face_photo_url  text,
  diploma_url     text,
  course_year     int,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT chk_student_fields CHECK (
    role = 'student' OR (face_photo_url IS NULL AND course_year IS NULL)
  ),
  CONSTRAINT chk_teacher_fields CHECK (
    role = 'teacher' OR diploma_url IS NULL
  ),
  CONSTRAINT chk_course_year CHECK (
    course_year IS NULL OR course_year BETWEEN 1 AND 6
  )
);

-- SUBJECTS
CREATE TABLE subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- LESSON SERIES
CREATE TABLE lesson_series (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       uuid REFERENCES subjects(id),
  teacher_id       uuid REFERENCES users(id),
  recurrence_rule  jsonb NOT NULL,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  deleted_at       timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- LESSONS
CREATE TABLE lessons (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id            uuid REFERENCES lesson_series(id),
  subject_id           uuid REFERENCES subjects(id) NOT NULL,
  teacher_id           uuid REFERENCES users(id),
  starts_at            timestamptz NOT NULL,
  ends_at              timestamptz NOT NULL,
  report_submitted_at  timestamptz,
  deleted_at           timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- LESSON_STUDENTS
CREATE TABLE lesson_students (
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, student_id)
);

-- ATTENDANCE
CREATE TABLE attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present','absent')),
  method      text DEFAULT 'manual' CHECK (method IN ('manual','face_id')),
  marked_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

-- GRADES
CREATE TABLE grades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  score       int CHECK (score BETWEEN 0 AND 100),
  graded_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

-- CLUBS
CREATE TABLE clubs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text UNIQUE NOT NULL,
  head_student_id   uuid REFERENCES users(id),
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- CLUB_MEMBERS
CREATE TABLE club_members (
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, student_id)
);

-- CLUB_ANNOUNCEMENTS
CREATE TABLE club_announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  photo_url   text,
  venue       text,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  deleted_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- EVENT_SIGNUPS
CREATE TABLE event_signups (
  announcement_id  uuid REFERENCES club_announcements(id) ON DELETE CASCADE,
  student_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  signed_up_at     timestamptz DEFAULT now(),
  PRIMARY KEY (announcement_id, student_id)
);

-- RECOMMENDATIONS
CREATE TABLE recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  rule_id         text NOT NULL,
  category        text CHECK (category IN ('academic','social','admin')),
  next_action     text NOT NULL,
  priority_score  float NOT NULL,
  resolved_at     timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, rule_id)
);

-- APP_CONFIG
CREATE TABLE app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_config (key, value) VALUES
  ('semester_start', to_char(make_date(EXTRACT(YEAR FROM now())::int, 9, 1), 'YYYY-MM-DD')),
  ('face_match_threshold', '0.6');

-- AUDIT_LOG
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES users(id),
  action      text CHECK (action IN ('CREATE','UPDATE','DELETE')),
  table_name  text NOT NULL,
  record_id   uuid,
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX ON lessons (teacher_id);
CREATE INDEX ON lessons (starts_at);
CREATE INDEX ON lessons (series_id);
CREATE INDEX ON lesson_students (student_id);
CREATE INDEX ON attendance (lesson_id);
CREATE INDEX ON attendance (student_id);
CREATE INDEX ON grades (student_id);
CREATE INDEX ON grades (lesson_id);
CREATE INDEX ON club_announcements (club_id);
CREATE INDEX ON club_announcements (starts_at);
CREATE INDEX ON event_signups (student_id);
CREATE INDEX ON recommendations (user_id, priority_score DESC);
CREATE INDEX ON lessons (teacher_id, starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX ON lessons (starts_at, ends_at) WHERE deleted_at IS NULL;

-- ============================================
-- ANALYTICS VIEWS
-- ============================================
CREATE VIEW v_student_attendance_summary AS
SELECT
  ls.student_id,
  l.subject_id,
  COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
  COUNT(*)                                       AS total_count,
  ROUND(
    COUNT(*) FILTER (WHERE a.status = 'present')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS attendance_pct
FROM lesson_students ls
JOIN lessons l ON l.id = ls.lesson_id AND l.deleted_at IS NULL
LEFT JOIN attendance a ON a.lesson_id = l.id AND a.student_id = ls.student_id
GROUP BY ls.student_id, l.subject_id;

CREATE VIEW v_teacher_report_status AS
SELECT
  teacher_id,
  COUNT(*) FILTER (
    WHERE report_submitted_at IS NULL AND ends_at < now()
  ) AS unsubmitted_count,
  MIN(ends_at) FILTER (
    WHERE report_submitted_at IS NULL AND ends_at < now()
  ) AS oldest_pending
FROM lessons
WHERE deleted_at IS NULL
GROUP BY teacher_id;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('diplomas', 'diplomas', false),
  ('student-photos', 'student-photos', false),
  ('club-photos', 'club-photos', true);
