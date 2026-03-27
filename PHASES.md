# AI Agent Build Instructions — 10 Phases

> **Source:** PRD v2.0 — Academic Performance & Club Management Portal
> **UI Kit:** Ant Design 5 (antd) — **STRICTLY**. No shadcn/ui, no Radix.
> **Last updated:** 2026-03-24

---

## Agent Conventions (apply to ALL phases)

- TypeScript throughout. No `any` types.
- Next.js 14 App Router. Server Components by default. `"use client"` only when needed.
- `@supabase/ssr` — `createServerClient` / `createBrowserClient`. Never the legacy client.
- **Ant Design 5 (`antd`)** for ALL UI components: Button, Input, Select, Table, Modal, Drawer, Card, Tabs, Badge, Avatar, Form, DatePicker, TimePicker, Upload, Menu, Layout, Skeleton, message, notification, etc.
- **Ant Design Form** with `rules` prop for client-side validation. `zod` for Server Action input validation only.
- **NO** `react-hook-form`, `@hookform/resolvers`, `shadcn/ui`, `@radix-ui/*`, `@tanstack/react-table`. These are replaced by antd built-in equivalents.
- `react-big-calendar` + `date-fns` for schedule/calendar views (antd Calendar is date-picker only, not suitable for time-slot event scheduling).
- `recharts` for charts (grade trends, analytics, social activity).
- Server Actions for all mutations. No separate `/api` routes unless required by Edge Functions.
- RLS policy created for every new table before writing application code.
- Each phase ends in a buildable, deployable state (`npm run build` passes).
- `SUPABASE_SERVICE_ROLE_KEY` never in client code.
- All text in Russian (primary). i18n setup in Phase 10.

---

## Route Group → URL Mapping

```
Route group file path                         → URL
───────────────────────────────────────────────────────
app/(auth)/login/page.tsx                    → /login
app/(admin)/admin/page.tsx                   → /admin              ← Dashboard
app/(admin)/admin/teachers/page.tsx          → /admin/teachers
app/(admin)/admin/students/page.tsx          → /admin/students
app/(admin)/admin/subjects/page.tsx          → /admin/subjects
app/(admin)/admin/schedule/page.tsx          → /admin/schedule
app/(admin)/admin/clubs/page.tsx             → /admin/clubs
app/(admin)/admin/analytics/page.tsx         → /admin/analytics
app/(admin)/admin/risk-dashboard/page.tsx    → /admin/risk-dashboard
app/(teacher)/teacher/lessons/page.tsx       → /teacher/lessons
app/(teacher)/teacher/lessons/[id]/page.tsx  → /teacher/lessons/[id]
app/(teacher)/teacher/students/page.tsx      → /teacher/students
app/(teacher)/teacher/profile/page.tsx       → /teacher/profile
app/(student)/student/schedule/page.tsx      → /student/schedule
app/(student)/student/my-clubs/page.tsx      → /student/my-clubs
app/(student)/student/my-club/page.tsx       → /student/my-club        ← Club head only
app/(student)/student/announcements/page.tsx → /student/announcements
app/(student)/student/profile/page.tsx       → /student/profile
```

> **Rule:** Route groups `(auth)`, `(admin)`, `(teacher)`, `(student)` are NOT part of the URL. The next segment after the group IS. Always nest the role segment explicitly: `app/(admin)/admin/...`, not `app/(admin)/...`.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only — NEVER in client code
NEXT_PUBLIC_APP_URL=
```

---

## Phase 1 — Project Scaffold & Database Foundation

**Goal:** Running Next.js app connected to Supabase, Ant Design configured, ALL database tables + indexes + views created.

### 1.1 Project Init

```bash
npx create-next-app@latest university-portal \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd university-portal

npm install antd @ant-design/icons @ant-design/cssinjs \
  @supabase/ssr @supabase/supabase-js \
  @tanstack/react-query \
  zod date-fns react-big-calendar next-intl recharts \
  face-api.js browser-image-compression
```

> **No** `shadcn`, `@radix-ui`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table` — antd covers all of these.

### 1.2 Ant Design Configuration

1. Create `/src/lib/antd/AntdProvider.tsx` — client component wrapping `App` with `ConfigProvider`:
   ```tsx
   "use client";
   import { ConfigProvider, App } from 'antd';
   import ruRU from 'antd/locale/ru_RU';

   export default function AntdProvider({ children }: { children: React.ReactNode }) {
     return (
       <ConfigProvider locale={ruRU} theme={{ token: { colorPrimary: '#1677ff' } }}>
         <App>{children}</App>
       </ConfigProvider>
     );
   }
   ```
2. Wrap root `layout.tsx` with `AntdProvider`.
3. Add `@ant-design/cssinjs` SSR extraction in root layout to avoid FOUC:
   ```tsx
   import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
   ```

### 1.3 Supabase Client Setup

1. `/src/lib/supabase/server.ts` — `createServerClient` using `@supabase/ssr` cookies.
2. `/src/lib/supabase/client.ts` — `createBrowserClient`.
3. `/src/lib/supabase/middleware.ts` — session refresh helper.
4. `/src/lib/utils.ts`:
   - `phoneToAuthEmail(phone: string)` → `${phone}@university.local`
   - Type helpers, date formatters.

### 1.4 Database — ALL Tables

Execute the following SQL in Supabase. **All tables created in Phase 1 to avoid cross-phase schema drift.**

