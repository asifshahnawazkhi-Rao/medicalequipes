"use client";

import { FormEvent, useState } from "react";
import { saveSession, sendPasswordReset, signInWithPassword, signUpWithPassword } from "./auth";

type Mode = "login" | "signup" | "forgot";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "forgot") {
        await sendPasswordReset(email);
        setMessage("Password reset email sent. Please check your inbox.");
        return;
      }

      const session = mode === "login" ? await signInWithPassword(email, password) : await signUpWithPassword(email, password);

     if (session.access_token) {
  saveSession(session);
  onClose();
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
        <p>{mode === "forgot" ? "Enter your email and we will send reset instructions." : "Access your MedicalEquipes dashboard."}</p>
        <form className="authForm" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
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
