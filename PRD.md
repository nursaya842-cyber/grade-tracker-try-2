# PRD: Academic Performance & Club Management Portal

> **Version:** 2.0 (post-BA-review)
> **Stack:** Next.js 14 (App Router) · Supabase (DB + Storage + Edge Functions) · Vercel
> **Language:** Russian (primary)
> **Last updated:** 2026-03-24

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Roles & Personas](#3-user-roles--personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Model](#6-data-model)
7. [Tech Stack & Architecture](#7-tech-stack--architecture)
8. [Environment Variables](#8-environment-variables)
9. [AI Agent Build Instructions — Phases](#9-ai-agent-build-instructions--phases)
10. [Open Questions / Out of Scope](#10-open-questions--out-of-scope)

---

## 1. Project Overview

### 1.1 Summary

An **academic performance and club management portal** built as a Next.js web application serving three user roles — Super Admin, Teachers, and Students. The portal manages lessons, grades, attendance, clubs, and club announcements. On top of this operational layer sits a **risk-alert and recommendation system** that continuously monitors threshold-based rules and surfaces actionable notifications to each stakeholder to improve academic, social, and administrative outcomes.

### 1.2 Problem Statement

Universities accumulate vast data across academic performance, social participation, and administrative workflows, yet lack a unified, intelligent layer that turns this data into actionable, personalised guidance. Manually reviewing spreadsheets is slow, biased, and rarely leads to systematic improvement.

### 1.3 Solution

A single portal where:
- **Admins** manage all entities with full CRUD access and view a risk-overview dashboard.
- **Teachers** run lessons, record attendance (manual + Face-ID via student photo), and grade students.
- **Students** view their timetable, join club events, and receive personalised risk alerts and recommendations.
- A **recommendation system** evaluates all applicable rules per user and surfaces up to 3 prioritised next-action alerts.

---

## 2. Goals & Success Metrics

| Goal | KPI | Target | Notes |
|------|-----|--------|-------|
| Increase attendance report completion | % lessons with submitted attendance report | ≥ 95% | Measures completion, not data accuracy |
| Reduce grade entry delay | Time from lesson end to grade entry | < 48 h | Alert fires at 48 h (see 4.4.2), not 7 d |
| Boost social participation | Avg club sign-ups per student per semester | +20% vs semester 1 | Semester 1 = baseline (new system) |
| Admin efficiency | Time to onboard a new student/teacher | < 2 min | |
| Recommendation engagement | % of recommendations where user took a measurable follow-up action (attendance improved, report submitted, event signed up) within 7 d | ≥ 20% | Measured by outcome change, not button click |

---

## 3. User Roles & Personas

| Role | Auth identifier | Key capabilities |
|------|----------------|-----------------|
| **Super Admin** | Phone + password | Full CRUD on all entities; impersonation; password reset for any user |
| **Teacher** | Phone + password | Manage own lessons; attendance & grades; view own students; change own password |
| **Student** | Phone + password | View schedule; view own club memberships; manage own club (if head); sign up for events; change own password |
| **Club Head** | Same as Student account | CRUD club announcements; manage club members |

> **Auth constraint:** One phone number = one account = one role. A person cannot hold multiple roles simultaneously (e.g., a teaching assistant who is also a student must choose one account).
>
> **Password reset:** Since phone-to-email mapping (`phone@university.local`) prevents standard email-based reset, password recovery is admin-only: Super Admin can reset any user's password via the admin panel.
>
> **Known limitation:** The `phoneToAuthEmail` hack means Supabase's built-in password reset, email verification, and magic link flows are non-functional. This is accepted for MVP; v2 should migrate to Supabase Phone Auth + OTP.

---

## 4. Functional Requirements

### 4.1 Super Admin Portal

#### 4.1.1 Teachers Module

| ID | Requirement |
|----|-------------|
| A-T-01 | Paginated, searchable table of all teachers |
| A-T-02 | **Create teacher**: phone (login), password, full name, diploma file upload (PDF/image → Supabase Storage) |
| A-T-03 | **Edit teacher**: all fields editable; diploma replaceable |
| A-T-04 | **Delete teacher**: soft delete; **future** lessons of deleted teacher are flagged as "unassigned" and surfaced in admin dashboard for reassignment. Past lessons retain the teacher reference for history. |
| A-T-05 | **Reset password**: admin can set a new password for any teacher (Server Action calls `supabase.auth.admin.updateUserById`) |
| A-T-06 | Inline display of assigned subjects and lesson count per row |

#### 4.1.2 Students Module

| ID | Requirement |
|----|-------------|
| A-S-01 | Paginated, searchable table of all students |
| A-S-02 | **Create student**: phone (login), password, full name, course/year (1–6), face photo upload → Supabase Storage |
| A-S-03 | **Edit student**: all fields editable; face photo replaceable |
| A-S-04 | **Delete student**: soft delete |
| A-S-05 | **View academic performance**: modal → subject selector (only enrolled subjects) → grade list for all lessons sorted by date |
| A-S-06 | **View social activity**: modal → recharts LineChart of club-event sign-ups grouped by month over full study period |
| A-S-07 | **Reset password**: admin can set a new password for any student |

#### 4.1.3 Subjects Module

| ID | Requirement |
|----|-------------|
| A-SU-01 | Table of subjects with auto-generated ID and name |
| A-SU-02 | Create / Edit / Delete subject (name must be unique) |

#### 4.1.4 Schedule Module

| ID | Requirement |
|----|-------------|
| A-SC-01 | Calendar view (week default; month toggle) showing all lessons as colour-coded blocks |
| A-SC-02 | **Create lesson**: subject (select), teacher (select), students (multi-select), recurrence rule (day-of-week checkboxes + per-day time slots at **30-minute granularity**, multi-day and multi-slot), date range (start → end) |
| A-SC-03 | **Conflict detection**: before saving, check that neither the teacher nor any selected student has an overlapping lesson in the same time slot. Display conflicting lessons and block save until resolved. |
| A-SC-04 | On save: generate individual `lessons` instances + `lesson_students` rows |
| A-SC-05 | **Edit lesson**: update any field; option to apply to all future instances in series. Conflict detection applies on edit as well. |
| A-SC-06 | **Delete lesson** instance or full series (soft delete) |
| A-SC-07 | Click lesson block → drawer: subject, teacher, enrolled students with attendance status and grades |

#### 4.1.5 Clubs Module

| ID | Requirement |
|----|-------------|
| A-C-01 | Card list of clubs with name, head student, member count |
| A-C-02 | **Create club**: name, head student (select — single), members (multi-select students) |
| A-C-03 | Edit / Delete club |
| A-C-04 | **Add announcement**: photo upload, title, description, date + start/end time (**30-minute picker**), venue |
| A-C-05 | View sign-up list per announcement |

---

### 4.2 Teacher Portal

| ID | Requirement |
|----|-------------|
| T-L-01 | Weekly calendar filtered to teacher's own lessons |
| T-L-02 | Lesson detail page: **Report mode** (not submitted) or **View mode** (read-only after submission) |
| T-L-03 | Report mode — Attendance: Present/Absent toggle per student; **Face-ID Scan** button → camera/upload → auto-marks matched students present; teacher can override. **If any enrolled students have no face photo, show a warning banner listing them** (they must be marked manually). |
| T-L-04 | Report mode — Grades: 0–100 input OR "N/A" toggle per student |
| T-L-05 | **Submit Report** locks lesson; sets `report_submitted_at`. **Admin can unlock** a submitted report (sets `report_submitted_at = NULL`) to allow teacher corrections. Unlock is logged in audit_log. |
| T-L-06 | View mode: read-only table; CSV export (columns: Student Name, Attendance Status, Grade, Attendance Method) |
| T-S-01 | List of students from teacher's own lessons |
| T-S-02 | Performance modal per student: grade timeline per subject |
| T-S-03 | Attendance modal per student: attendance rate across teacher's lessons |
| T-P-01 | Profile page: view name, phone, diploma link; **Change Password** button (current + new + confirm) |

---

### 4.3 Student Portal

| ID | Requirement |
|----|-------------|
| S-SC-01 | Weekly calendar filtered to student's own lessons + signed-up events |
| S-SC-02 | Lesson card: subject, teacher, time; click → read-only detail (grade + attendance after report submitted) |
| S-SC-03 | Club events on same calendar in distinct colour |
| S-CL-01 | **My Clubs** section — shows list of all clubs the student is a member of (read-only cards: club name, head, member count) |
| S-CL-02 | **My Club (Head)** section — visible only if student is club head. Tabs: Announcements (list + CRUD) and Members (list + add/remove) |
| S-CL-03 | Sign-up list per announcement (visible to club head) |
| S-AN-01 | All clubs announcements: calendar + list view. **Any student** can sign up for any club's event (events are university-wide, not restricted to club members). |
| S-AN-02 | **Sign Up** button → inserts signup row; button becomes "Cancel" |
| S-AN-03 | Signed-up events appear on schedule calendar |
| S-P-01 | Profile: view name, course/year, face photo; **Change Password** button |
| S-P-02 | Recommendation cards on **schedule page header** (primary surface) and profile page (secondary) |

---

### 4.4 Recommendation & Risk Alert System

#### 4.4.1 Overview

Supabase Edge Function triggered nightly + on-demand. **All applicable rules are evaluated per user** (no "first match wins"). Up to **3 highest-priority** recommendations are stored per user in the `recommendations` table. If no rules fire, no row is created (no "placeholder" records).

#### 4.4.2 Alert Rules

| ID | Signal | Detection rule | Priority | Category | Target role |
|----|--------|---------------|----------|----------|-------------|
| R-01 | Low attendance | Student attendance < 70% in any subject (last 30d) | 0.9 | academic | student |
| R-02 | Grade entry overdue | Grade not entered > 48 h after lesson end | 0.8 | academic | teacher |
| R-03 | Grade decline | Linear regression slope of last 10 grades < −5 | 0.8 | academic | student |
| R-04 | No social activity | Student in 0 club events, > 30 days into semester | 0.5 | social | student |
| R-05 | Pending reports | Teacher has > 3 unsubmitted lesson reports | 0.9 | admin | teacher |
| R-06 | Unassigned lessons | Lessons exist with `teacher_id IS NULL` and `starts_at > now()` | 0.85 | admin | admin |

> **Scoring:** All rules are evaluated. Results are sorted by `priority_score` DESC. Top 3 per user are upserted into `recommendations`. Lower-priority alerts are discarded until the next run.
>
> **Grade entry alert (R-02):** Threshold is 48 h (aligned with KPI target), not 7 d as in v1.
>
> **Admin alerts (R-06):** Admin now receives recommendations for unassigned lessons (e.g., after teacher soft-delete).

#### 4.4.3 Output Surfaces

- **Student schedule page header**: up to 3 recommendation cards (primary surface); also shown on profile page
- **Teacher dashboard header**: up to 3 recommendation banners
- **Admin Risk Dashboard**: aggregate heatmap of alert signals university-wide + personal admin alerts

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 2 s on 4G; DB indexes on all FK + query columns |
| **Security** | Supabase RLS on every table; Supabase Auth for passwords; private buckets with signed URLs (1 h expiry) |
| **Privacy** | Face photos are biometric data. Student must see a consent notice on first login explaining: what data is collected, how it's processed (client-side only, no server transmission of descriptors), and how to request deletion. Face photo upload is optional; without it, attendance is manual-only for that student. |
| **Scalability** | Stateless Next.js on Vercel; Supabase scales independently |
| **Accessibility** | WCAG 2.1 AA; keyboard-navigable modals |
| **i18n** | Russian primary via `next-intl`; English fallback |
| **Responsiveness** | Mobile-first; usable on 375 px viewport |
| **Auditability** | `audit_log` table — all CRUD mutations logged (actor, action, timestamp, payload diff) |

---

## 6. Data Model

> All tables: UUID PKs, `created_at` / `updated_at`, soft-delete via nullable `deleted_at`.

### 6.1 SQL Schema

```sql
-- USERS (unified; role discriminates)
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           text UNIQUE NOT NULL,
  full_name       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin','teacher','student')),
  face_photo_url  text,           -- students only
  diploma_url     text,           -- teachers only
  course_year     int,            -- students only (1-6)
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  -- Role-field integrity: prevent cross-role data pollution
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

-- LESSON SERIES (recurrence parent)
CREATE TABLE lesson_series (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       uuid REFERENCES subjects(id),
  teacher_id       uuid REFERENCES users(id),
  recurrence_rule  jsonb NOT NULL,
  -- {"days":[1,3],"slots":[{"start":"09:00","end":"10:00"}]}
  -- Validation: days[] values 1-7, slots[].start/end in HH:MM format — enforced at application layer
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  deleted_at       timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- LESSONS (individual instances)
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

-- LESSON_STUDENTS (enrollment)
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
  score       int CHECK (score BETWEEN 0 AND 100),  -- NULL means N/A (student absent or not applicable)
  -- No separate `applicable` flag: score IS NULL = N/A, score IS NOT NULL = graded.
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

-- RECOMMENDATIONS (up to 3 per user; old rows deleted on each nightly run)
CREATE TABLE recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  rule_id         text NOT NULL,              -- e.g. 'R-01', 'R-03' — links to alert rule ID
  category        text CHECK (category IN ('academic','social','admin')),
  next_action     text NOT NULL,
  priority_score  float NOT NULL,
  resolved_at     timestamptz,                -- set when user's underlying metric improves (measured by next run)
  dismissed_at    timestamptz,                -- set when user clicks "dismiss"
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, rule_id)                   -- one alert per rule per user; upserted on each run
);

-- APP_CONFIG (for configurable settings like semester start)
CREATE TABLE app_config (
  key    text PRIMARY KEY,
  value  text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
-- Default: September 1 of current year (academic year start in KZ/CIS).
-- Admin MUST update this via Settings page each semester.
INSERT INTO app_config (key, value) VALUES ('semester_start', to_char(make_date(EXTRACT(YEAR FROM now())::int, 9, 1), 'YYYY-MM-DD'));

-- AUDIT_LOG
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES users(id),
  action      text CHECK (action IN ('CREATE','UPDATE','DELETE')),
  table_name  text NOT NULL,
  record_id   uuid,            -- NULL for composite-PK tables (lesson_students, club_members, event_signups)
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);
-- RLS: admin-only read access
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit_log" ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
-- Note: audit triggers write with SECURITY DEFINER, bypassing RLS for inserts.
```

### 6.2 Required Indexes

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
-- For schedule conflict detection:
CREATE INDEX ON lessons (teacher_id, starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX ON lessons (starts_at, ends_at) WHERE deleted_at IS NULL;
```

### 6.3 Analytics Views

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

---

## 7. Tech Stack & Architecture

```
┌──────────────────────────────────────┐
│          Vercel (Edge CDN)            │
│   Next.js 14 — App Router (RSC)      │
│   ├─ /app/(auth)/login               │
│   ├─ /app/(admin)/...                │
│   ├─ /app/(teacher)/...              │
│   └─ /app/(student)/...              │
└────────────────┬─────────────────────┘
                 │  @supabase/ssr + RLS
┌────────────────▼─────────────────────┐
│              Supabase                 │
│  ├─ PostgreSQL (main DB + views)     │
│  ├─ Auth (phone→email shim)          │
│  ├─ Storage                          │
│  │   ├─ student-photos (private)     │
│  │   ├─ diplomas (private)           │
│  │   └─ club-photos (public)         │
│  └─ Edge Functions (Deno)            │
│      ├─ face-match (future v2)       │
│      └─ recommendations              │
└──────────────────────────────────────┘
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@supabase/ssr` | Server-side Supabase auth helpers for App Router |
| `@supabase/supabase-js` | Client SDK |
| `react-big-calendar` + `date-fns` | Calendar views |
| `recharts` | Grade trends, social activity, analytics charts |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form handling + validation |
| `shadcn/ui` (Radix + Tailwind) | UI component library |
| `@tanstack/react-table` | Headless table primitives (teachers, students, grades) |
| `@tanstack/react-query` | Client-side data fetching & caching |
| `face-api.js` | Client-side face detection & descriptor extraction |
| `browser-image-compression` | Compress student photos client-side before upload |
| `next-intl` | i18n — Russian primary |
| `@vercel/kv` | Rate limiting (login endpoint) |

**Required Supabase extensions** (enable in Dashboard → Database → Extensions):
- `pg_cron` — nightly recommendation job scheduling
- `pg_net` — HTTP calls from pg_cron to Edge Functions

---

## 8. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only
NEXT_PUBLIC_APP_URL=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in any file imported by client components.

---

## 9. AI Agent Build Instructions — Phases

> **Agent conventions:**
> - TypeScript throughout. No `any` types.
> - Next.js 14 App Router. Server Components by default. `"use client"` only when needed.
> - `@supabase/ssr` — `createServerClient` / `createBrowserClient`. Never the legacy client.
> - Tailwind CSS + shadcn/ui for all UI.
> - `react-hook-form` + `zod` for every form.
> - Server Actions for all mutations. No separate `/api` routes unless required by Edge Functions.
> - RLS policy created for every new table before writing application code.
> - Each phase ends in a buildable, deployable state (`npm run build` passes).
> - `SUPABASE_SERVICE_ROLE_KEY` never in client code.

---

### Route Group → URL Mapping (Critical for Agent)

```
Route group file path                        → URL
─────────────────────────────────────────────────────
app/(auth)/login/page.tsx                   → /login
app/(admin)/admin/page.tsx                  → /admin          ← Dashboard
app/(admin)/admin/teachers/page.tsx         → /admin/teachers
app/(admin)/admin/students/page.tsx         → /admin/students
app/(admin)/admin/subjects/page.tsx         → /admin/subjects
app/(admin)/admin/schedule/page.tsx         → /admin/schedule
app/(admin)/admin/clubs/page.tsx            → /admin/clubs
app/(admin)/admin/analytics/page.tsx        → /admin/analytics
app/(admin)/admin/risk-dashboard/page.tsx   → /admin/risk-dashboard
app/(teacher)/teacher/lessons/page.tsx      → /teacher/lessons
app/(teacher)/teacher/lessons/[id]/page.tsx → /teacher/lessons/[id]
app/(teacher)/teacher/students/page.tsx     → /teacher/students
app/(teacher)/teacher/profile/page.tsx      → /teacher/profile
app/(student)/student/schedule/page.tsx     → /student/schedule
app/(student)/student/my-clubs/page.tsx      → /student/my-clubs
app/(student)/student/my-club/page.tsx      → /student/my-club     ← Club head only
app/(student)/student/announcements/page.tsx→ /student/announcements
app/(student)/student/profile/page.tsx      → /student/profile
```

> **Rule:** Route groups `(auth)`, `(admin)`, `(teacher)`, `(student)` are NOT part of the URL. The next segment after the group IS. Always nest the role segment explicitly: `app/(admin)/admin/...`, not `app/(admin)/...`.

---



**Goal:** Running Next.js app on Vercel, connected to Supabase, with base UI system.

```bash
npx create-next-app@latest university-portal \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd university-portal

npm install @supabase/ssr @supabase/supabase-js \
  @tanstack/react-query @tanstack/react-table \
  react-hook-form @hookform/resolvers zod \
  date-fns react-big-calendar next-intl recharts face-api.js \
  browser-image-compression

npx shadcn@latest init
# Style: New York | Base color: Slate | CSS variables: yes

npx shadcn@latest add button input label select dialog sheet \
  table badge calendar form textarea popover command \
  dropdown-menu avatar separator card tabs toast
```

1. Create `/src/lib/supabase/server.ts` — `createServerClient` using `@supabase/ssr` cookies.
2. Create `/src/lib/supabase/client.ts` — `createBrowserClient`.
3. Create `/src/lib/supabase/middleware.ts` — session refresh.
4. Create `/src/lib/utils.ts` with `cn()` helper and `phoneToAuthEmail(phone)` → `phone@university.local`.
5. Create `middleware.ts` at root: protect `/(admin|teacher|student)/**`; redirect unauthenticated → `/login`; role-mismatch → correct base path.
6. Create `.env.local` from provided `.env`.
7. Push to GitHub → connect Vercel → add env vars.
8. Verify: `npm run build` passes.

**Deliverable:** Scaffolded repo, Vercel preview URL, base components available.

---

### Phase 1 — Authentication & Role-Based Routing

**Goal:** Phone + password login; role-based layouts and route guards.

**Supabase SQL:**

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
-- IMPORTANT: All SELECT policies on tables with deleted_at must include `AND deleted_at IS NULL`
-- to prevent soft-deleted records from leaking to non-admin roles.
```

**Application code:**

1. `/app/(auth)/login/page.tsx`:
   - `react-hook-form` + `zod` schema: phone + password fields.
   - Submit: `supabase.auth.signInWithPassword({ email: phoneToAuthEmail(phone), password })`.
   - On success: fetch `users.role` → redirect `/admin` | `/teacher` | `/student`.
   - Display auth error messages.

2. Role layouts:
   - `/app/(admin)/layout.tsx` — sidebar: Dashboard, Teachers, Students, Subjects, Schedule, Clubs, Analytics, Risk Dashboard.
   - `/app/(admin)/page.tsx` — **Admin Dashboard** (Server Component):
     - KPI cards row: Total Active Students, Total Teachers, Lessons This Week, Pending Reports (unsubmitted).
     - Quick-access buttons to each section.
     - Last 5 created entities (students or teachers) in a mini-table.
   - `/app/(teacher)/layout.tsx` — sidebar: Lessons, Students, Profile.
   - `/app/(student)/layout.tsx` — sidebar: Schedule, My Clubs, My Club (conditional — only if head), Announcements, Profile.

3. Each layout server component: read `users.role`; redirect if mismatch.

4. `/app/auth/callback/route.ts` — Supabase auth code exchange.

5. Sign Out button in all layouts: `supabase.auth.signOut()` → redirect `/login`.

6. Seed admin via Supabase Auth + SQL: create auth user → set `role = 'admin'` in `public.users`.

**Deliverable:** Login works; role redirects correct; admin logs in and sees layout.

---

### Phase 2 — Admin: Teachers & Students

**Goal:** Full CRUD for teachers and students with file uploads and analytics modals.

**Supabase SQL:**

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('diplomas', 'diplomas', false),
  ('student-photos', 'student-photos', false);

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

**Teachers** (`/app/(admin)/admin/teachers/`):

1. `page.tsx` (Server Component): fetch teachers (non-deleted) → pass to `TeachersTable`.
2. `TeachersTable` (Client Component): columns: Name, Phone, Created, Actions. Client-side search.
3. `TeacherFormDialog`:
   - Fields: Full Name, Phone, Password (create only), Diploma upload.
   - Diploma upload: `supabase.storage.from('diplomas').upload(`${uuid}_${filename}`)` → store URL.
   - Server Action `createTeacher`: call `supabase.auth.admin.createUser({ email: phoneToAuthEmail(phone), password, user_metadata: { phone, full_name, role: 'teacher' } })`.
   - Server Action `updateTeacher`: update `public.users` row only (password change requires separate flow).
4. Delete: Server Action sets `deleted_at = now()`.
5. Diploma view: `supabase.storage.from('diplomas').createSignedUrl(path, 3600)`.

**Students** (`/app/(admin)/admin/students/`):

1. `page.tsx` (Server Component) → `StudentsTable` (Client Component).
2. `StudentsTable`: columns: Photo (Avatar), Name, Phone, Year, Actions (Grades, Social, Edit, Delete). Course/year filter.
3. `StudentFormDialog`: Full Name, Phone, Password, Course (Select 1–6), Face Photo upload → `student-photos` bucket.
4. `StudentGradesModal`:
   - Fetch subjects student is enrolled in (via `lesson_students` JOIN `lessons` JOIN `subjects`).
   - Subject Select → on change: fetch `grades` JOIN `lessons` WHERE `student_id + subject_id` ORDER BY `starts_at`.
   - Table: Date, Score, Applicable badge.
5. `StudentSocialModal`:
   - Fetch `event_signups` grouped by `date_trunc('month', signed_up_at)`.
   - `recharts` LineChart: x = month, y = count.

**Deliverable:** Admin CRUD teachers and students; file uploads work; modals functional.

---

### Phase 3 — Admin: Subjects & Schedule

**Goal:** Subject CRUD; lesson scheduling on interactive calendar.

**Supabase SQL:**

```sql
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full subjects" ON subjects FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Auth read subjects" ON subjects FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin full lessons" ON lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teacher read own lessons" ON lessons FOR SELECT
  USING (teacher_id = auth.uid());
CREATE POLICY "Student read enrolled lessons" ON lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lesson_students WHERE lesson_id = lessons.id AND student_id = auth.uid()
  ));

-- (mirror select policies on lesson_series and lesson_students)
```

**Application code:**

**Subjects** (`/app/(admin)/subjects/`): inline-editable table rows; Server Actions: `createSubject`, `updateSubject`, `deleteSubject`.

**Schedule** (`/app/(admin)/schedule/page.tsx`) — Client Component:

1. `useQuery` fetches lessons for current calendar date range.
2. `react-big-calendar` with `dateFnsLocalizer`; week view default.
3. `LessonFormDialog` (Create/Edit):
   - Subject Select, Teacher Select, Students multi-select Combobox.
   - `RecurrenceBuilder` custom component:
     - Day checkboxes (Пн–Вс, values 1–7).
     - Per checked day: time slot rows (start hour + end hour selects, hourly increments) with "+ Add slot" button.
     - Date range: two date pickers.
   - Save → Server Action `createLessonSeries`:
     ```
     1. Insert lesson_series row
     2. Generate all lesson instances from recurrence_rule between start_date / end_date
     3. Insert lessons rows
     4. Insert lesson_students rows for all instances
     ```
4. Calendar event click → `LessonDetailDrawer` (shadcn Sheet):
   - Subject, Teacher, Date/Time.
   - Student table: Name | Attendance badge | Grade.
   - Edit (pre-fill form) + "Apply to future" checkbox.
   - Delete (single instance or series).

**Deliverable:** Admin creates recurring lessons; calendar renders; detail drawer shows data.

---

### Phase 4 — Admin: Clubs & Announcements

**Goal:** Club management and announcements from admin.

**Supabase SQL:**

```sql
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public) VALUES ('club-photos', 'club-photos', true);

CREATE POLICY "Admin full clubs" ON clubs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Auth read clubs" ON clubs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Club head update own club" ON clubs FOR UPDATE USING (head_student_id = auth.uid());

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

**Application code:**

1. `/app/(admin)/clubs/page.tsx`: card grid (shadcn Card) with club name, head, member count.
2. `ClubFormDialog`: Name, Head Student Select, Members multi-select. Save: upsert club + delete/re-insert club_members.
3. Each card: Edit, Delete, Add Announcement buttons, expandable announcements list.
4. `AnnouncementFormDialog`: Photo upload (club-photos bucket), Title, Description, Date picker + Start/End time selects, Venue.
5. Expandable sign-ups per announcement.

**Deliverable:** Admin CRUD clubs; creates announcements; views sign-ups.

---

### Phase 4.5 — SuperAdmin Impersonation

**Goal:** SuperAdmin can view the exact interface any teacher or student sees ("работать от имени").

**Critical constraint — RLS:** `auth.uid()` always returns the admin's UUID, not the impersonated user's. RLS policies like `student_id = auth.uid()` will NOT return the impersonated user's data. Therefore:
- All queries in teacher/student portals **must use `getEffectiveUserId()`** (returns impersonated ID if active, else `auth.uid()`) instead of raw `auth.uid()`.
- These queries run via Server Components / Server Actions with admin's full-access RLS policies (admin has `FOR ALL` on every table), but **filter explicitly** by the impersonated user's ID.
- This means impersonation shows the same data the user would see, but access is granted through admin RLS, not the user's own RLS policies.

**Mechanism:**

1. Impersonation helper (`/src/lib/impersonation.ts`):
   ```typescript
   export function getImpersonatedId(cookies: ReadonlyRequestCookies): string | null
   export function setImpersonation(response: NextResponse, userId: string): void
   export function clearImpersonation(response: NextResponse): void
   export function getEffectiveUserId(cookies: ReadonlyRequestCookies, authUid: string): string
   // Returns impersonatedId if set + caller is admin; else returns authUid
   ```

2. **UI — "Work As" button:**
   - On each row of TeachersTable and StudentsTable: `<Button>Войти как</Button>`
   - Clicking calls Server Action `startImpersonation(targetUserId)`:
     - Verify caller is `role = 'admin'`.
     - Set cookie `impersonate_id = targetUserId` (httpOnly, sameSite strict).
     - Redirect to `/teacher/lessons` or `/student/schedule` depending on target role.

3. **Middleware update** (`middleware.ts`):
   ```typescript
   const impersonateId = request.cookies.get('impersonate_id')?.value;
   if (impersonateId && adminSession) {
     // Fetch impersonated user's role and inject into request context
     // Route protection uses impersonated role, not real role
   }
   ```

4. **Impersonation Banner** — shown on ALL pages when impersonating:
   ```tsx
   // In each role layout — server reads cookie
   {impersonatingId && (
     <div className="fixed top-0 w-full bg-amber-500 text-black text-sm py-1 px-4 flex justify-between z-50">
       <span>⚠️ Вы работаете от имени: <strong>{impersonatedUser.full_name}</strong></span>
       <form action={stopImpersonationAction}>
         <button type="submit">Вернуться как Admin</button>
       </form>
     </div>
   )}
   ```

5. **Stop Impersonation** Server Action: clears cookie → redirects `/admin`.

6. **Security constraint**: impersonation cookie is only set if the real session has `role = 'admin'`. Middleware verifies both the real session AND the cookie.

**Deliverable:** Admin can click "Войти как" on any teacher/student, see their exact interface with banner, and return to admin with one click.

---

**Goal:** Teachers view schedule, submit lesson reports (manual + Face-ID attendance), grade students.

**Supabase SQL:**

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

**Application code:**

**Lessons** (`/app/(teacher)/lessons/`):

1. `page.tsx`: calendar filtered to `teacher_id = currentUser.id`.
2. `/[lessonId]/page.tsx`: Server Component checks `report_submitted_at`. Renders `LessonReportForm` (if not submitted) or `LessonViewMode` (read-only). If accessed via admin impersonation AND report is submitted, show "Unlock Report" button (sets `report_submitted_at = NULL`, logged in audit_log).
3. `LessonReportForm` (Client Component):
   - Attendance section: Present/Absent button toggles per student row (local state).
   - Face-ID section — **two modes**:
     - **Mode A (Primary): Webcam scan** — teacher opens webcam stream (`getUserMedia`); every ~1s, a frame is captured as a canvas snapshot and matched against all enrolled students' descriptors; matched students auto-marked present with confidence badge.
     - **Mode B (Fallback): Photo upload** — if webcam unavailable, teacher uploads a group photo; same matching logic applies to that single frame.
     ```html
     <!-- Mode A -->
     <video id="webcam" autoPlay />
     <!-- Mode B fallback -->
     <input type="file" accept="image/*" capture="environment" />
     ```
     - Photo selected/captured → load face-api models (from `/public/models/`) → extract 128-d descriptor → for each enrolled student: fetch their `face_photo_url` (signed URL) → extract descriptor → compute euclidean distance → distance < 0.6 → auto-mark present.
     - Show confidence badge per auto-detected student; teacher can override.
   - Grades section: per student 0–100 input + "N/A" checkbox.
   - Submit button → Server Action: upsert attendance rows, upsert grade rows, set `report_submitted_at = now()`.
4. `LessonViewMode`: read-only table + CSV download.

**Students** (`/app/(teacher)/students/page.tsx`): distinct students from teacher's lessons; Performance + Attendance modals (filtered to this teacher's data).

**Profile** (`/app/(teacher)/teacher/profile/page.tsx`): view-only name, phone, diploma signed URL.
- **Change Password** button → modal with fields: Current Password, New Password (min 8), Confirm New Password.
- Server Action `changePassword`: call `supabase.auth.updateUser({ password: newPassword })` (requires the user to be authenticated; re-authenticate with current password first via `signInWithPassword` as verification step).

**Deliverable:** Teacher report flow complete; Face-ID marks attendance; grades saved; password change works.

---

### Phase 6 — Student Portal

**Goal:** Schedule, club management (head), announcements sign-up.

**Application code:**

**Schedule** (`/app/(student)/student/schedule/page.tsx`) — Client Component:

1. **Recommendation cards header**: fetch active recommendations for current user → render up to 3 `RecommendationCard` components at the top of the page (primary surface).
2. Fetch lessons (via `lesson_students`) + signed-up events (via `event_signups`).
3. Merge into calendar events with `type: 'lesson' | 'event'` discriminator.
4. `eventPropGetter`: blue = lesson, green = event.
5. Lesson click → read-only modal: subject, teacher, grade, attendance (after report submitted).
6. Event click → modal: club, title, venue, Cancel Sign-Up button.

**My Clubs** (`/app/(student)/student/my-clubs/page.tsx`):

1. Server Component: fetch all clubs where student is a member (via `club_members`).
2. Read-only card list: club name, head student name, member count.
3. No actions — membership is managed by admin or club head.

**My Club (Head)** (`/app/(student)/student/my-club/page.tsx`):

1. Server Component: check `clubs.head_student_id = currentUser.id`; if not → redirect to schedule.
2. Tabs: Announcements (list + CRUD with `AnnouncementFormDialog`) | Members (list + add/remove).
3. Server Actions: `addClubMember`, `removeClubMember`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`.

**Announcements** (`/app/(student)/student/announcements/page.tsx`):

1. Toggle: Calendar (react-big-calendar) | List view.
2. All upcoming `club_announcements` with club name, sign-up count, user's signup status. **Any student can sign up for any club's event** (events are university-wide).
3. Sign Up / Cancel → Server Action `toggleSignup(announcementId)`: upsert or delete `event_signups` row; revalidate schedule path.

**Profile** (`/app/(student)/student/profile/page.tsx`): avatar, name, year; `RecommendationCard` list (secondary surface, populated in Phase 8).
- Mini-stats: Average Grade (all subjects), Attendance Rate (%), Club Events Signed Up (total).
- **Change Password** button → same modal pattern as teacher profile.

**Deliverable:** Full student portal; sign-ups appear on schedule; club memberships visible; club head panel works.

---

### Phase 7 — Face-ID Attendance

**Goal:** Reliable client-side face matching for teacher attendance automation.

**Implementation — client-side face-api.js (webcam + fallback upload):**

1. Download face-api.js model files (`ssd_mobilenetv1`, `face_recognition_net`, `face_landmark_68`) → place in `/public/models/`.

2. Create `FaceIdModal` client component (`"use client"` — face-api.js is browser-only):
```typescript
"use client";
import * as faceapi from 'face-api.js';
// Load models on component mount (once per session via module-level flag)
```

3. **Webcam mode** (primary):
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
videoRef.current.srcObject = stream;

// Scanning interval
const interval = setInterval(async () => {
  const canvas = faceapi.createCanvasFromMedia(videoRef.current);
  const detections = await faceapi
    .detectAllFaces(canvas)
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  detections.forEach(d => {
    const match = faceMatcher.findBestMatch(d.descriptor);
    if (match.distance < 0.6) markPresent(match.label); // label = studentId
  });
}, 1000);
```

4. **Fallback (file upload)**:
```typescript
const img = await faceapi.bufferToImage(file);
const detection = await faceapi
  .detectSingleFace(img)
  .withFaceLandmarks()
  .withFaceDescriptor();
const uploadedDescriptor = detection?.descriptor;
```

5. Build `FaceMatcher` from enrolled students' reference descriptors:
```typescript
// For each enrolled student with face_photo_url (skip students without photo):
const studentImg = await loadImageFromSignedUrl(student.face_photo_url);
const studentDetection = await faceapi
  .detectSingleFace(studentImg)
  .withFaceLandmarks()
  .withFaceDescriptor();
// FaceMatcher labels = student UUIDs
const threshold = appConfig.face_match_threshold ?? 0.6; // configurable via app_config
const matcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
```

6. **Descriptor caching:** After first extraction, store each student's 128-d descriptor in `localStorage` keyed by `${studentId}:${face_photo_updated_at}`. On subsequent scans, skip re-download + re-extraction for students whose photo hasn't changed. This reduces a 100-student class from ~100 HTTP requests to near-zero on repeat scans.

7. **Students without face photo** are excluded from face matching and shown in a warning banner: "5 студентов без фото — отметьте вручную". They default to no attendance status (teacher must toggle manually).

8. Result array `[{ studentId, matched, confidence }]` sent to Server Action `applyFaceAttendance(lessonId, results)` — **no image data or descriptors transmitted to server**.

9. Server Action upserts `attendance` rows with `method = 'face_id'`. Teacher can override any result before submitting.

**Configuration:**
```sql
INSERT INTO app_config (key, value) VALUES ('face_match_threshold', '0.6');
-- Admin can tune this in Settings if false positive/negative rate is too high.
```

**Fallback Supabase Edge Function** (`supabase/functions/face-match/`) for future server-side matching using external vision API. Deploy: `supabase functions deploy face-match`.

**Deliverable:** Face-ID auto-marks attendance; descriptor caching; configurable threshold; teacher can review and override all results.

---

### Phase 8 — Recommendation & Risk Alert System

**Goal:** Nightly personalised recommendations surfaced on dashboards.

**Edge Function** (`supabase/functions/recommendations/index.ts`):

```typescript
// Algorithm pseudocode
// ALL rules evaluated per user; top 3 by priority_score kept.
// If no rules fire → no row created (no placeholder "all good" records).

// For each student:
async function computeStudentRecs(supabase, studentId): Recommendation[] {
  const recs: Recommendation[] = [];

  // R-01: Low attendance
  //   SELECT subject_id, attendance_pct FROM v_student_attendance_summary WHERE student_id = X
  if (minAttendancePct < 70) recs.push({ rule_id: 'R-01', category: 'academic', priority_score: 0.9,
    next_action: `Ваша посещаемость по "${worstSubject}" — ${minAttendancePct}%. Обратите внимание.` });

  // R-03: Grade decline
  //   SELECT score, graded_at FROM grades WHERE student_id = X AND score IS NOT NULL
  //   ORDER BY graded_at DESC LIMIT 10 → linear regression slope
  if (gradeTrend < -5) recs.push({ rule_id: 'R-03', category: 'academic', priority_score: 0.8,
    next_action: 'Ваши оценки снижаются. Рекомендуем обратиться к преподавателю.' });

  // R-04: No social activity
  //   SELECT COUNT(*) FROM event_signups WHERE student_id = X AND signed_up_at >= semester_start
  if (socialCount === 0 && daysSinceSemesterStart > 30) recs.push({ rule_id: 'R-04', category: 'social', priority_score: 0.5,
    next_action: 'Вы ещё не записались ни на одно мероприятие клуба.' });

  return recs; // all applicable — sorted & trimmed to top 3 at upsert time
}

// For each teacher:
async function computeTeacherRecs(supabase, teacherId): Recommendation[] {
  const recs: Recommendation[] = [];

  // R-02: Grade entry overdue (> 48h)
  //   SELECT COUNT(*) FROM lessons WHERE teacher_id = X AND ends_at < now() - interval '48h'
  //   AND report_submitted_at IS NULL AND deleted_at IS NULL
  if (overdueCount > 0) recs.push({ rule_id: 'R-02', category: 'academic', priority_score: 0.8,
    next_action: `У вас ${overdueCount} уроков с просроченной сдачей отчёта (>48ч).` });

  // R-05: Pending reports (> 3 unsubmitted)
  if (unsubmittedCount > 3) recs.push({ rule_id: 'R-05', category: 'admin', priority_score: 0.9,
    next_action: `У вас ${unsubmittedCount} незакрытых отчётов по урокам.` });

  return recs;
}

// For admin (single admin user or all admins):
async function computeAdminRecs(supabase): Recommendation[] {
  const recs: Recommendation[] = [];

  // R-06: Unassigned future lessons
  //   SELECT COUNT(*) FROM lessons WHERE teacher_id IS NULL AND starts_at > now() AND deleted_at IS NULL
  if (unassignedCount > 0) recs.push({ rule_id: 'R-06', category: 'admin', priority_score: 0.85,
    next_action: `${unassignedCount} предстоящих уроков без назначенного преподавателя.` });

  return recs;
}

// Upsert: for each user, sort recs by priority_score DESC, keep top 3, UPSERT by (user_id, rule_id).
// Delete recommendations where the rule no longer fires → set resolved_at = now().
```

**Scheduling:**
```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('nightly-recommendations', '0 2 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/recommendations',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
  );
$$);
```

**UI Components:**

1. `RecommendationCard` (`/src/components/recommendations/RecommendationCard.tsx`):
   - Category badge (Академик / Социальное / Административное).
   - Priority colour indicator (red > 0.7, yellow > 0.4, green ≤ 0.4).
   - `next_action` text.
   - "Скрыть" button → Server Action sets `dismissed_at = now()` (card hidden from UI but record retained for analytics).
   - Card auto-disappears when `resolved_at` is set by the next nightly run (underlying metric improved).

2. Shown on:
   - **Student schedule page header** (primary) + profile page (secondary): up to 3 cards.
   - **Teacher lessons page header**: up to 3 banners.
   - **Admin dashboard**: personal admin alerts (e.g., unassigned lessons).

**Admin Risk Dashboard** (`/app/(admin)/admin/risk-dashboard/page.tsx`):

1. KPI row: at-risk students, teachers with overdue reports, avg attendance, club participation rate.
2. **Risk heatmap**: rows = students, columns = [Attendance Risk, Grade Decline, Social Absence], cells colour-coded by priority_score.
3. **Pending Reports** list: teacher name, count, oldest pending date.
4. **Unassigned Lessons** list: subject, date, time — with "Assign Teacher" action button.

**Deliverable:** Up to 3 recommendations per user on all dashboards; admin risk heatmap populated nightly.

---

### Phase 9 — Analytics Dashboard & Audit Log

**Goal:** Admin comprehensive metrics; all mutations audited.

**Audit Log SQL:**

```sql
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (actor_id, action, table_name, record_id, payload)
  VALUES (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    -- record_id: use .id if exists, NULL for junction tables
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

-- Junction tables (no `id` column — record_id will be NULL in audit_log):
CREATE TRIGGER audit_lesson_students
  AFTER INSERT OR DELETE ON lesson_students FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_club_members
  AFTER INSERT OR DELETE ON club_members FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER audit_event_signups
  AFTER INSERT OR DELETE ON event_signups FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

**Analytics** (`/app/(admin)/analytics/page.tsx`):

1. KPI cards: Total Students, Avg Attendance (30d), Avg Grade (30d), Club Events This Month.
2. Attendance by Subject — recharts BarChart.
3. Grade Distribution — recharts BarChart (score buckets 0–20, 21–40, …, 81–100).
4. Social Participation Over Time — recharts LineChart (university-wide sign-ups by month).
5. Unsubmitted Reports table from `v_teacher_report_status`.

**Deliverable:** Analytics charts populated; audit triggers active.

---

### Phase 10 — i18n, Security Audit & Production Deployment

**Goal:** Russian UI, hardened security, live on Vercel.

**i18n:**

1. Configure `next-intl` for App Router.
2. Create `/messages/ru.json` — all UI strings in Russian.
3. Create `/messages/en.json` — English fallback.
4. Wrap root layout with `NextIntlClientProvider`.
5. Replace all inline strings with `t('key')`.

**Security hardening:**

1. Verify RLS on every table: `SELECT tablename FROM pg_tables WHERE schemaname='public'` — all must have `rowsecurity = true`.
2. Rate limit login: Vercel Edge Middleware + `@vercel/kv` — max 10 attempts per IP/minute.
3. All private bucket URLs use signed URLs (1 h). Create server utility `getSignedUrl(bucket, path)`.
4. Security headers in `next.config.ts`:
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
5. Grep for `SERVICE_ROLE_KEY` — must not appear in any client-imported file.

**Performance:**

1. `<Suspense fallback={<Skeleton />}>` around all async server components.
2. Skeleton components: TeachersTable, StudentsTable, Calendar, GradeModal.
3. React Query `staleTime: 60_000` on all client queries.
4. `next/image` for all photos.

**Production deployment:**

1. `supabase db push --linked` — apply all migrations.
2. `supabase functions deploy --project-ref <ref>` — deploy Edge Functions.
3. Set all env vars in Vercel production.
4. Configure Vercel Cron in `vercel.json` for nightly recommendations.

**Smoke test checklist:**
- [ ] Admin login → all CRUD flows (teachers, students, subjects, schedule, clubs)
- [ ] Create lesson series → verify instances in DB
- [ ] Create overlapping lesson for same teacher → conflict error shown
- [ ] Soft-delete teacher → future lessons flagged as unassigned in admin dashboard
- [ ] Admin reset teacher/student password → user logs in with new password
- [ ] Teacher login → submit report → attendance + grades saved
- [ ] Admin unlock submitted report → teacher can re-edit
- [ ] Face-ID scan → at least 1 student auto-marked present; students without photo shown in warning
- [ ] Student login → schedule shows lessons + club events
- [ ] Student sees "My Clubs" with their memberships
- [ ] Student sign-up → event appears on schedule
- [ ] Club head → create announcement → other student (non-member) signs up
- [ ] Trigger recommendation function manually → up to 3 cards appear on schedule page header
- [ ] Student with multiple issues → sees multiple recommendation cards (not just first match)
- [ ] Admin Risk Dashboard → heatmap populated; unassigned lessons listed
- [ ] Admin impersonation → sees exact student/teacher view with correct data filtering
- [ ] Audit log captures: CRUD, report unlock, lesson_students changes, impersonation start/stop
- [ ] All pages display Russian text correctly; English fallback works
- [ ] Change password flow works for teacher and student

**Deliverable:** Production URL live; all features end-to-end; Russian UI; security checks passed.

---

## 10. Open Questions / Out of Scope

| # | Topic | Decision |
|---|-------|---------|
| 1 | **Face-ID backend** | MVP: client-side face-api.js with descriptor caching. v2: server-side Rekognition/Vision API. |
| 2 | **SMS / OTP** | MVP: phone as username via `phoneToAuthEmail` shim. v2: Supabase Phone Auth + Twilio. |
| 3 | **Push notifications** | Out of scope v1. |
| 4 | **Parent role** | Out of scope v1. |
| 5 | **Admin impersonation** | ✅ **In scope v1** — SuperAdmin can view any user's interface via impersonation mode (Phase 4.5). Uses `getEffectiveUserId()` + admin RLS, not user's RLS. |
| 6 | **Grade weighting** | Equal weight in MVP. Configurable per lesson type in v2. |
| 7 | **Mobile app** | Web-only MVP. React Native reuse in v2. |
| 8 | **Bulk CSV import** | Out of scope v1. |
| 9 | **LMS / 1C integration** | Out of scope. |
| 10 | **Zoom/Meet link per lesson** | Out of scope v1. |
| 11 | **Password recovery** | MVP: admin-only password reset (no self-service). v2: OTP-based self-service via Phone Auth. |
| 12 | **Biometric consent** | MVP: consent notice on first login + optional face photo. v2: formal consent management with opt-in/out tracking. |

---

*End of PRD v2.0 — Academic Performance & Club Management Portal*