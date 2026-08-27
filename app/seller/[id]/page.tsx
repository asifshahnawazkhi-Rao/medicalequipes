"use client";

import { useEffect, useState } from "react";
import {
  getPublicSellerById,
  getPublicSellerListings,
  type PublicListing,
  type PublicSeller,
} from "../../supabaseData";

export default function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [sellerId, setSellerId] = useState("");
  const [seller, setSeller] = useState<PublicSeller | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setSellerId(id);
    });
  }, [params]);

  useEffect(() => {
    if (!sellerId) return;

    async function loadSeller() {
      try {
        const [sellerProfile, sellerListings] =
          await Promise.all([
            getPublicSellerById(sellerId),
            getPublicSellerListings(sellerId),
          ]);

        if (!sellerProfile) {
          setError("Seller not found.");
          return;
        }

        setSeller(sellerProfile);
        setListings(sellerListings);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load seller profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSeller();
  }, [sellerId]);

  if (loading) {
    return (
      <main className="sellerDashboardPage">
        <div className="container sellerDashboardContainer">
          Loading seller profile...
        </div>
      </main>
    );
  }

  if (!seller || error) {
    return (
      <main className="sellerDashboardPage">
        <header className="header">
          <div className="container nav">
            <a className="brand" href="/">
              <span className="brandMark">+</span>
              <span>
                Medical<span>Equipes</span>
              </span>
            </a>
          </div>
        </header>

        <div className="container sellerDashboardContainer">
          <div className="dashboardEmpty">
            <h1>Seller not found</h1>

            <p>
              {error ||
                "This seller profile is not available."}
            </p>

            <button
              className="primary"
              type="button"
              onClick={() =>
                window.location.assign("/")
              }
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </main>
    );
  }

  const sellerName =
    seller.businessName ||
    seller.fullName ||
    "Verified Seller";

  return (
    <main className="sellerDashboardPage">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brandMark">+</span>
            <span>
              Medical<span>Equipes</span>
            </span>
          </a>

          <nav>
            <a href="/">Marketplace</a>
            <a href="/#categories">Categories</a>
            <a href="/#listings">Buy</a>
          </nav>
        </div>
      </header>

      <div className="container sellerDashboardContainer">
        <section className="dashboardWelcome">
          <div>
            <span className="eyebrow">
              VERIFIED SELLER
            </span>

            <h1>{sellerName}</h1>

            <p>
              ✓ Approved marketplace seller
              {seller.city
                ? ` · ${seller.city}`
                : ""}
            </p>

            {seller.fullName &&
              seller.businessName && (
                <p>
                  Contact person: {seller.fullName}
                </p>
              )}

            <p>
              {seller.activeListingCount} active{" "}
              {seller.activeListingCount === 1
                ? "listing"
                : "listings"}
            </p>
          </div>
        </section>

        {listings.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>No active listings</h2>

            <p>
              This seller currently has no active
              equipment listings.
            </p>

            <button
              className="primary"
              type="button"
              onClick={() =>
                window.location.assign("/#listings")
              }
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="listingGrid">
            {listings.map((listing) => (
              <article
                className="listing"
                key={listing.id}
              >
                <div className="listingImage">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="listingPhoto"
                    />
                  ) : (
                    <div className="equipmentShape" />
                  )}

                  <span className="badge">
                    {listing.condition}
                  </span>
                </div>

                <div className="listingBody">
                  <small>{listing.category}</small>

                  <h3>{listing.title}</h3>

                  {(listing.brand ||
                    listing.model) && (
                    <p>
                      {listing.brand}
                      {listing.brand &&
                      listing.model
                        ? " · "
                        : ""}
                      {listing.model}
                    </p>
                  )}

                  <strong>
                    Rs.{" "}
                    {listing.price.toLocaleString(
                      "en-PK"
                    )}
                  </strong>

                  <p>⌖ {listing.city}</p>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.assign(
                        `/listing/${listing.id}`
                      )
                    }
                  >
                    View Listing
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