```sql
-- ============================================
-- USERS
-- ============================================
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

-- ============================================
-- SUBJECTS
-- ============================================
CREATE TABLE subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- LESSON SERIES
-- ============================================
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

-- ============================================
-- LESSONS
-- ============================================
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

-- ============================================
-- LESSON_STUDENTS
-- ============================================
CREATE TABLE lesson_students (
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, student_id)
);

-- ============================================
-- ATTENDANCE
-- ============================================
CREATE TABLE attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present','absent')),
  method      text DEFAULT 'manual' CHECK (method IN ('manual','face_id')),
  marked_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

-- ============================================
-- GRADES
-- ============================================
CREATE TABLE grades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  score       int CHECK (score BETWEEN 0 AND 100),
  graded_at   timestamptz DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

-- ============================================
-- CLUBS
-- ============================================
CREATE TABLE clubs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text UNIQUE NOT NULL,
  head_student_id   uuid REFERENCES users(id),
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ============================================
-- CLUB_MEMBERS
-- ============================================
CREATE TABLE club_members (
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, student_id)
);

-- ============================================
-- CLUB_ANNOUNCEMENTS
-- ============================================
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

-- ============================================
-- EVENT_SIGNUPS
-- ============================================
CREATE TABLE event_signups (
  announcement_id  uuid REFERENCES club_announcements(id) ON DELETE CASCADE,
  student_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  signed_up_at     timestamptz DEFAULT now(),
  PRIMARY KEY (announcement_id, student_id)
);

-- ============================================
-- RECOMMENDATIONS
-- ============================================
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

-- ============================================
-- APP_CONFIG
-- ============================================
CREATE TABLE app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_config (key, value) VALUES
  ('semester_start', to_char(make_date(EXTRACT(YEAR FROM now())::int, 9, 1), 'YYYY-MM-DD')),
  ('face_match_threshold', '0.6');

-- ============================================
-- AUDIT_LOG
-- ============================================
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES users(id),
  action      text CHECK (action IN ('CREATE','UPDATE','DELETE')),
  table_name  text NOT NULL,
  record_id   uuid,
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);
```

### 1.5 Indexes

```sql
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
```

### 1.6 Analytics Views

```sql
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
```

### 1.7 Storage Buckets

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('diplomas', 'diplomas', false),
  ('student-photos', 'student-photos', false),
  ('club-photos', 'club-photos', true);
```

### 1.8 Verify

- `npm run build` passes.
- Supabase tables visible in Dashboard.
- `.env.local` created with all 4 env vars.

**Deliverable:** Scaffolded repo with Ant Design, all DB tables + indexes + views + buckets created, Supabase client configured.

---

## Phase 2 — Authentication & Role-Based Layouts

**Goal:** Phone + password login; role-based layouts with antd `Layout` + `Menu`; route guards; admin dashboard.

### 2.1 RLS for users table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'role'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE POLICY "Admin full access" ON users FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
CREATE POLICY "Users read own row" ON users FOR SELECT
  USING (id = auth.uid() AND deleted_at IS NULL);
```

### 2.2 Login Page

`/app/(auth)/login/page.tsx` — Client Component:
- antd `Form` with `Form.Item` rules for validation:
  - Phone: required, pattern for phone format.
  - Password: required, min 6 chars.
- Submit: `supabase.auth.signInWithPassword({ email: phoneToAuthEmail(phone), password })`.
- On success: fetch `users.role` → redirect `/admin` | `/teacher/lessons` | `/student/schedule`.
- On error: `antd message.error(...)`.

### 2.3 Middleware

`/src/middleware.ts`:
- Refresh session via `@supabase/ssr`.
- Protect `/(admin|teacher|student)/**` routes → unauthenticated → redirect `/login`.
- Role mismatch → redirect to correct base path.

### 2.4 Role Layouts

All layouts use antd `Layout` + `Layout.Sider` + `Menu`:

1. `/app/(admin)/admin/layout.tsx`:
   - Server Component: verify `role = 'admin'`, redirect if mismatch.
   - antd `Layout` with collapsible `Sider`.
   - `Menu` items: Главная, Преподаватели, Студенты, Предметы, Расписание, Клубы, Аналитика, Риск-дашборд.
   - Sign Out button in Sider footer.

2. `/app/(admin)/admin/page.tsx` — **Admin Dashboard** (Server Component):
   - antd `Statistic` cards in `Row`/`Col` grid: Total Active Students, Total Teachers, Lessons This Week, Pending Reports (unsubmitted count from `v_teacher_report_status`).
   - Quick-access `Button` links to each section.
   - antd `Table` with last 5 created entities (students or teachers).

3. `/app/(teacher)/teacher/layout.tsx`:
   - Verify `role = 'teacher'`, redirect if mismatch.
   - `Menu` items: Уроки, Студенты, Профиль.

4. `/app/(student)/student/layout.tsx`:
   - Verify `role = 'student'`, redirect if mismatch.
   - `Menu` items: Расписание, Мои клубы, Мой клуб (conditional — `WHERE head_student_id = currentUser.id`), Объявления, Профиль.

### 2.5 Auth Callback

`/app/auth/callback/route.ts` — Supabase auth code exchange.

### 2.6 Seed Admin

Via Supabase Auth + SQL: create auth user → set `role = 'admin'` in `public.users`.

### 2.7 Verify

- `npm run build` passes.
- Login → correct role redirect.
- Each layout renders with antd Sider + Menu.
- Admin dashboard shows KPI cards.
- Sign Out works.

**Deliverable:** Login works; role redirects correct; 3 role layouts with antd Layout/Menu; admin dashboard with KPI cards.

---

## Phase 3 — Admin: Teachers & Students

**Goal:** Full CRUD for teachers and students with file uploads, analytics modals, password reset.

### 3.1 Storage RLS

```sql
CREATE POLICY "Admin manage diplomas" ON storage.objects
  FOR ALL USING (bucket_id = 'diplomas' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manage student-photos" ON storage.objects
  FOR ALL USING (bucket_id = 'student-photos' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers read student-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-photos' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));
```

### 3.2 Teachers (`/app/(admin)/admin/teachers/`)

1. `page.tsx` (Server Component): fetch teachers (`WHERE deleted_at IS NULL`) → pass to client.
2. `TeachersTable` (Client Component) — antd `Table`:
   - Columns: Имя, Телефон, Предметы (tags), Уроков, Дата создания, Действия.
   - antd `Input.Search` for client-side filtering.
   - Pagination built into antd Table.
   - Actions column: Редактировать, Удалить, Сбросить пароль, Войти как (Phase 5).
