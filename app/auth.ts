export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
  };
};

const sessionKey = "medicalequipes.auth.session";
const cookieName = "me-access-token";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

async function authRequest<T>(
  path: string,
  body: Record<string, unknown>
) {
  const { url, key } = getSupabaseConfig();

  const response = await fetch(
    `${url}/auth/v1/${path}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const message =
      data.msg ||
      data.message ||
      data.error_description ||
      "Authentication request failed";

    throw new Error(message);
  }

  return data as T;
}

export function signInWithPassword(
  email: string,
  password: string
) {
  return authRequest<AuthSession>(
    "token?grant_type=password",
    {
      email,
      password,
    }
  );
}

export function signUpWithPassword(
  email: string,
  password: string
) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : undefined;

  return authRequest<AuthSession>(
    "signup",
    {
      email,
      password,
      options: {
        email_redirect_to: redirectTo,
      },
    }
  );
}

export function sendPasswordReset(email: string) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;

  return authRequest<{ message?: string }>(
    "recover",
    {
      email,
      redirect_to: redirectTo,
    }
  );
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    sessionKey,
    JSON.stringify(session)
  );

  document.cookie =
    `${cookieName}=${session.access_token}; ` +
    `path=/; ` +
    `max-age=${session.expires_in ?? 3600}; ` +
    `SameSite=Lax; secure`;
}

export function clearSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(sessionKey);

  document.cookie =
    `${cookieName}=; ` +
    `path=/; ` +
    `max-age=0; ` +
    `SameSite=Lax; secure`;
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw =
    window.localStorage.getItem(sessionKey);

  if (!raw) {
    return null;
  }

  try {
    const session =
      JSON.parse(raw) as AuthSession;

    if (!session?.access_token) {
      clearSession();
      return null;
    }

    try {
      const payloadPart =
        session.access_token.split(".")[1];

      if (payloadPart) {
        let normalized = payloadPart
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        while (normalized.length % 4 !== 0) {
          normalized += "=";
        }

        const payload = JSON.parse(
          window.atob(normalized)
        ) as {
          exp?: number;
        };

        if (
          payload.exp &&
          Date.now() >= payload.exp * 1000
        ) {
          clearSession();
          return null;
        }
      }
    } catch {
      // JWT decode fail ho to stored session ko
      // normal Supabase requests validate karne den.
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}
