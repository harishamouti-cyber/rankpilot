/**
 * Safe JSON parser utility that prevents unhandled runtime exceptions
 * from invalid or corrupted JSON payloads.
 */
export function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== "string") {
    return fallback;
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}