3. `TeacherFormModal` — antd `Modal` + `Form`:
   - `Form.Item` fields: ФИО, Телефон, Пароль (create only), Диплом (`Upload` with `beforeUpload` to Supabase Storage).
   - Diploma upload: `supabase.storage.from('diplomas').upload(...)`.
   - Server Action `createTeacher`: `supabase.auth.admin.createUser({ email: phoneToAuthEmail(phone), password, user_metadata: { phone, full_name, role: 'teacher' } })`.
   - Server Action `updateTeacher`: update `public.users` row.
4. Delete: Server Action → `SET deleted_at = now()`. Future lessons of this teacher → `SET teacher_id = NULL` (flagged as unassigned).
5. Password reset: Server Action `resetPassword(userId, newPassword)` → `supabase.auth.admin.updateUserById(userId, { password })`. Confirm via antd `Modal.confirm`.
6. Diploma view: `supabase.storage.from('diplomas').createSignedUrl(path, 3600)` → open in new tab.

### 3.3 Students (`/app/(admin)/admin/students/`)

1. `page.tsx` (Server Component) → client table.
2. `StudentsTable` — antd `Table`:
   - Columns: Фото (antd `Avatar`), Имя, Телефон, Курс, Действия (Оценки, Активность, Редактировать, Удалить, Сбросить пароль, Войти как).
   - antd `Select` filter by course/year.
3. `StudentFormModal` — antd `Modal` + `Form`:
   - Fields: ФИО, Телефон, Пароль, Курс (`Select` 1–6), Фото (`Upload` → `student-photos` bucket).
   - `browser-image-compression` before upload.
4. `StudentGradesModal` — antd `Modal`:
   - Fetch enrolled subjects (via `lesson_students` → `lessons` → `subjects`).
   - antd `Select` for subject → on change: fetch grades for that subject.
   - antd `Table`: Дата, Оценка (score or "Н/Д" if NULL).
5. `StudentSocialModal` — antd `Modal`:
   - Fetch `event_signups` grouped by month.
   - `recharts` LineChart: x = month, y = sign-up count.
6. Password reset: same pattern as teachers.

### 3.4 Verify

- `npm run build` passes.
- Admin creates/edits/deletes teachers and students.
- File uploads work (diplomas, student photos).
- Grades modal shows per-subject data.
- Social modal renders chart.
- Password reset works.
- Soft-delete teacher → future lessons have `teacher_id = NULL`.

**Deliverable:** Admin CRUD teachers and students; file uploads; analytics modals; password reset.

---

## Phase 4 — Admin: Subjects & Schedule

**Goal:** Subject CRUD; lesson scheduling on interactive calendar with recurrence + conflict detection.

### 4.1 RLS

```sql
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full subjects" ON subjects FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Auth read subjects" ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admin full lessons" ON lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teacher read own lessons" ON lessons FOR SELECT
  USING (teacher_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Student read enrolled lessons" ON lessons FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM lesson_students WHERE lesson_id = lessons.id AND student_id = auth.uid()
  ));

CREATE POLICY "Admin full lesson_series" ON lesson_series FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full lesson_students" ON lesson_students FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teacher read own lesson_students" ON lesson_students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lessons l WHERE l.id = lesson_id AND l.teacher_id = auth.uid()
  ));
CREATE POLICY "Student read own enrollment" ON lesson_students FOR SELECT
  USING (student_id = auth.uid());
```

### 4.2 Subjects (`/app/(admin)/admin/subjects/`)

- antd `Table` with inline editing (editable cells).
- Columns: ID (auto), Название, Действия (Редактировать, Удалить).
- Create: antd `Button` → opens `Modal` with `Form.Item` name (required, unique).
- Server Actions: `createSubject`, `updateSubject`, `deleteSubject` (soft delete).

### 4.3 Schedule (`/app/(admin)/admin/schedule/`) — Client Component

1. `@tanstack/react-query` `useQuery` → fetch lessons for current calendar date range.
2. `react-big-calendar` with `dateFnsLocalizer`; week view default, month toggle.
3. Colour-coded by subject.

### 4.4 `LessonFormModal` (Create/Edit) — antd `Modal` + `Form`

- `Form.Item` fields:
  - Предмет: antd `Select` (subjects).
  - Преподаватель: antd `Select` (teachers).
  - Студенты: antd `Select` mode="multiple" with search (students).
  - `RecurrenceBuilder` custom component:
    - antd `Checkbox.Group` for days (Пн=1 … Вс=7).
    - Per checked day: antd `TimePicker.RangePicker` with 30-minute steps (`minuteStep={30}`), "+ Добавить слот" button.
    - Date range: antd `DatePicker.RangePicker`.
- **Conflict detection** (Server Action `checkConflicts`):
  - Before save: query `lessons WHERE deleted_at IS NULL AND teacher_id = X AND (starts_at, ends_at) OVERLAPS (new_start, new_end)`.
  - Same for each student.
  - If conflicts found → return list → display in antd `Alert` with details → block save.
- Save → Server Action `createLessonSeries`:
  1. Insert `lesson_series` row.
  2. Generate lesson instances from `recurrence_rule` between `start_date` / `end_date`.
  3. Insert `lessons` rows.
  4. Insert `lesson_students` rows for all instances.

### 4.5 `LessonDetailDrawer` — antd `Drawer`

- Triggered by calendar event click.
- Header: Subject, Teacher, Date/Time.
- antd `Table`: Student Name | Attendance (antd `Tag`) | Grade.
- Footer: Edit button (opens pre-filled `LessonFormModal` + "Apply to future" `Checkbox`), Delete button (antd `Popconfirm` → single instance or series).
- Conflict detection also applies on edit.

### 4.6 Verify

- `npm run build` passes.
- Subjects CRUD works.
- Lesson series created → instances appear on calendar.
- Overlapping lesson for same teacher → conflict error shown.
- Overlapping lesson for same student → conflict error shown.
- Lesson detail drawer shows enrolled students.
- Edit + "Apply to future" updates future instances.
- Delete single instance / full series works.

**Deliverable:** Admin subjects CRUD; calendar with recurring lessons; conflict detection; lesson detail drawer.

---

