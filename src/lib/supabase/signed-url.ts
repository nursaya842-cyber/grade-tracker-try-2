import { createClient } from "./server";

/**
 * Get a signed URL for a private storage bucket.
 * Used for: diplomas, student-photos.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`Signed URL error [${bucket}/${path}]:`, error.message);
    return null;
  }
  return data.signedUrl;
}
