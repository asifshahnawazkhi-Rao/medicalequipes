export function getStoredSession() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(sessionKey);

  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;

    if (!session?.access_token) {
      clearSession();
      return null;
    }

    // Read expiry directly from Supabase JWT
    try {
      const payloadPart = session.access_token.split(".")[1];

      if (payloadPart) {
        const normalized = payloadPart
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        const payload = JSON.parse(
          window.atob(normalized)
        ) as { exp?: number };

        if (
          payload.exp &&
          Date.now() >= payload.exp * 1000
        ) {
          clearSession();
          return null;
        }
      }
    } catch {
      // If JWT cannot be decoded, let normal auth requests validate it.
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}