## Phase 5 — Admin: Clubs, Announcements & Impersonation

**Goal:** Club CRUD, announcements, sign-ups; SuperAdmin impersonation.

### 5.1 RLS

```sql
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full clubs" ON clubs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Auth read clubs" ON clubs FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Club head update own club" ON clubs FOR UPDATE
  USING (head_student_id = auth.uid());

CREATE POLICY "Admin full club_members" ON club_members FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Club head manage members" ON club_members FOR ALL
  USING (EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND head_student_id = auth.uid()));
CREATE POLICY "Student read own membership" ON club_members FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admin full announcements" ON club_announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Club head manage own announcements" ON club_announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND head_student_id = auth.uid()));
CREATE POLICY "Auth read announcements" ON club_announcements FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Students manage own signups" ON event_signups FOR ALL
  USING (student_id = auth.uid());
CREATE POLICY "Admin read signups" ON event_signups FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Club head read own signups" ON event_signups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM club_announcements ca
    JOIN clubs c ON c.id = ca.club_id
    WHERE ca.id = announcement_id AND c.head_student_id = auth.uid()
  ));
```

### 5.2 Clubs (`/app/(admin)/admin/clubs/`)

1. `page.tsx` — antd `Row`/`Col` grid of antd `Card`:
   - Card content: club name, head student (antd `Avatar` + name), member count `Badge`.
   - Card actions: Редактировать, Удалить, Добавить объявление.
2. `ClubFormModal` — antd `Modal` + `Form`:
   - Fields: Название, Глава клуба (antd `Select` — single student), Участники (antd `Select` mode="multiple").
   - Save: upsert club + delete/re-insert `club_members`.
3. Each card → expandable announcements list (antd `Collapse` or `List`).
4. `AnnouncementFormModal` — antd `Modal` + `Form`:
   - Fields: Фото (`Upload` → `club-photos` bucket), Название, Описание (`Input.TextArea`), Дата (`DatePicker`), Время начала/конца (`TimePicker` × 2, `minuteStep={30}`), Место.
5. Per announcement: expandable sign-up list (antd `Table`: Student Name, Signed Up At).

### 5.3 SuperAdmin Impersonation

**Critical constraint:** `auth.uid()` stays admin's UUID during impersonation. All queries in teacher/student portals MUST use `getEffectiveUserId()`.

1. `/src/lib/impersonation.ts`:
   ```typescript
   export function getImpersonatedId(cookies: ReadonlyRequestCookies): string | null
   export function setImpersonation(response: NextResponse, userId: string): void
   export function clearImpersonation(response: NextResponse): void
   export function getEffectiveUserId(cookies: ReadonlyRequestCookies, authUid: string): string
   ```
2. **"Войти как" button** on TeachersTable and StudentsTable rows (from Phase 3).
   - Server Action `startImpersonation(targetUserId)`:
     - Verify caller `role = 'admin'`.
     - Set cookie `impersonate_id = targetUserId` (httpOnly, sameSite strict).
     - Redirect to `/teacher/lessons` or `/student/schedule` by target role.
3. **Middleware update** (`middleware.ts`):
   - Read `impersonate_id` cookie.
   - If set AND real session is admin → route protection uses impersonated user's role.
4. **Impersonation Banner** — in each role layout:
   ```tsx
   // antd Alert at top of page
   <Alert
     type="warning"
     banner
     message={`Вы работаете от имени: ${impersonatedUser.full_name}`}
     action={<Button onClick={stopImpersonationAction}>Вернуться как Admin</Button>}
   />
   ```
5. **Stop Impersonation**: Server Action clears cookie → redirect `/admin`.
6. **Security**: middleware verifies real session is admin before allowing impersonation routes.

### 5.4 Verify

- `npm run build` passes.
- Admin CRUD clubs, announcements, sign-ups.
- Club photos upload to public bucket.
- Impersonation: click "Войти как" → see teacher/student layout with banner.
- Impersonation: "Вернуться как Admin" → back to admin.
- Impersonation: non-admin cannot set cookie.

**Deliverable:** Admin clubs + announcements; impersonation mechanism with `getEffectiveUserId()`.

---

## Phase 6 — Teacher Portal

**Goal:** Teacher calendar, lesson report (manual attendance + grades), report lock/unlock, students list, profile + change password.

### 6.1 RLS

