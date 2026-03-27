/**
 * Seed admin user.
 * Run with: npx tsx scripts/seed-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const phone = "87772000000";
  const password = "Anar&@2005";
  const email = `${phone}@university.local`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      phone,
      full_name: "Super Admin",
      role: "admin",
    },
  });

  if (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }

  console.log("Admin user created successfully!");
  console.log("  Phone:", phone);
  console.log("  Password:", password);
  console.log("  User ID:", data.user.id);
}

main();
