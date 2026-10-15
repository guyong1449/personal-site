export function studioParentOrigin(): string | null {
  if (process.env.NODE_ENV !== "development" || window.parent === window) return null;
  try {
    const parent = new URL(document.referrer);
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(parent.hostname);
    // Cross-origin iframe referrers contain only the origin by default.
    return local &&
      (parent.port === "4319" || parent.origin === window.location.origin) ? parent.origin : null;
  } catch { return null; }
}
