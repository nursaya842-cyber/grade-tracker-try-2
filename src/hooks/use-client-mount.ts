import { useState, useEffect } from "react";

/**
 * Returns true only after client-side hydration completes.
 * Use with Ant Design Modal's forceRender to avoid SSR hydration mismatch.
 */
export function useClientMount(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
