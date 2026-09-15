/** Normalize Admin/HR payload: MySQL/MariaDB sometimes returns JSON columns as strings. */
export function normalizePayload(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  let value: unknown = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      value = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  // Handle accidental double-encoding
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