```sql
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher manage attendance for own lessons" ON attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM lessons l WHERE l.id = lesson_id AND l.teacher_id = auth.uid()));
CREATE POLICY "Student read own attendance" ON attendance FOR SELECT
  USING (student_id = auth.uid());
CREATE POLICY "Admin full attendance" ON attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teacher manage grades for own lessons" ON grades FOR ALL
  USING (EXISTS (SELECT 1 FROM lessons l WHERE l.id = lesson_id AND l.teacher_id = auth.uid()));
CREATE POLICY "Student read own grades" ON grades FOR SELECT
  USING (student_id = auth.uid());
CREATE POLICY "Admin full grades" ON grades FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

### 6.2 Lessons Calendar (`/app/(teacher)/teacher/lessons/`)

1. `page.tsx` — Client Component:
   - `react-big-calendar` filtered to `teacher_id = getEffectiveUserId()`.
   - Week view default.
   - Click event → navigate to `/teacher/lessons/[id]`.

### 6.3 Lesson Detail (`/app/(teacher)/teacher/lessons/[id]/`)

1. `page.tsx` — Server Component:
   - Fetch lesson + enrolled students + existing attendance/grades.
   - Check `report_submitted_at`:
     - `NULL` → render `LessonReportForm`.
     - Not `NULL` → render `LessonViewMode`.
   - If admin impersonation active AND report is submitted → show antd `Button` "Разблокировать отчёт" → Server Action sets `report_submitted_at = NULL` (logged in audit_log).

2. `LessonReportForm` (Client Component):
   - **Attendance section**: antd `Table` with per-student row:
     - Student Name, Avatar.
     - antd `Switch` or `Radio.Group` (Присутствует / Отсутствует).
     - Face-ID result badge (filled in Phase 8).
   - **Face-ID button**: placeholder `Button` "Сканирование Face-ID" (implemented in Phase 8).
   - **Grades section**: antd `Table` with per-student row:
     - antd `InputNumber` (0–100) OR antd `Checkbox` "Н/Д" (sets score = NULL).
   - **Submit**: antd `Button` type="primary" → `Popconfirm` "Отчёт будет заблокирован" → Server Action:
     - Upsert `attendance` rows.
     - Upsert `grades` rows (score = NULL if "Н/Д" checked).
     - Set `report_submitted_at = now()`.

3. `LessonViewMode`: antd read-only `Table` + antd `Button` "Скачать CSV":
   - CSV columns: Студент, Посещаемость, Оценка, Метод отметки.

### 6.4 Students (`/app/(teacher)/teacher/students/`)

1. `page.tsx` — Server Component: fetch distinct students from teacher's lessons.
2. antd `Table`: Avatar, Имя, Телефон, Действия.
3. **Performance Modal** — antd `Modal`:
   - antd `Select` for subject (only subjects this teacher teaches to this student).
   - `recharts` LineChart: x = lesson date, y = grade.
4. **Attendance Modal** — antd `Modal`:
   - Attendance rate across this teacher's lessons.
   - antd `Statistic` for overall %, `Progress` bar.
   - antd `Table`: lesson date, subject, status (Present/Absent tag).

### 6.5 Profile (`/app/(teacher)/teacher/profile/`)

1. `page.tsx` — Server Component: display name, phone, diploma signed URL link.
2. antd `Descriptions` component for profile fields.
3. **Change Password** — antd `Button` → `Modal` + `Form`:
   - Fields: Текущий пароль, Новый пароль (min 8), Подтверждение.
   - Server Action: re-authenticate via `signInWithPassword` → `supabase.auth.updateUser({ password })`.

### 6.6 Verify

- `npm run build` passes.
- Teacher sees own lessons on calendar.
- Report form: toggle attendance, enter grades, submit → locks.
- Admin unlock report (via impersonation) → teacher can re-edit.
- View mode: read-only table + CSV download.
- Students list with performance chart + attendance stats.
- Change password works.

**Deliverable:** Teacher report flow complete; manual attendance + grades; lock/unlock; students list; profile + password change.

---

## Phase 7 — Student Portal

**Goal:** Schedule with events, my clubs, my club (head), announcements + sign-up, profile + change password.

### 7.1 Schedule (`/app/(student)/student/schedule/`) — Client Component

1. **Recommendation cards header** (placeholder — populated in Phase 9):
   - Fetch active `recommendations` for current user → render up to 3 `RecommendationCard` at top.
   - For now: show empty state or skip rendering if no recommendations.
2. Fetch lessons (via `lesson_students` WHERE `student_id = getEffectiveUserId()`) + signed-up events (via `event_signups`).
3. Merge into calendar events with `type: 'lesson' | 'event'`.
4. `react-big-calendar`: `eventPropGetter` → blue = lesson, green = event.
5. **Lesson click** → antd `Modal` (read-only): subject, teacher, time, grade + attendance (only if `report_submitted_at` is set).
6. **Event click** → antd `Modal`: club name, title, venue, time. antd `Button` "Отменить запись" → Server Action deletes `event_signups` row.

### 7.2 My Clubs (`/app/(student)/student/my-clubs/`)

1. Server Component: fetch clubs where student is member (via `club_members WHERE student_id = getEffectiveUserId()`).
2. antd `Card` grid (read-only): club name, head student name, member count.
3. No actions — membership managed by admin or club head.

### 7.3 My Club — Head (`/app/(student)/student/my-club/`)

1. Server Component: `SELECT * FROM clubs WHERE head_student_id = getEffectiveUserId()`.
   - If not found → redirect to `/student/schedule`.
2. antd `Tabs`:
   - **Tab "Объявления"**:
     - antd `List` of announcements with antd `Card` items.
     - CRUD: `AnnouncementFormModal` (same as admin but scoped to this club).
     - Per announcement: expandable sign-up list.
   - **Tab "Участники"**:
     - antd `Table`: Avatar, Имя, Телефон, Действия (Удалить).
     - antd `Button` "Добавить участника" → `Modal` with student `Select`.
3. Server Actions: `addClubMember`, `removeClubMember`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`.

### 7.4 Announcements (`/app/(student)/student/announcements/`)

1. Toggle: antd `Segmented` — "Календарь" | "Список".
2. **Calendar view**: `react-big-calendar` showing all upcoming `club_announcements`.
3. **List view**: antd `List` with `Card` items: club name (antd `Tag`), title, venue, time, sign-up count, user's signup status.
4. **Sign Up / Cancel**: antd `Button` toggles. Server Action `toggleSignup(announcementId)`:
   - If signed up → DELETE from `event_signups`.
   - If not → INSERT into `event_signups`.
   - Revalidate schedule path.
5. **Any student can sign up for any club's event** (university-wide, not restricted to members).

### 7.5 Profile (`/app/(student)/student/profile/`)

1. Server Component: display avatar (signed URL), name, course/year.
2. antd `Descriptions` for profile fields.
3. Mini-stats: antd `Statistic` row:
   - Average Grade (all subjects).
   - Attendance Rate (%).
   - Club Events Signed Up (total count).
4. `RecommendationCard` list (secondary surface — populated in Phase 9).
5. **Change Password** — same modal pattern as teacher profile.

### 7.6 Verify

- `npm run build` passes.
- Student sees lessons + events on calendar.
- Lesson click → read-only detail with grade/attendance (after report submitted).
- Student sees "My Clubs" with memberships.
- Club head sees "My Club" with tabs, CRUD announcements, manage members.
- Non-head student → "My Club" redirects to schedule.
- Sign-up / cancel works; event appears/disappears on schedule.
- Profile: mini-stats displayed, change password works.

**Deliverable:** Full student portal; schedule with events; club memberships; club head panel; announcements sign-up; profile.

---

## Phase 8 — Face-ID Attendance

