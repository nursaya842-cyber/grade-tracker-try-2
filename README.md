# KBTU CVM — Student Management System

University portal for KBTU: lesson scheduling, attendance (incl. face recognition), grading, clubs, and AI-driven student recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, server actions) |
| Language | TypeScript 5 |
| UI | Ant Design 5 + Tailwind CSS |
| Charts | Recharts |
| Calendar | react-big-calendar |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, role in `user_metadata`) |
| Storage | Supabase Storage (3 buckets) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Cron | Vercel Cron Jobs |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Face ID | face-api.js (SSD MobileNet, descriptor caching in localStorage) |
| Date utils | date-fns |
| Excel | xlsx |
| Image compression | browser-image-compression |
| State | TanStack React Query 5 |
| Validation | Zod |

---

## External Services

- **Supabase** - database, auth, storage, edge functions, RLS policies
- **Google Gemini API** — generates recommendation text (via `GEMINI_API_KEY`)
- **Vercel** — hosting + cron trigger (`/api/cron/recommendations` runs daily at 05:00 UTC)

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | All users (admin / teacher / student / parent). Role in column + auth metadata. |
| `subjects` | Academic subjects. Soft-deletable. |
| `lesson_series` | Recurring lesson configs (`recurrence_rule` JSONB: days + time slots). |
| `lessons` | Individual lesson instances with `starts_at`, `ends_at`, `report_submitted_at`. |
| `lesson_students` | Enrollment junction (lesson ↔ student). |
| `attendance` | Per-lesson per-student (`present`/`absent`, `method`: manual or face_id). |
| `grades` | Per-lesson per-student scores (0–100). GPA computed from these at read time. |
| `clubs` | Student clubs with `head_student_id`. |
| `club_members` | Club membership junction. |
| `club_announcements` | Club events (title, venue, dates, photo). |
| `event_signups` | Student sign-ups for club events. |
| `recommendations` | AI-generated recommendations with `priority_score`, `category`, `rule_id`, `dismissed_at`, `resolved_at`. |
| `student_checkins` | Weekly self-assessment (stress, motivation, workload — 1–10 scale). |
| `app_config` | KV config store (`semester_start`, `face_match_threshold`). |
| `audit_log` | Log of CREATE/UPDATE/DELETE actions. |

**Views:**
- `v_student_attendance_summary` — attendance % per student per subject
- `v_teacher_report_status` — unsubmitted reports per teacher

**Storage buckets:** `student-photos`, `diplomas`, `club-photos`

---

## Roles & Access

| Role | What they can do |
|---|---|
| **admin** | Full CRUD on all entities. Impersonation. Analytics. Risk dashboard. |
| **teacher** | Own lessons only. Mark attendance + grades. Submit reports. View enrolled students. |
| **student** | Own schedule, grades, attendance. Join clubs. Sign up for events. Weekly check-in. |
| **parent** | View linked children's grades, attendance, and recommendations (read-only). |

RLS policies enforce row-level isolation at the database for every role.

---

## Project Structure

```
src/
  app/
    (auth)/login/              # Login page
    auth/callback/             # Supabase OAuth redirect handler
    (admin)/admin/             # Admin panel (students, teachers, schedule, clubs, analytics, risk)
    (teacher)/teacher/         # Lesson list, lesson detail, student list, profile
    (student)/student/         # Schedule, clubs, announcements, profile
    (parent)/parent/           # Children list, child detail, profile
    api/cron/recommendations/  # Vercel cron -> Edge Function trigger
  components/
    face-id/FaceIdModal.tsx    # Webcam + upload face recognition UI
    recommendations/           # RecommendationCard, list, server actions
  lib/
    supabase/                  # client.ts, server.ts, middleware.ts, signed-url.ts
    engagement.ts              # Engagement score formula
    gemini.ts                  # Gemini API wrapper
    impersonation.ts           # Admin impersonation via cookies
    utils.ts                   # calculateGpa, scoreToLetter, formatDate
supabase/
  functions/recommendations/   # Deno edge function — recommendation rules engine
  migrations/                  # Full schema SQL
```

---

## Key Data Flows

**Login:** email/password -> Supabase Auth -> JWT with role -> redirect to role dashboard.

**Lesson lifecycle:**
1. Admin creates `lesson_series` with recurrence rule -> individual `lessons` generated
2. Students enrolled via `lesson_students`
3. Teacher marks attendance + enters grades per lesson
4. Teacher submits report (`report_submitted_at` set) -> lesson locked

**GPA:** computed on read via `scoreToGpa()` (100-pt -> 4.0 scale). Not stored.

**Engagement score:** `0.35×attendance + 0.30×gpa + 0.20×clubs + 0.15×checkin` -> 0–100
Segments: `at-risk` / `declining` / `stable` / `excellent`

**Recommendations:**
- Daily cron triggers Edge Function -> rules engine evaluates every student
- Also triggered on-demand when a student profile is opened (24h freshness check)
- Rules: low attendance (R-01), weak subject (R-03), no club (R-04), low social activity (R-07), etc.
- Output: `recommendations` rows with `priority_score`, `category`, `title`, `action`, `deadline`

**Face ID attendance:**
1. Teacher opens FaceIdModal
2. face-api.js loads models from `/public/models`
3. Builds `FaceMatcher` from student photos (descriptors cached in localStorage)
4. Webcam stream or uploaded photo -> faces detected -> matched to student IDs
5. Results applied as attendance records

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
CRON_SECRET=
```

## Dev

```bash
pnpm dev      # start dev server
pnpm build    # production build
pnpm lint     # ESLint
```
