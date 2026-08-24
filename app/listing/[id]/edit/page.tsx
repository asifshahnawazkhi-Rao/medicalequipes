"use client";

import { FormEvent, useEffect, useState } from "react";
import { getStoredSession } from "../../../auth";
import {
  getListingById,
  updateListing,
} from "../../../supabaseData";

type ListingDetail = {
  id: string;
  title: string;
  category: string;
  price: number;
  city: string;
  condition: string;
  description: string;
  brand: string;
  model: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  images: string[];
};

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [listingId, setListingId] = useState("");
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => setListingId(id));
  }, [params]);

  useEffect(() => {
    if (!listingId) return;

    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    getListingById(listingId, session)
      .then((data) => setListing(data))
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not load listing."
        );
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getStoredSession();

    if (!session?.access_token || !listingId) {
      window.location.replace("/");
      return;
    }

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries()) as Record<string, string>;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await updateListing(session, listingId, values);

      setMessage("Listing updated successfully.");

      setTimeout(() => {
        window.location.assign(`/listing/${listingId}`);
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update listing."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">Loading listing...</div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">
          <h1>Listing not found</h1>
          <a href="/dashboard">← Back to dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main className="sellPage">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brandMark">+</span>
            <span>
              Medical<span>Equipes</span>
            </span>
          </a>

          <nav>
            <a href="/dashboard">Dashboard</a>
            <a href={`/listing/${listing.id}`}>View Listing</a>
          </nav>
        </div>
      </header>

      <section className="sellHero">
        <div className="container">
          <span className="eyebrow">SELLER DASHBOARD</span>
          <h1>Edit equipment listing</h1>
          <p>Update your equipment details and seller contact information.</p>
        </div>
      </section>

      <section className="container sellFormWrap">
        <form className="sellForm" onSubmit={submit}>
          <div className="formSection">
            <h2>Equipment details</h2>

            <div className="formGrid">
              <label>
                Equipment title *
                <input
                  name="title"
                  required
                  defaultValue={listing.title}
                />
              </label>

              <label>
                Category
                <input
                  name="categoryId"
                  defaultValue=""
                  placeholder="Leave unchanged for now"
                  disabled
                />
              </label>

              <label>
                Brand
                <input
                  name="brand"
                  defaultValue={listing.brand}
                />
              </label>

              <label>
                Model
                <input
                  name="model"
                  defaultValue={listing.model}
                />
              </label>

              <label>
                Condition *
                <select
                  name="condition"
                  required
                  defaultValue={listing.condition}
                >
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Refurbished">Refurbished</option>
                  <option value="Demo">Demo</option>
                </select>
              </label>

              <label>
                Price (PKR) *
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={listing.price}
                />
              </label>

              <label>
                Location / city *
                <input
                  name="city"
                  required
                  defaultValue={listing.city}
                />
              </label>

              <label>
                Contact name
                <input
                  name="contactName"
                  defaultValue={listing.contactName}
                />
              </label>

              <label>
                Contact email
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={listing.contactEmail}
                />
              </label>

              <label>
                Contact phone
                <input
                  name="contactPhone"
                  defaultValue={listing.contactPhone}
                />
              </label>
            </div>

            <label>
              Description *
              <textarea
                name="description"
                required
                rows={7}
                defaultValue={listing.description}
              />
            </label>
          </div>

          {listing.images.length > 0 && (
            <div className="formSection">
              <h2>Current photos</h2>

              <div className="listingThumbs">
                {listing.images.map((image, index) => (
                  <div className="listingThumb" key={`${image}-${index}`}>
                    <img
                      src={image}
                      alt={`${listing.title} image ${index + 1}`}
                    />
                  </div>
                ))}
              </div>

              <p className="helpText">
                Photo replacement will be added in the next step.
              </p>
            </div>
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

          <button
            className="primary submitListing"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving changes..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/dashboard")}
          >
            Cancel
          </button>
        </form>
      </section>
    </main>
  );
}
