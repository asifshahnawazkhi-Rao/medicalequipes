"use client";

import { FormEvent, useEffect, useState } from "react";
import { saveSession, sendPasswordReset, signInWithPassword, signUpWithPassword } from "./auth";

type Mode = "login" | "signup" | "forgot";

export default function AuthModal({
  open,
  onClose,
  onLoginSuccess,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setMessage("");
    }
  }, [initialMode, open]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "forgot") {
        if (!identifier.includes("@")) {
          throw new Error("Password reset currently requires your email address.");
        }
        await sendPasswordReset(identifier);
        setMessage("Password reset email sent. Please check your inbox.");
        return;
      }

      const session = mode === "login" ? await signInWithPassword(identifier, password) : await signUpWithPassword(identifier, password);

    if (session.access_token) {
  saveSession(session);
  onClose();
  onLoginSuccess?.();
  return;
}

      setMessage("Check your email to confirm your account before logging in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={onClose}>
      <div className="authModal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modalClose" type="button" onClick={onClose} aria-label="Close login modal">×</button>
        <h2 id="auth-title">{mode === "login" ? "Login" : mode === "signup" ? "Create account" : "Reset password"}</h2>
        <p>{mode === "forgot" ? "Enter your email and we will send reset instructions." : mode === "signup" ? "Create your account with an email or WhatsApp number." : "Login with your email or WhatsApp number."}</p>
        <form className="authForm" onSubmit={submit}>
          <label>{mode === "forgot" ? "Email" : "Email or WhatsApp number"}<input type={mode === "forgot" ? "email" : "text"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete={mode === "forgot" ? "email" : "username"} inputMode={mode === "forgot" ? "email" : "text"} placeholder={mode === "forgot" ? "you@example.com" : "you@example.com or 03XX XXXXXXX"} /></label>
          {mode !== "forgot" && <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
          {message && <div className="authMessage" role="status">{message}</div>}
          <button className="primary authSubmit" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : mode === "signup" ? "Sign up" : "Send reset email"}</button>
        </form>
        <div className="authLinks">
          {mode !== "login" && <button type="button" onClick={() => setMode("login")}>Back to login</button>}
          {mode !== "signup" && <button type="button" onClick={() => setMode("signup")}>Sign up</button>}
          {mode !== "forgot" && <button type="button" onClick={() => setMode("forgot")}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}

