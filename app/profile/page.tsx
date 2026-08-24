"use client";

import { FormEvent, useEffect, useState } from "react";
import { getStoredSession } from "../auth";
import { getProfile, updateProfile } from "../supabaseData";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
const [businessName, setBusinessName] = useState("");
const [city, setCity] = useState("");
  useEffect(() => {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    setEmail(session.user?.email ?? "");

    getProfile(session)
      .then((profile) => {
        if (!profile) return;

        setFullName(profile.fullName);
        setPhone(profile.phone);
        setRole(profile.role);
        setStatus(profile.status);
        setBusinessName(profile.businessName);
setCity(profile.city);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await updateProfile(session, {
  fullName: fullName.trim(),
  phone: phone.trim(),
  businessName: businessName.trim(),
  city: city.trim(),
});

      setMessage("Profile saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="dashboardPage">Loading profile...</main>;
  }

  return (
    <main className="dashboardPage">
      <section className="dashboardCard">
        <div className="brand">
          <span className="brandMark">+</span>
          <span>
            Medical<span>Equipes</span>
          </span>
        </div>

        <h1>Seller Profile</h1>
        <p>Complete your contact details for your marketplace listings.</p>

        <form className="authForm" onSubmit={submit}>
          <label>
            Full name / Business name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              placeholder="Your name or business name"
            />
          </label>

          <label>
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="+92..."
            />
          </label>
<label>
  Business name
  <input
    value={businessName}
    onChange={(event) => setBusinessName(event.target.value)}
    placeholder="Business / dealer name"
  />
</label>

<label>
  City
  <input
    value={city}
    onChange={(event) => setCity(event.target.value)}
    placeholder="Karachi, Lahore, Islamabad..."
  />
</label>
          <label>
            Email
            <input value={email} disabled />
          </label>

          {role && (
            <p>
              <strong>Role:</strong> {role}
            </p>
          )}

          {status && (
            <p>
              <strong>Status:</strong> {status}
            </p>
          )}

          {message && (
            <div className="authMessage" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="formError" role="alert">
              {error}
            </div>
          )}

          <button className="primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/dashboard")}
          >
            Back to Dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
