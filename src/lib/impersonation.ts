import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";

const COOKIE_NAME = "impersonate_id";

export function getImpersonatedId(cookieStore: ReadonlyRequestCookies): string | null {
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function getEffectiveUserId(cookieStore: ReadonlyRequestCookies, authUid: string): string {
  const impersonatedId = getImpersonatedId(cookieStore);
  return impersonatedId ?? authUid;
}

/**
 * Get impersonated user ID from server component context.
 * Returns null if not impersonating.
 */
export async function getImpersonatedIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Get the effective user ID (impersonated if active, else auth uid).
 */
export async function getEffectiveUserIdFromCookies(authUid: string): Promise<string> {
  const impersonatedId = await getImpersonatedIdFromCookies();
  return impersonatedId ?? authUid;
}
