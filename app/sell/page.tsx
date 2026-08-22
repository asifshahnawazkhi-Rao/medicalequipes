"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getStoredSession, type AuthSession } from "../auth";
import { createListing, getCategories, saveListingImages, uploadListingImage, type CategoryOption } from "../supabaseData";

const conditions = ["New", "Like New", "Used", "Refurbished", "Demo"];
const fallbackCategories = ["Diagnostic Equipment", "Surgical Equipment", "Patient Care", "Laboratory Equipment", "Imaging Equipment", "Dental Equipment"];
const maxFileSize = 5 * 1024 * 1024;
const maxFiles = 8;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function SellEquipmentPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.access_token) {
      window.location.replace("/");
      return;
    }
    setSession(stored);
    getCategories(stored).then(setCategories).catch(() => setCategories([]));
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
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

  return (
    <main className="sellPage">
      <header className="header"><div className="container nav"><Link className="brand" href="/"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></Link><nav><Link href="/#categories">Categories</Link><Link href="/#listings">Buy</Link><Link href="/dashboard">Dashboard</Link></nav></div></header>
      <section className="sellHero"><div className="container"><span className="eyebrow">SELLER MARKETPLACE</span><h1>List medical equipment professionally</h1><p>Create a verified marketplace listing with specifications, pricing, location, and equipment photos.</p></div></section>
      <section className="container sellFormWrap">
        <form className="sellForm" onSubmit={submit}>
          <div className="formSection"><h2>Equipment details</h2><div className="formGrid"><label>Equipment title *<input name="title" required placeholder="e.g. GE Voluson E10 Ultrasound" /></label><label>Category *<select name="categoryId" required><option value="">Select category</option>{categoryOptions.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label><label>Brand<input name="brand" placeholder="GE, Mindray, Dräger" /></label><label>Model<input name="model" placeholder="Model number/name" /></label><label>Condition *<select name="condition" required><option value="">Select condition</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label><label>Price (PKR) *<input name="price" type="number" min="1" step="1" required placeholder="1250000" /></label><label>Location / city *<input name="city" required placeholder="Karachi" /></label><label>Contact name<input name="contactName" placeholder="Seller or business name" /></label><label>Contact email<input name="contactEmail" type="email" placeholder="sales@example.com" /></label><label>Contact phone<input name="contactPhone" placeholder="+92..." /></label></div><label>Description *<textarea name="description" required rows={7} placeholder="Describe specifications, age, warranty, included accessories, service history, and pickup/shipping details." /></label></div>
          <div className="formSection"><h2>Equipment photos</h2><p className="helpText">Upload 1-{maxFiles} JPG, PNG, or WebP images. Each image must be 5MB or smaller.</p><input className="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => onFilesSelected(event.target.files)} />{files.length > 0 && <div className="imageList">{files.map((file, index) => <div key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))}>Remove</button></div>)}</div>}</div>
          {progress > 0 && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
          {message && <div className="authMessage" role="status">{message}</div>}
          {error && <div className="formError" role="alert">{error}</div>}
          <button className="primary submitListing" type="submit" disabled={loading}>{loading ? "Publishing listing..." : "+ Publish Equipment Listing"}</button>
        </form>
      </section>
    </main>
  );
}
