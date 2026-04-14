import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Guard against cookie bloat (HTTP 431)
  const allCookies = request.cookies.getAll();
  const cookieHeaderSize = allCookies.reduce(
    (sum, c) => sum + c.name.length + c.value.length + 4, 0
  );
  if (cookieHeaderSize > 16000) {
    // Too many cookies — clear stale Supabase chunks and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    for (const c of allCookies) {
      if (c.name.startsWith("sb-")) {
        response.cookies.delete(c.name);
      }
    }
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do NOT add code between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return supabaseResponse;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Get role from JWT user_metadata — avoids all RLS issues
  const realRole = (user.user_metadata?.role as string) ?? null;

  if (!realRole) {
    // No role in metadata — something is wrong, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Impersonation: admin can access teacher/student routes
  const impersonateId = request.cookies.get("impersonate_id")?.value;
  let effectiveRole = realRole;

  if (impersonateId && realRole === "admin") {
    // For impersonation we need to query the DB for target user's role
    // Use service role client to bypass RLS
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: impersonated } = await serviceClient
      .from("users")
      .select("role")
      .eq("id", impersonateId)
      .single();
    if (impersonated) {
      effectiveRole = impersonated.role;
    }
  }

  // Role-based route protection
  if (pathname.startsWith("/admin") && realRole !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = realRole === "teacher" ? "/teacher/lessons" : realRole === "parent" ? "/parent/children" : "/student/schedule";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/teacher")) {
    const allowed = realRole === "admin" || effectiveRole === "teacher";
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = realRole === "student" ? "/student/schedule" : realRole === "parent" ? "/parent/children" : "/admin";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/student")) {
    const allowed = realRole === "admin" || effectiveRole === "student";
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = realRole === "teacher" ? "/teacher/lessons" : realRole === "parent" ? "/parent/children" : "/admin";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/parent")) {
    const allowed = realRole === "admin" || realRole === "parent";
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = realRole === "teacher" ? "/teacher/lessons" : realRole === "student" ? "/student/schedule" : "/admin";
      return NextResponse.redirect(url);
    }
  }

  // Root redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (realRole === "admin") url.pathname = "/admin";
    else if (realRole === "teacher") url.pathname = "/teacher/lessons";
    else if (realRole === "parent") url.pathname = "/parent/children";
    else url.pathname = "/student/schedule";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
