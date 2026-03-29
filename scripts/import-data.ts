/**
 * Import KBTU dataset into Supabase.
 *
 * Usage: npx tsx scripts/import-data.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as path from "path";
import * as dotenv from "dotenv";

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "qweasdqwe123";
const BATCH_SIZE = 20; // concurrent requests per batch
const DELAY_MS = 500; // delay between batches to avoid rate limits

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Read Excel ────────────────────────────────────────────
const wb = XLSX.readFile(path.resolve(__dirname, "../KBTU_CVM_Full_Dataset.xlsx"));
const ws = wb.Sheets["KBTU Student Dataset"];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

// Headers are row index 1, data starts at index 2
// Col 0: Student ID, 1: Full Name, 2: Email, 3: Faculty, 4: Year of Study
// Col 10: GPA (4.0 Scale), 11: Attendance %

interface StudentRow {
  studentId: string;
  fullName: string;
  email: string;
  faculty: string;
  courseYear: number;
  gpa: number;
  attendancePct: number;
}

// ─── Parse & Deduplicate ──────────────────────────────────
const seenEmails = new Set<string>();
const students: StudentRow[] = [];
const faculties = new Set<string>();

for (let i = 2; i < rawData.length; i++) {
  const row = rawData[i];
  const email = row[2] as string | undefined;
  const fullName = row[1] as string | undefined;
  const faculty = row[3] as string | undefined;
  const year = row[4] as number | undefined;

  if (!email || !fullName) continue;

  const emailLower = email.trim().toLowerCase();
  if (seenEmails.has(emailLower)) continue;
  seenEmails.add(emailLower);

  // Cap course_year at 6
  const courseYear = Math.min(Math.max(year ?? 1, 1), 6);

  if (faculty) faculties.add(faculty);

  students.push({
    studentId: row[0] as string,
    fullName: fullName.trim(),
    email: emailLower,
    faculty: faculty ?? "",
    courseYear,
    gpa: (row[10] as number) ?? 0,
    attendancePct: (row[11] as number) ?? 0,
  });
}

console.log(`\n📊 Parsed ${students.length} unique students from ${rawData.length - 2} rows`);
console.log(`📚 ${faculties.size} faculties found\n`);

// ─── Helpers ──────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processBatch<T>(
  items: T[],
  batchSize: number,
  delayMs: number,
  fn: (item: T, index: number) => Promise<void>
) {
  let processed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item, j) => fn(item, i + j)));
    processed += batch.length;
    const pct = ((processed / items.length) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${processed}/${items.length} (${pct}%)`);
    if (i + batchSize < items.length) await sleep(delayMs);
  }
  console.log(""); // newline
}

// ─── Step 1: Insert Faculties ─────────────────────────────
async function insertFaculties() {
  console.log("1️⃣  Inserting faculties...");
  const facultyList = [...faculties].sort();

  for (const name of facultyList) {
    const { error } = await supabase
      .from("faculties")
      .upsert({ name }, { onConflict: "name" });
    if (error) console.error(`  ❌ Faculty "${name}": ${error.message}`);
  }

  // Fetch back with IDs
  const { data } = await supabase
    .from("faculties")
    .select("id, name")
    .is("deleted_at", null);

  const map = new Map<string, string>();
  for (const f of data ?? []) map.set(f.name, f.id);
  console.log(`  ✅ ${map.size} faculties ready\n`);
  return map;
}

// ─── Step 2: Create Auth Users + public.users rows ────────
async function importStudents(facultyMap: Map<string, string>) {
  console.log(`2️⃣  Creating ${students.length} student accounts...`);
  console.log(`   (batch size: ${BATCH_SIZE}, delay: ${DELAY_MS}ms)\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  await processBatch(students, BATCH_SIZE, DELAY_MS, async (s) => {
    try {
      // Create auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: s.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          email: s.email,
          full_name: s.fullName,
          role: "student",
          course_year: s.courseYear,
        },
      });

      if (error) {
        if (error.message.includes("already been registered")) {
          skipped++;
        } else {
          errors++;
          if (errors <= 10) console.error(`\n  ❌ ${s.email}: ${error.message}`);
        }
        return;
      }

      // Update faculty_id in public.users (trigger already created the row)
      const facultyId = facultyMap.get(s.faculty) ?? null;
      if (facultyId) {
        await supabase
          .from("users")
          .update({ faculty_id: facultyId })
          .eq("id", data.user.id);
      }

      created++;
    } catch (err) {
      errors++;
      if (errors <= 10) console.error(`\n  ❌ ${s.email}: ${err}`);
    }
  });

  console.log(`\n  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped (already exist): ${skipped}`);
  if (errors > 0) console.log(`  ❌ Errors: ${errors}`);
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  KBTU Dataset Import");
  console.log("═══════════════════════════════════════════");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Students: ${students.length}`);
  console.log(`  Faculties: ${faculties.size}`);
  console.log("═══════════════════════════════════════════\n");

  const facultyMap = await insertFaculties();
  await importStudents(facultyMap);

  console.log("\n✅ Import complete!");
}

main().catch(console.error);
