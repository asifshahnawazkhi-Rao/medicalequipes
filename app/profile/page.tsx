"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { getStoredSession } from "../auth";
import {
  getProfile,
  updateProfile,
  uploadVisitingCard,
} from "../supabaseData";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [visitingCardPath, setVisitingCardPath] = useState("");
  const [visitingCardFile, setVisitingCardFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setBusinessName(profile.businessName);
        setCity(profile.city);
        setRole(profile.role);
        setStatus(profile.status);
        setVisitingCardPath(profile.visitingCardUrl);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load profile."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function chooseVisitingCard(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setVisitingCardFile(null);
      return;
    }

    setError("");
    setMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setVisitingCardFile(null);
      event.target.value = "";
      setError(
        "Visiting card must be a JPG, PNG or PDF file."
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setVisitingCardFile(null);
      event.target.value = "";
      setError(
        "Visiting card file must be smaller than 5 MB."
      );
      return;
    }

    setVisitingCardFile(file);
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
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
      let nextVisitingCardPath = visitingCardPath;

      if (visitingCardFile) {
        setMessage("Uploading visiting card...");

        const uploaded = await uploadVisitingCard(
          session,
          visitingCardFile
        );

        nextVisitingCardPath = uploaded.path;
      }

      setMessage("Saving profile...");

      await updateProfile(session, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        city: city.trim(),
        visitingCardUrl: nextVisitingCardPath,
      });

      setVisitingCardPath(nextVisitingCardPath);
      setVisitingCardFile(null);

      setMessage("Profile saved successfully.");
    } catch (err) {
      setMessage("");
      setError(
        err instanceof Error
          ? err.message
          : "Could not save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboardPage">
        Loading profile...
      </main>
    );
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

        <p>
          Complete your business and contact details for
          your marketplace profile.
        </p>

        <form className="authForm" onSubmit={submit}>
          <label>
            Full name
            <input
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              required
              placeholder="Your full name"
            />
          </label>

          <label>
            Business name
            <input
              value={businessName}
              onChange={(event) =>
                setBusinessName(event.target.value)
              }
              placeholder="Business / dealer name"
            />
          </label>

          <label>
            Phone / WhatsApp
            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              required
              placeholder="+92..."
            />
          </label>

          <label>
            City
            <input
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              required
              placeholder="Karachi, Lahore, Islamabad..."
            />
          </label>

          <label>
            Email
            <input value={email} disabled />
          </label>

          <label>
            Visiting Card
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={chooseVisitingCard}
            />
          </label>

          <small>
            JPG, PNG or PDF. Maximum file size 5 MB.
          </small>

          {visitingCardFile && (
            <div className="authMessage">
              Selected: {visitingCardFile.name}
            </div>
          )}

          {!visitingCardFile && visitingCardPath && (
            <div className="authMessage">
              ✓ Visiting card already uploaded
            </div>
          )}

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
            <div
              className="authMessage"
              role="status"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              className="formError"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="primary"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              window.location.assign("/dashboard")
            }
          >
            Back to Dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