**Goal:** Client-side face matching via webcam + fallback upload; descriptor caching; configurable threshold.

### 8.1 Setup

1. Download face-api.js model files (`ssd_mobilenetv1`, `face_recognition_net`, `face_landmark_68`) → `/public/models/`.
2. Create `FaceIdModal` client component (`"use client"`).

### 8.2 FaceIdModal Component

```tsx
// /src/components/face-id/FaceIdModal.tsx
"use client";
import * as faceapi from 'face-api.js';
```

- antd `Modal` with two modes:
  - **Mode A (Primary)**: Webcam — `<video>` element, antd `Button` "Начать сканирование" / "Остановить".
  - **Mode B (Fallback)**: Upload — antd `Upload` (image only).

### 8.3 Webcam Mode

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
videoRef.current.srcObject = stream;

const interval = setInterval(async () => {
  const canvas = faceapi.createCanvasFromMedia(videoRef.current);
  const detections = await faceapi
    .detectAllFaces(canvas)
    .withFaceLandmarks()
    .withFaceDescriptors();

  detections.forEach(d => {
    const match = faceMatcher.findBestMatch(d.descriptor);
    if (match.distance < threshold) markPresent(match.label);
  });
}, 1000);
```

### 8.4 File Upload Fallback

```typescript
const img = await faceapi.bufferToImage(file);
const detections = await faceapi
  .detectAllFaces(img)
  .withFaceLandmarks()
  .withFaceDescriptors();
// Match all detected faces against enrolled students
```

### 8.5 Building FaceMatcher

```typescript
// For each enrolled student WITH face_photo_url (skip students without photo):
const studentImg = await loadImageFromSignedUrl(student.face_photo_url);
const descriptor = await faceapi
  .detectSingleFace(studentImg)
  .withFaceLandmarks()
  .withFaceDescriptor();

const threshold = appConfig.face_match_threshold ?? 0.6;
const matcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
```

### 8.6 Descriptor Caching

- After first extraction, store descriptor in `localStorage` keyed by `${studentId}:${face_photo_updated_at}`.
- On subsequent scans: check cache → skip re-download + re-extraction if photo unchanged.
- Reduces 100-student class from ~100 HTTP requests to near-zero on repeat scans.

### 8.7 Students Without Photo

- Excluded from face matching.
- antd `Alert` banner: "N студентов без фото — отметьте вручную" with list of names.
- These students default to no attendance status — teacher must toggle manually.

### 8.8 Integration with LessonReportForm (Phase 6)

- Replace placeholder "Face-ID" button with actual `FaceIdModal` trigger.
- On modal close: return `[{ studentId, matched, confidence }]`.
- Auto-update attendance `Switch` toggles for matched students.
- Show antd `Tag` with confidence per auto-detected student.
- Teacher can override any result before submitting.

### 8.9 Server Action

`applyFaceAttendance(lessonId, results)`:
- Upserts `attendance` rows with `method = 'face_id'`.
- **No image data or descriptors transmitted to server.**

### 8.10 Verify

- `npm run build` passes.
- Webcam mode: faces detected, matched students auto-marked present.
- Upload mode: same matching from group photo.
- Students without photo: warning banner shown, manual toggle works.
- Descriptor caching: second scan loads faster (check localStorage).
- Configurable threshold: change `face_match_threshold` in `app_config` → affects matching.
- Teacher can override any Face-ID result.

**Deliverable:** Face-ID auto-marks attendance; webcam + upload; descriptor caching; configurable threshold; override.

---

## Phase 9 — Recommendation Engine & Risk Dashboard

**Goal:** Nightly recommendations via Edge Function; up to 3 per user; risk dashboard for admin.

### 9.1 Edge Function (`supabase/functions/recommendations/index.ts`)

Algorithm — all rules evaluated per user, top 3 by `priority_score` kept:

**Student rules:**
- **R-01** (Low attendance): `attendance_pct < 70%` in any subject (last 30d) → priority 0.9, academic.
- **R-03** (Grade decline): linear regression slope of last 10 grades < -5 → priority 0.8, academic.
- **R-04** (No social activity): 0 event signups, > 30d into semester → priority 0.5, social.

**Teacher rules:**
- **R-02** (Grade entry overdue): lessons with `ends_at < now() - 48h` AND `report_submitted_at IS NULL` → priority 0.8, academic.
- **R-05** (Pending reports): > 3 unsubmitted reports → priority 0.9, admin.

**Admin rules:**
- **R-06** (Unassigned lessons): `teacher_id IS NULL AND starts_at > now()` → priority 0.85, admin.

**Upsert logic:**
- For each user: sort recs by `priority_score` DESC, keep top 3.
- UPSERT by `(user_id, rule_id)`.
- Recommendations where rule no longer fires → SET `resolved_at = now()`.
- If no rules fire → no row created.

Deploy: `supabase functions deploy recommendations`.

### 9.2 Scheduling

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('nightly-recommendations', '0 2 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/recommendations',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
  );
$$);
```

Also configure `vercel.json` cron as backup.

### 9.3 RecommendationCard Component

`/src/components/recommendations/RecommendationCard.tsx` — antd `Card`:
- antd `Tag` for category: Академик (blue), Социальное (green), Административное (orange).
- Priority colour: `Card` border or antd `Badge.Ribbon`:
  - Red: priority > 0.7.
  - Yellow: priority > 0.4.
  - Green: priority ≤ 0.4.
- `next_action` text.
- antd `Button` size="small" "Скрыть" → Server Action sets `dismissed_at = now()`.
- Card hidden when `resolved_at` is set or `dismissed_at` is set.

### 9.4 Integration with Existing Pages

1. **Student schedule page header** (Phase 7 placeholder → now populated):
   - Fetch `recommendations WHERE user_id = X AND resolved_at IS NULL AND dismissed_at IS NULL ORDER BY priority_score DESC LIMIT 3`.
   - Render `RecommendationCard` list above calendar.
2. **Student profile** (secondary surface): same cards below mini-stats.
3. **Teacher lessons page header**: same pattern, up to 3 banners.
4. **Admin dashboard**: personal admin alerts (R-06).

