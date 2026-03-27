import { NextResponse } from "next/server";

/**
 * Vercel Cron handler — triggers the Supabase Edge Function for recommendations.
 * Schedule: daily at 02:00 UTC (configured in vercel.json).
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing environment variables" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/recommendations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to trigger recommendations", details: String(error) },
      { status: 500 }
    );
  }
}
