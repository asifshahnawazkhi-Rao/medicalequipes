"use client";

import Link from "next/link";
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
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
        <button type="button" className="photoEditButton" onClick={onEdit}>Adjust Photo</button>
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
  const [crop, setCrop] = useState({ x: 8, y: 8, width: 84, height: 84 });
  const cropDrag = useRef<{
    mode: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    initial: typeof crop;
    width: number;
    height: number;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    setCrop({ x: 8, y: 8, width: 84, height: 84 });
  }

  function closeImageEditor() {
    if (editSaving) return;
    setEditingIndex(null);
  }

  function startCropDrag(
    event: PointerEvent<HTMLElement>,
    mode: "move" | "nw" | "ne" | "sw" | "se"
  ) {
    event.preventDefault();
    event.stopPropagation();
    const stage = event.currentTarget.closest(".cropStage");
    if (!(stage instanceof HTMLElement)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDrag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: crop,
      width: stage.clientWidth,
      height: stage.clientHeight,
    };
  }

  function moveCrop(event: PointerEvent<HTMLElement>) {
    const drag = cropDrag.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.startX) / drag.width) * 100;
    const dy = ((event.clientY - drag.startY) / drag.height) * 100;
    const minimum = 12;
    let { x, y, width, height } = drag.initial;

    if (drag.mode === "move") {
      x = Math.max(0, Math.min(100 - width, x + dx));
      y = Math.max(0, Math.min(100 - height, y + dy));
    } else {
      if (drag.mode.includes("w")) {
        const right = x + width;
        x = Math.max(0, Math.min(right - minimum, x + dx));
        width = right - x;
      }
      if (drag.mode.includes("e")) {
        width = Math.max(minimum, Math.min(100 - x, width + dx));
      }
      if (drag.mode.includes("n")) {
        const bottom = y + height;
        y = Math.max(0, Math.min(bottom - minimum, y + dy));
        height = bottom - y;
      }
      if (drag.mode.includes("s")) {
        height = Math.max(minimum, Math.min(100 - y, height + dy));
      }
    }

    setCrop({ x, y, width, height });
  }

  function stopCropDrag() {
    cropDrag.current = null;
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
      const sourceX = Math.round((crop.x / 100) * image.width);
      const sourceY = Math.round((crop.y / 100) * image.height);
      const sourceWidth = Math.max(1, Math.round((crop.width / 100) * image.width));
      const sourceHeight = Math.max(1, Math.round((crop.height / 100) * image.height));
      const outputScale = Math.min(1, 1600 / sourceWidth, 1600 / sourceHeight);
      canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
      canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image editor could not start.");

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
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

      setMessage("Sharing listing on Facebook...");
      const facebookResponse = await fetch("/api/facebook/publish-listing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const facebookResult = await facebookResponse.json().catch(() => ({}));

      setProgress(100);
      setMessage(
        facebookResponse.ok
          ? "Listing published and shared on Facebook. Redirecting to your dashboard..."
          : `Listing published successfully. Facebook sharing could not finish${facebookResult?.error ? `: ${facebookResult.error}` : "."}`
      );
      window.setTimeout(() => {
        window.location.assign(`/dashboard?created=${encodeURIComponent(listing.id)}`);
      }, facebookResponse.ok ? 1200 : 3000);
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
          <div className="formSection"><h2>Equipment photos</h2><p className="helpText">Add 1-{maxFiles} JPG, PNG, or WebP images. Each image must be 5MB or smaller.</p><div className="photoPicker"><button className="photoPickerButton" type="button" onClick={() => setPhotoPickerOpen((open) => !open)}>Choose Files <span>▾</span></button>{photoPickerOpen && <div className="photoPickerMenu"><button type="button" onClick={() => { setPhotoPickerOpen(false); cameraInputRef.current?.click(); }}><strong>📷 Take Photo</strong><small>Open your phone camera</small></button><button type="button" onClick={() => { setPhotoPickerOpen(false); galleryInputRef.current?.click(); }}><strong>▧ Choose from Gallery</strong><small>Select one or more existing photos</small></button></div>}<input ref={cameraInputRef} className="visuallyHiddenFile" type="file" accept="image/*" capture="environment" onChange={(event) => { onFilesSelected(event.target.files); event.target.value = ""; }} /><input ref={galleryInputRef} className="visuallyHiddenFile" type="file" accept="image/*" multiple onChange={(event) => { onFilesSelected(event.target.files); event.target.value = ""; }} /></div>{files.length > 0 && <div className="selectedPhotoGrid">{files.map((file, index) => <SelectedPhoto key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} onEdit={() => openImageEditor(index)} onRemove={() => setFiles(files.filter((_, i) => i !== index))} />)}</div>}</div>
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
                <h2 id="image-editor-title">Adjust image</h2>
              </div>
              <button type="button" onClick={closeImageEditor} aria-label="Close image editor">×</button>
            </div>

            <div className="imageEditorViewport">
              <div
                className="cropStage"
                onPointerMove={moveCrop}
                onPointerUp={stopCropDrag}
                onPointerCancel={stopCropDrag}
              >
                <img src={editingPreview} alt="Photo editing preview" />
                <div className="cropShade" />
                <div
                  className="cropSelection"
                  style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
                  onPointerDown={(event) => startCropDrag(event, "move")}
                >
                  <span className="cropGrid cropGridOne" />
                  <span className="cropGrid cropGridTwo" />
                  <button type="button" className="cropHandle nw" aria-label="Resize crop from top left" onPointerDown={(event) => startCropDrag(event, "nw")} />
                  <button type="button" className="cropHandle ne" aria-label="Resize crop from top right" onPointerDown={(event) => startCropDrag(event, "ne")} />
                  <button type="button" className="cropHandle sw" aria-label="Resize crop from bottom left" onPointerDown={(event) => startCropDrag(event, "sw")} />
                  <button type="button" className="cropHandle se" aria-label="Resize crop from bottom right" onPointerDown={(event) => startCropDrag(event, "se")} />
                </div>
              </div>
              <span>Drag the box or its corners to select the crop</span>
            </div>

            <div className="imageEditorToolbar">
              <button type="button" onClick={() => setCrop({ x: 0, y: 0, width: 100, height: 100 })}>Use full image</button>
              <button type="button" onClick={() => setCrop({ x: 8, y: 8, width: 84, height: 84 })}>Reset crop</button>
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

