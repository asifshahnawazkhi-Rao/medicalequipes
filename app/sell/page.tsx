"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getStoredSession, type AuthSession } from "../auth";
import {
  createListing,
  getCategories,
  getProfile,
  saveListingImages,
  uploadListingImage,
  type CategoryOption,
} from "../supabaseData";

const conditions = ["New", "Like New", "Used", "Refurbished", "Demo"];
const fallbackCategories = ["Diagnostic Equipment", "Surgical Equipment", "Patient Care", "Laboratory Equipment", "Imaging Equipment", "Dental Equipment"];
const maxFileSize = 5 * 1024 * 1024;
const maxFiles = 8;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

function SelectedPhoto({
  file,
  index,
  onEdit,
  onRemove,
}: {
  file: File;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <article className="selectedPhoto">
      {previewUrl && <img src={previewUrl} alt={`Selected equipment photo ${index + 1}`} />}
      <div className="selectedPhotoInfo">
        <span>{file.name}</span>
        <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
      </div>
      <div className="selectedPhotoActions">
        <button type="button" className="photoEditButton" onClick={onEdit}>Crop / Fix</button>
        <button type="button" onClick={onRemove}>Remove</button>
      </div>
    </article>
  );
}


export default function SellEquipmentPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [checkingApproval, setCheckingApproval] = useState(true);
const [sellerApproved, setSellerApproved] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPreview, setEditingPreview] = useState("");
  const [editRotation, setEditRotation] = useState(0);
  const [editZoom, setEditZoom] = useState(1);
  const [editOffsetX, setEditOffsetX] = useState(0);
  const [editOffsetY, setEditOffsetY] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (editingIndex === null || !files[editingIndex]) {
      setEditingPreview("");
      return;
    }

    const url = URL.createObjectURL(files[editingIndex]);
    setEditingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [editingIndex, files]);

  useEffect(() => {
  const stored = getStoredSession();

  if (!stored?.access_token) {
    window.location.replace("/");
    return;
  }

  // TypeScript ke liye confirmed non-null session
  const authenticatedSession: AuthSession = stored;

  async function loadSeller() {
    try {
      const profile = await getProfile(
        authenticatedSession
      );

      if (!profile) {
        setError(
          "Please complete your seller profile before listing equipment."
        );
        return;
      }

      const approved =
        profile.status.toLowerCase() === "approved";

      setSellerApproved(approved);

      if (!approved) {
        setError(
          "Your seller account is pending approval. You can publish equipment after admin approval."
        );
        return;
      }

      setSession(authenticatedSession);

      const categoryRows = await getCategories(
        authenticatedSession
      );

      setCategories(categoryRows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not verify seller approval."
      );
    } finally {
      setCheckingApproval(false);
    }
  }

  loadSeller();
}, []);

  const categoryOptions = useMemo(() => categories, [categories]);

  function onFilesSelected(selected: FileList | null) {
    setError("");
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, maxFiles);
    const invalid = next.find((file) => !allowedTypes.includes(file.type) || file.size > maxFileSize);
    if (invalid) {
      setError(`${invalid.name} must be a JPG, PNG, or WebP image up to 5MB.`);
      return;
    }
    setFiles(next);
  }

  function openImageEditor(index: number) {
    setEditingIndex(index);
    setEditRotation(0);
    setEditZoom(1);
    setEditOffsetX(0);
    setEditOffsetY(0);
  }

  function closeImageEditor() {
    if (editSaving) return;
    setEditingIndex(null);
  }

  async function saveImageEdit() {
    if (editingIndex === null || !editingPreview) return;

    try {
      setEditSaving(true);
      setError("");

      const image = new Image();
      image.src = editingPreview;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image editor could not start.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const radians = (editRotation * Math.PI) / 180;
      const quarterTurn = Math.abs(editRotation % 180) === 90;
      const rotatedWidth = quarterTurn ? image.height : image.width;
      const rotatedHeight = quarterTurn ? image.width : image.height;
      const scale = Math.max(
        canvas.width / rotatedWidth,
        canvas.height / rotatedHeight
      ) * editZoom;

      context.translate(
        canvas.width / 2 + (editOffsetX / 100) * canvas.width * 0.22,
        canvas.height / 2 + (editOffsetY / 100) * canvas.height * 0.22
      );
      context.rotate(radians);
      context.drawImage(
        image,
        (-image.width * scale) / 2,
        (-image.height * scale) / 2,
        image.width * scale,
        image.height * scale
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Could not save edited image.")),
          "image/jpeg",
          0.9
        );
      });

      const original = files[editingIndex];
      const editedName = `${original.name.replace(/\.[^.]+$/, "")}-edited.jpg`;
      const editedFile = new File([blob], editedName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      setFiles((current) =>
        current.map((file, index) => index === editingIndex ? editedFile : file)
      );
      setEditingIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not edit image.");
    } finally {
      setEditSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

if (!session || !sellerApproved) {
  setError(
    "Your seller account must be approved before publishing equipment."
  );
  return;
}
    setLoading(true);
    setError("");
    setMessage("");
    setProgress(5);

    try {
      const form = new FormData(event.currentTarget);
      const values = Object.fromEntries(form.entries()) as Record<string, string>;
      if (!values.title?.trim() || !values.categoryId || !values.condition || !values.price || !values.city?.trim() || !values.description?.trim()) {
        throw new Error("Please complete all required listing fields.");
      }
      if (Number(values.price) <= 0) throw new Error("Price must be greater than zero.");
      if (!files.length) throw new Error("Please upload at least one equipment image.");

      setMessage("Creating listing...");
      const listing = await createListing(session, values);
      if (!listing?.id) throw new Error("Listing was created without an id response.");
      setProgress(20);

      const uploaded = [];
      for (const [index, file] of files.entries()) {
        setMessage(`Uploading image ${index + 1} of ${files.length}...`);
        uploaded.push(await uploadListingImage(session, listing.id, file));
        setProgress(20 + Math.round(((index + 1) / files.length) * 65));
      }

      setMessage("Saving image records...");
      await saveListingImages(session, listing.id, uploaded);
      setProgress(100);
      setMessage("Listing published successfully. Redirecting to your dashboard...");
      window.setTimeout(() => {
        window.location.assign(`/dashboard?created=${encodeURIComponent(listing.id)}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
      setMessage("");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }
if (checkingApproval) {
  return (
    <main className="sellPage">
      <div className="container">
        <div className="dashboardEmpty">
          Checking seller approval...
        </div>
      </div>
    </main>
  );
}

if (!sellerApproved) {
  return (
    <main className="sellPage">
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            <span className="brandMark">+</span>
            <span>
              Medical<span>Equipes</span>
            </span>
          </Link>
        </div>
      </header>

      <section className="container sellFormWrap">
        <div className="dashboardEmpty">
          <span className="eyebrow">
            SELLER APPROVAL
          </span>

          <h1>Seller approval required</h1>

          <p>
            Your seller account is pending approval.
            Complete your profile and upload your Visiting Card.
            After admin approval you will be able to publish equipment.
          </p>

          <button
            className="primary"
            type="button"
            onClick={() =>
              window.location.assign("/profile")
            }
          >
            Complete Seller Profile
          </button>

          <button
            type="button"
            onClick={() =>
              window.location.assign("/dashboard")
            }
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
  return (
    <main className="sellPage">
      <header className="header"><div className="container nav"><Link className="brand" href="/"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></Link><nav><Link href="/#categories">Categories</Link><Link href="/#listings">Buy</Link><Link href="/dashboard">Dashboard</Link></nav></div></header>
      <section className="sellHero"><div className="container"><span className="eyebrow">SELLER MARKETPLACE</span><h1>List medical equipment professionally</h1><p>Create a verified marketplace listing with specifications, pricing, location, and equipment photos.</p></div></section>
      <section className="container sellFormWrap">
        <form className="sellForm" onSubmit={submit}>
          <div className="formSection"><h2>Equipment details</h2><div className="formGrid"><label>Equipment title *<input name="title" required placeholder="e.g. GE Voluson E10 Ultrasound" /></label><label>Category *<select name="categoryId" required><option value="">Select category</option>{categoryOptions.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label><label>Brand<input name="brand" placeholder="GE, Mindray, Dräger" /></label><label>Model<input name="model" placeholder="Model number/name" /></label><label>Condition *<select name="condition" required><option value="">Select condition</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label><label>Price (PKR) *<input name="price" type="number" min="1" step="1" required placeholder="1250000" /></label><label>Location / city *<input name="city" required placeholder="Karachi" /></label><label>Contact name<input name="contactName" placeholder="Seller or business name" /></label><label>Contact email<input name="contactEmail" type="email" placeholder="sales@example.com" /></label><label>Contact phone<input name="contactPhone" placeholder="+92..." /></label></div><label>Description *<textarea name="description" required rows={7} placeholder="Describe specifications, age, warranty, included accessories, service history, and pickup/shipping details." /></label></div>
          <div className="formSection"><h2>Equipment photos</h2><p className="helpText">Upload 1-{maxFiles} JPG, PNG, or WebP images. Each image must be 5MB or smaller.</p><div className="photoInputGrid"><label>Choose photos<input className="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => onFilesSelected(event.target.files)} /></label><label>Take a photo<input className="fileInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => onFilesSelected(event.target.files)} /></label></div>{files.length > 0 && <div className="selectedPhotoGrid">{files.map((file, index) => <SelectedPhoto key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} onEdit={() => openImageEditor(index)} onRemove={() => setFiles(files.filter((_, i) => i !== index))} />)}</div>}</div>
          {progress > 0 && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
          {message && <div className="authMessage" role="status">{message}</div>}
          {error && <div className="formError" role="alert">{error}</div>}
          <button className="primary submitListing" type="submit" disabled={loading}>{loading ? "Publishing listing..." : "+ Publish Equipment Listing"}</button>
        </form>
      </section>
      {editingIndex !== null && editingPreview && (
        <div className="imageEditorBackdrop" onMouseDown={closeImageEditor}>
          <section
            className="imageEditorModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-editor-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="imageEditorHeader">
              <div>
                <span className="eyebrow">PHOTO EDITOR</span>
                <h2 id="image-editor-title">Crop and fix image</h2>
              </div>
              <button type="button" onClick={closeImageEditor} aria-label="Close image editor">×</button>
            </div>

            <div className="imageEditorViewport">
              <img
                src={editingPreview}
                alt="Photo editing preview"
                style={{
                  transform: `translate(${editOffsetX * 0.22}%, ${editOffsetY * 0.22}%) rotate(${editRotation}deg) scale(${editZoom})`,
                }}
              />
              <span>4:3 listing crop</span>
            </div>

            <div className="imageEditorControls">
              <label>
                Zoom
                <input type="range" min="1" max="2.5" step="0.05" value={editZoom} onChange={(event) => setEditZoom(Number(event.target.value))} />
              </label>
              <label>
                Move left / right
                <input type="range" min="-100" max="100" step="1" value={editOffsetX} onChange={(event) => setEditOffsetX(Number(event.target.value))} />
              </label>
              <label>
                Move up / down
                <input type="range" min="-100" max="100" step="1" value={editOffsetY} onChange={(event) => setEditOffsetY(Number(event.target.value))} />
              </label>
            </div>

            <div className="imageEditorToolbar">
              <button type="button" onClick={() => setEditRotation((value) => value - 90)}>↶ Rotate left</button>
              <button type="button" onClick={() => setEditRotation((value) => value + 90)}>Rotate right ↷</button>
              <button type="button" onClick={() => { setEditRotation(0); setEditZoom(1); setEditOffsetX(0); setEditOffsetY(0); }}>Reset</button>
            </div>

            <div className="imageEditorActions">
              <button type="button" onClick={closeImageEditor} disabled={editSaving}>Cancel</button>
              <button type="button" className="primary" onClick={saveImageEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save edited photo"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