### 9.5 Admin Risk Dashboard (`/app/(admin)/admin/risk-dashboard/`)

1. **KPI row** — antd `Statistic` in `Row`/`Col`:
   - At-risk students (attendance < 70% in any subject).
   - Teachers with overdue reports (> 48h).
   - University avg attendance (30d).
   - Club participation rate (students with ≥ 1 signup / total students).

2. **Risk heatmap** — antd `Table` with custom cell rendering:
   - Rows = students (with search/filter).
   - Columns: Студент | Посещаемость | Оценки | Клубная активность.
   - Cells colour-coded: red (rule fires with high priority), yellow (medium), green (no issue).

3. **Pending Reports** — antd `Table`:
   - Columns: Преподаватель, Незакрытых отчётов, Самый старый.
   - Source: `v_teacher_report_status`.

4. **Unassigned Lessons** — antd `Table`:
   - Columns: Предмет, Дата, Время, Действие.
   - antd `Button` "Назначить преподавателя" → `Modal` with teacher `Select` → Server Action updates `lessons.teacher_id`.

### 9.6 Verify

- `npm run build` passes.
- Edge function deployed and callable manually.
- Recommendations generated for students, teachers, admin.
- Student with multiple issues → sees up to 3 cards (not just first match).
- "Скрыть" button hides card.
- Resolved recommendation auto-disappears on next run.
- Risk dashboard: heatmap, pending reports, unassigned lessons populated.
- "Assign Teacher" action works from risk dashboard.

**Deliverable:** Recommendation engine; up to 3 alerts per user; risk dashboard with heatmap + action buttons.

---

## Phase 10 — Analytics, Audit Log, i18n, Security & Deployment

**Goal:** Analytics page, audit triggers, Russian i18n, security hardening, production deployment.

### 10.1 Audit Log Triggers

