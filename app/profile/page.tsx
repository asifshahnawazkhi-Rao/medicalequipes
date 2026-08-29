"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { getStoredSession } from "../auth";
import {
  getProfile,
  getVisitingCardSignedUrl,
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
  const [visitingCardSignedUrl, setVisitingCardSignedUrl] = useState("");
  const [visitingCardFile, setVisitingCardFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const cardGalleryInputRef = useRef<HTMLInputElement>(null);
  const cardCameraInputRef = useRef<HTMLInputElement>(null);

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
        if (profile.visitingCardUrl) {
  getVisitingCardSignedUrl(session, profile.visitingCardUrl)
    .then(setVisitingCardSignedUrl)
    .catch(console.error);
}
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

    if (!file.type.startsWith("image/")) {
      setVisitingCardFile(null);
      event.target.value = "";
      setError(
        "Visiting card must be an image file."
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

if (nextVisitingCardPath) {
  const signedUrl = await getVisitingCardSignedUrl(
    session,
    nextVisitingCardPath
  );

  setVisitingCardSignedUrl(signedUrl);
}

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

          <label>Visiting Card</label>
          <div className="photoPicker">
            <button className="photoPickerButton" type="button" onClick={() => setCardPickerOpen((open) => !open)}>Choose File <span>▾</span></button>
            {cardPickerOpen && <div className="photoPickerMenu"><button type="button" onClick={() => { setCardPickerOpen(false); cardCameraInputRef.current?.click(); }}><strong>📷 Take Photo</strong><small>Open your phone camera</small></button><button type="button" onClick={() => { setCardPickerOpen(false); cardGalleryInputRef.current?.click(); }}><strong>▧ Choose from Gallery</strong><small>Select an existing card image</small></button></div>}
            <input ref={cardCameraInputRef} className="visuallyHiddenFile" type="file" accept="image/*" capture="environment" onChange={chooseVisitingCard} />
            <input ref={cardGalleryInputRef} className="visuallyHiddenFile" type="file" accept="image/*" onChange={chooseVisitingCard} />
          </div>

          <small>
            Choose or take an image up to 5 MB.
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

{visitingCardSignedUrl && (
  <div className="visitingCardPreview">
    <a
      href={visitingCardSignedUrl}
      target="_blank"
      rel="noreferrer"
    >
      View Visiting Card
    </a>

    {/\.(jpg|jpeg|png|jfif)$/i.test(visitingCardPath) && (
      <img
        src={visitingCardSignedUrl}
        alt="Visiting card"
        style={{
          width: "100%",
          maxHeight: "260px",
          objectFit: "contain",
          marginTop: "12px",
          borderRadius: "10px",
          border: "1px solid #dfe7eb",
        }}
      />
    )}
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

