"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "../../auth";
import { getListingById } from "../../supabaseData";

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

export default function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingId, setListingId] = useState("");

  useEffect(() => {
    params.then(({ id }) => setListingId(id));
  }, [params]);

  useEffect(() => {
    if (!listingId) return;

    const session = getStoredSession();

    getListingById(listingId, session ?? undefined)
      .then((data) => setListing(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return <main className="listingDetailPage">Loading equipment...</main>;
  }

  if (!listing) {
    return <main className="listingDetailPage">Listing not found.</main>;
  }

  return (
    <main className="listingDetailPage">
      <a href="/">← Back to marketplace</a>

      <div className="listingDetailGrid">
        <section>
          {listing.images.length > 0 ? (
            <img
              className="listingDetailImage"
              src={listing.images[0]}
              alt={listing.title}
            />
          ) : (
            <div className="listingDetailPlaceholder">
              No equipment image
            </div>
          )}
        </section>

        <section className="listingDetailInfo">
          <span className="eyebrow">{listing.category}</span>

          <h1>{listing.title}</h1>

          <h2>
            Rs. {listing.price.toLocaleString("en-PK")}
          </h2>

          <p>
            {listing.condition} · {listing.city}
          </p>

          {listing.brand && (
            <p><strong>Brand:</strong> {listing.brand}</p>
          )}

          {listing.model && (
            <p><strong>Model:</strong> {listing.model}</p>
          )}

          <h3>Description</h3>
          <p>{listing.description}</p>

          <div className="sellerContact">
            <h3>Seller Contact</h3>

            {listing.contactName && <p>{listing.contactName}</p>}

            {listing.contactPhone && (
              <p>
                <a href={`tel:${listing.contactPhone}`}>
                  {listing.contactPhone}
                </a>
              </p>
            )}

            {listing.contactEmail && (
              <p>
                <a href={`mailto:${listing.contactEmail}`}>
                  {listing.contactEmail}
                </a>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