```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit_log" ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (actor_id, action, table_name, record_id, payload)
  VALUES (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' AND OLD ? 'id' THEN (OLD->>'id')::uuid
      WHEN TG_OP != 'DELETE' AND NEW ? 'id' THEN (NEW->>'id')::uuid
      ELSE NULL
    END,
    CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Main tables
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_lessons
  AFTER INSERT OR UPDATE OR DELETE ON lessons FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_grades
  AFTER INSERT OR UPDATE OR DELETE ON grades FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON attendance FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_clubs
  AFTER INSERT OR UPDATE OR DELETE ON clubs FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_club_announcements
  AFTER INSERT OR UPDATE OR DELETE ON club_announcements FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Junction tables (record_id = NULL)
CREATE TRIGGER audit_lesson_students
  AFTER INSERT OR DELETE ON lesson_students FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_club_members
  AFTER INSERT OR DELETE ON club_members FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_event_signups
  AFTER INSERT OR DELETE ON event_signups FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

### 10.2 Analytics (`/app/(admin)/admin/analytics/`)

All charts use `recharts`. Data fetched server-side, passed to client chart components.

1. **KPI cards** — antd `Statistic` in `Row`/`Col`:
   - Total Students (active).
   - Avg Attendance (30d) — from `v_student_attendance_summary`.
   - Avg Grade (30d) — from `grades WHERE graded_at > now() - 30d AND score IS NOT NULL`.
   - Club Events This Month — from `club_announcements WHERE starts_at` in current month.

2. **Attendance by Subject** — `recharts` BarChart:
   - x = subject name, y = avg attendance %.

3. **Grade Distribution** — `recharts` BarChart:
   - Buckets: 0–20, 21–40, 41–60, 61–80, 81–100.
   - y = count of grades in each bucket.

4. **Social Participation Over Time** — `recharts` LineChart:
   - x = month, y = university-wide event sign-ups count.

5. **Unsubmitted Reports** — antd `Table`:
   - Source: `v_teacher_report_status WHERE unsubmitted_count > 0`.
   - Columns: Преподаватель, Незакрытых, Самый старый отчёт.

### 10.3 i18n

1. `npm install next-intl` (already installed in Phase 1).
2. Configure `next-intl` for App Router:
   - `/src/i18n.ts` — request config.
   - `/messages/ru.json` — ALL UI strings in Russian.
   - `/messages/en.json` — English fallback.
3. Wrap root layout with `NextIntlClientProvider`.
4. Replace ALL inline strings in components with `t('key')`:
   - Menu items, button labels, table headers, form labels, validation messages, error messages, placeholder text, modal titles, confirmation dialogs, empty states, tooltips.
5. antd `ConfigProvider` locale already set to `ruRU` in Phase 1.

### 10.4 Security Hardening

1. **RLS verification**: run `SELECT tablename FROM pg_tables WHERE schemaname='public'` — every table must have `rowsecurity = true`:
   - users, subjects, lesson_series, lessons, lesson_students, attendance, grades, clubs, club_members, club_announcements, event_signups, recommendations, app_config, audit_log.

2. **Rate limit login**: Vercel Edge Middleware + `@vercel/kv`:
   ```bash
   npm install @vercel/kv
   ```
   - Max 10 login attempts per IP per minute.
   - On exceed: return 429 with antd-friendly error.

3. **Signed URLs**: create server utility `/src/lib/supabase/signed-url.ts`:
   ```typescript
   export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string>
   ```
   - Used for: diplomas, student-photos.

4. **Security headers** in `next.config.ts`:
   ```typescript
   async headers() {
     return [{
       source: '/(.*)',
       headers: [
         { key: 'X-Frame-Options', value: 'DENY' },
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
       ]
     }]
   }
   ```

5. **SERVICE_ROLE_KEY audit**: grep entire codebase — must not appear in any file imported by client components.

### 10.5 Performance

1. `<Suspense fallback={<Skeleton />}>` around all async server components:
   - Use antd `Skeleton` (with `active` prop for animation).
   - Skeleton variants for: tables, cards, calendar, modals.
2. `@tanstack/react-query` `staleTime: 60_000` on all client queries.
3. `next/image` for all photos (student avatars, diplomas, club photos).

### 10.6 Production Deployment

1. `supabase db push --linked` — apply all migrations.
2. `supabase functions deploy --project-ref <ref>` — deploy Edge Functions.
3. Set all env vars in Vercel production environment.
4. Configure Vercel Cron in `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/recommendations",
       "schedule": "0 2 * * *"
     }]
   }
   ```
   Create `/app/api/cron/recommendations/route.ts` that triggers the Supabase Edge Function.
5. Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard.

### 10.7 Smoke Test Checklist

- [ ] Admin login → all CRUD flows (teachers, students, subjects, schedule, clubs)
- [ ] Create lesson series → verify instances in DB
- [ ] Create overlapping lesson for same teacher → conflict error shown
- [ ] Create overlapping lesson for same student → conflict error shown
- [ ] Soft-delete teacher → future lessons flagged as unassigned in admin dashboard
- [ ] Admin reset teacher/student password → user logs in with new password
- [ ] Teacher login → submit report → attendance + grades saved
- [ ] Admin unlock submitted report (via impersonation) → teacher can re-edit
- [ ] Face-ID webcam scan → at least 1 student auto-marked present
- [ ] Face-ID upload → matching works from group photo
- [ ] Students without photo → warning banner shown
- [ ] Student login → schedule shows lessons + club events
- [ ] Student sees "My Clubs" with their memberships
- [ ] Student sign-up → event appears on schedule
- [ ] Club head → create announcement → any student (non-member) signs up
- [ ] Trigger recommendation function manually → up to 3 cards appear on schedule header
- [ ] Student with multiple issues → sees multiple recommendation cards
- [ ] Admin Risk Dashboard → heatmap populated; unassigned lessons listed
- [ ] "Assign Teacher" from risk dashboard → lesson updated
- [ ] Admin impersonation → sees exact student/teacher view with correct data
- [ ] Impersonation banner visible; "Вернуться" button works
- [ ] Analytics page → all 4 charts + KPI cards populated with data
- [ ] Audit log captures: CRUD, report unlock, lesson_students changes
- [ ] All pages display Russian text correctly
- [ ] English fallback works when switching locale
- [ ] Change password flow works for teacher and student
- [ ] Rate limiting: 11th login attempt within 1 min → 429 error
- [ ] Security headers present in response
- [ ] `SERVICE_ROLE_KEY` not exposed in any client bundle
- [ ] Signed URLs work for diplomas and student photos (expire after 1h)
- [ ] `npm run build` passes with zero errors

**Deliverable:** Production URL live; all features end-to-end; Russian UI; security hardened; audit active; analytics populated.

---

## Summary: What Each Phase Delivers

| Phase | Scope | Key Antd Components | Tables Touched |
|-------|-------|-------------------|----------------|
| 1 | Scaffold + DB | ConfigProvider, App | ALL tables created |
| 2 | Auth + Layouts | Layout, Menu, Sider, Form, Statistic | users |
| 3 | Teachers & Students CRUD | Table, Modal, Form, Upload, Avatar, Select | users, storage |
| 4 | Subjects & Schedule | Table, Modal, Form, DatePicker, TimePicker, Drawer, Checkbox, Alert | subjects, lesson_series, lessons, lesson_students |
| 5 | Clubs + Impersonation | Card, Collapse, Select, Alert (banner) | clubs, club_members, club_announcements, event_signups |
| 6 | Teacher Portal | Table, Switch, InputNumber, Checkbox, Descriptions, Popconfirm, Progress | attendance, grades |
| 7 | Student Portal | Card, Tabs, List, Segmented, Statistic, Tag, Descriptions | event_signups (read: lessons, clubs, club_members) |
| 8 | Face-ID | Modal, Button, Alert, Tag | attendance (method: face_id) |
| 9 | Recommendations + Risk | Card, Tag, Badge.Ribbon, Table (heatmap), Statistic | recommendations |
| 10 | Analytics + Audit + i18n + Security | Skeleton, Statistic + recharts | audit_log, all tables (triggers) |

---

## Ant Design Component Mapping (replaces shadcn/ui)

| shadcn/ui | Ant Design 5 equivalent |
|-----------|------------------------|
| Button | `antd Button` |
| Input | `antd Input` / `Input.Search` / `Input.TextArea` / `Input.Password` |
| Select | `antd Select` (supports mode="multiple", showSearch) |
| Dialog | `antd Modal` |
| Sheet | `antd Drawer` |
| Table | `antd Table` (built-in pagination, sorting, filtering) |
| Badge | `antd Badge` / `Tag` |
| Calendar | `antd DatePicker` / `Calendar` (for date selection only; `react-big-calendar` for schedule) |
| Form | `antd Form` + `Form.Item` with `rules` |
| Textarea | `antd Input.TextArea` |
| Popover | `antd Popover` |
| Command (combobox) | `antd Select` with `showSearch` + `filterOption` |
| Dropdown Menu | `antd Dropdown` |
| Avatar | `antd Avatar` |
| Separator | `antd Divider` |
| Card | `antd Card` |
| Tabs | `antd Tabs` |
| Toast | `antd message` (brief) / `notification` (persistent) |
| Skeleton | `antd Skeleton` |
| Label | `antd Form.Item` label prop |
| Checkbox | `antd Checkbox` / `Checkbox.Group` |
| Switch | `antd Switch` |
| DatePicker | `antd DatePicker` / `DatePicker.RangePicker` |
| TimePicker | `antd TimePicker` / `TimePicker.RangePicker` |
| Upload | `antd Upload` |
| Alert | `antd Alert` |
| Popconfirm | `antd Popconfirm` |
| Progress | `antd Progress` |
| Statistic | `antd Statistic` |
| Descriptions | `antd Descriptions` |
| Collapse | `antd Collapse` |
| Segmented | `antd Segmented` |
| Tag | `antd Tag` |
| Spin | `antd Spin` |
| Result | `antd Result` (empty states, errors) |
| react-hook-form | `antd Form` (built-in state management + validation via `rules`) |
| @tanstack/react-table | `antd Table` (built-in pagination, sorting, filtering, row selection) |
