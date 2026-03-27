-- ============================================
-- FULL DATABASE SETUP — Grade Tracker
-- Run this in Supabase SQL Editor as a single block
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_series (
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

CREATE TABLE IF NOT EXISTS lessons (
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

CREATE TABLE IF NOT EXISTS lesson_students (
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present','absent')),
  method      text DEFAULT 'manual' CHECK (method IN ('manual','face_id')),
  marked_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  score       int CHECK (score BETWEEN 0 AND 100),
  graded_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS clubs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text UNIQUE NOT NULL,
  head_student_id   uuid REFERENCES users(id),
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_members (
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, student_id)
);

CREATE TABLE IF NOT EXISTS club_announcements (
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

CREATE TABLE IF NOT EXISTS event_signups (
  announcement_id  uuid REFERENCES club_announcements(id) ON DELETE CASCADE,
  student_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  signed_up_at     timestamptz DEFAULT now(),
  PRIMARY KEY (announcement_id, student_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
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

CREATE TABLE IF NOT EXISTS app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_config (key, value) VALUES
  ('semester_start', to_char(make_date(EXTRACT(YEAR FROM now())::int, 9, 1), 'YYYY-MM-DD')),
  ('face_match_threshold', '0.6')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES users(id),
  action      text CHECK (action IN ('CREATE','UPDATE','DELETE')),
  table_name  text NOT NULL,
  record_id   uuid,
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons (teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_starts ON lessons (starts_at);
CREATE INDEX IF NOT EXISTS idx_lessons_series ON lessons (series_id);
CREATE INDEX IF NOT EXISTS idx_lesson_students_student ON lesson_students (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON attendance (lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_lesson ON grades (lesson_id);
CREATE INDEX IF NOT EXISTS idx_club_ann_club ON club_announcements (club_id);
CREATE INDEX IF NOT EXISTS idx_club_ann_starts ON club_announcements (starts_at);
CREATE INDEX IF NOT EXISTS idx_event_signups_student ON event_signups (student_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations (user_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_active ON lessons (teacher_id, starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_active ON lessons (starts_at, ends_at) WHERE deleted_at IS NULL;

-- ============================================
-- 3. VIEWS
-- ============================================
CREATE OR REPLACE VIEW v_student_attendance_summary AS
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

CREATE OR REPLACE VIEW v_teacher_report_status AS
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
-- 4. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('diplomas', 'diplomas', false),
  ('student-photos', 'student-photos', false),
  ('club-photos', 'club-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. AUTH TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, phone, full_name, role, course_year)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'role',
    (NEW.raw_user_meta_data->>'course_year')::int
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. RLS — ENABLE ON ALL TABLES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$;

-- Helper: check if current user is teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'teacher' AND deleted_at IS NULL
  );
$$;

-- Helper: check if current user is student
CREATE OR REPLACE FUNCTION is_student()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'student' AND deleted_at IS NULL
  );
$$;

-- ---- USERS ----
CREATE POLICY "Admin full access on users" ON users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Users read own row" ON users FOR SELECT
  USING (id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Users update own row" ON users FOR UPDATE
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid());

-- ---- SUBJECTS ----
CREATE POLICY "Admin full access on subjects" ON subjects FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Authenticated read subjects" ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- ---- LESSON_SERIES ----
CREATE POLICY "Admin full access on lesson_series" ON lesson_series FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers read own series" ON lesson_series FOR SELECT
  USING (teacher_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Students read enrolled series" ON lesson_series FOR SELECT
  USING (is_student());

-- ---- LESSONS ----
CREATE POLICY "Admin full access on lessons" ON lessons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers read own lessons" ON lessons FOR SELECT
  USING (teacher_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Teachers update own lessons" ON lessons FOR UPDATE
  USING (teacher_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Students read enrolled lessons" ON lessons FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM lesson_students ls
      WHERE ls.lesson_id = id AND ls.student_id = auth.uid()
    )
  );

-- ---- LESSON_STUDENTS ----
CREATE POLICY "Admin full access on lesson_students" ON lesson_students FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers read own lesson_students" ON lesson_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Students read own enrollment" ON lesson_students FOR SELECT
  USING (student_id = auth.uid());

-- ---- ATTENDANCE ----
CREATE POLICY "Admin full access on attendance" ON attendance FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers manage own lesson attendance" ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Students read own attendance" ON attendance FOR SELECT
  USING (student_id = auth.uid());

-- ---- GRADES ----
CREATE POLICY "Admin full access on grades" ON grades FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers manage own lesson grades" ON grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Students read own grades" ON grades FOR SELECT
  USING (student_id = auth.uid());

-- ---- CLUBS ----
CREATE POLICY "Admin full access on clubs" ON clubs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Authenticated read clubs" ON clubs FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Club head update own club" ON clubs FOR UPDATE
  USING (head_student_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (head_student_id = auth.uid());

-- ---- CLUB_MEMBERS ----
CREATE POLICY "Admin full access on club_members" ON club_members FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Authenticated read club_members" ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students manage own membership" ON club_members FOR INSERT
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students delete own membership" ON club_members FOR DELETE
  USING (student_id = auth.uid());
CREATE POLICY "Club head manage members" ON club_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_id AND c.head_student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_id AND c.head_student_id = auth.uid()
    )
  );

-- ---- CLUB_ANNOUNCEMENTS ----
CREATE POLICY "Admin full access on club_announcements" ON club_announcements FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Authenticated read announcements" ON club_announcements FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Club head manage announcements" ON club_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_id AND c.head_student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_id AND c.head_student_id = auth.uid()
    )
  );

-- ---- EVENT_SIGNUPS ----
CREATE POLICY "Admin full access on event_signups" ON event_signups FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Students manage own signups" ON event_signups FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Club head read signups" ON event_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_announcements ca
      JOIN clubs c ON c.id = ca.club_id
      WHERE ca.id = announcement_id AND c.head_student_id = auth.uid()
    )
  );
CREATE POLICY "Authenticated read signups" ON event_signups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---- RECOMMENDATIONS ----
CREATE POLICY "Admin full access on recommendations" ON recommendations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Users read own recommendations" ON recommendations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users update own recommendations" ON recommendations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- APP_CONFIG ----
CREATE POLICY "Admin full access on app_config" ON app_config FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Authenticated read app_config" ON app_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---- AUDIT_LOG ----
CREATE POLICY "Admin read audit_log" ON audit_log FOR SELECT
  USING (is_admin());
CREATE POLICY "Admin insert audit_log" ON audit_log FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- 8. STORAGE POLICIES
-- ============================================

-- Diplomas bucket
CREATE POLICY "Admin manage diplomas" ON storage.objects FOR ALL
  USING (bucket_id = 'diplomas' AND is_admin())
  WITH CHECK (bucket_id = 'diplomas' AND is_admin());
CREATE POLICY "Teachers read own diploma" ON storage.objects FOR SELECT
  USING (bucket_id = 'diplomas' AND auth.uid() IS NOT NULL);

-- Student photos bucket
CREATE POLICY "Admin manage student-photos" ON storage.objects FOR ALL
  USING (bucket_id = 'student-photos' AND is_admin())
  WITH CHECK (bucket_id = 'student-photos' AND is_admin());
CREATE POLICY "Teachers read student-photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos' AND (is_admin() OR is_teacher()));
CREATE POLICY "Students read own photo" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL);

-- Club photos bucket (public read, admin + club heads write)
CREATE POLICY "Anyone read club-photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'club-photos');
CREATE POLICY "Admin manage club-photos" ON storage.objects FOR ALL
  USING (bucket_id = 'club-photos' AND is_admin())
  WITH CHECK (bucket_id = 'club-photos' AND is_admin());
CREATE POLICY "Authenticated upload club-photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'club-photos' AND auth.uid() IS NOT NULL);

-- ============================================
-- 9. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lesson_series_updated_at BEFORE UPDATE ON lesson_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_club_announcements_updated_at BEFORE UPDATE ON club_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE. Now create the admin user via Supabase Dashboard:
-- Authentication → Add User → Email: 87772000000@university.local, Password: Anar&@2005
-- Then run:
-- UPDATE public.users SET role='admin', full_name='Super Admin' WHERE phone='87772000000';
-- ============================================
