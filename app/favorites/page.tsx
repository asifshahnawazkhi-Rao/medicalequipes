"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "../auth";
import {
  getFavoriteListingIds,
  getPublicListings,
  removeFavorite,
  type PublicListing,
} from "../supabaseData";

export default function FavoritesPage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    async function loadFavorites() {
      try {
        const favoriteIds =
          await getFavoriteListingIds(session);

        const allListings =
          await getPublicListings(session);

        const favoriteListings =
          allListings.filter((listing) =>
            favoriteIds.includes(listing.id)
          );

        setListings(favoriteListings);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load favorites."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, []);

  async function removeSaved(listingId: string) {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    try {
      await removeFavorite(session, listingId);

      setListings((current) =>
        current.filter(
          (listing) => listing.id !== listingId
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove favorite."
      );
    }
  }

  if (loading) {
    return (
      <main className="dashboardPage">
        Loading saved listings...
      </main>
    );
  }

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
            <a href="/dashboard">Dashboard</a>
            <a href="/profile">Profile</a>
          </nav>
        </div>
      </header>

      <div className="container sellerDashboardContainer">
        <section className="dashboardWelcome">
          <div>
            <span className="eyebrow">
              SAVED EQUIPMENT
            </span>

            <h1>My Favorites</h1>

            <p>
              Equipment listings you have saved for later.
            </p>
          </div>
        </section>

        {error && (
          <div className="formError">
            {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>No saved listings</h2>

            <p>
              Browse the marketplace and tap the heart
              icon to save equipment.
            </p>

            <button
              className="primary"
              type="button"
              onClick={() =>
                window.location.assign("/#listings")
              }
            >
              Browse Equipment
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

                  <button
                    className="heart"
                    type="button"
                    onClick={() =>
                      removeSaved(listing.id)
                    }
                    aria-label="Remove saved listing"
                  >
                    ♥
                  </button>
                </div>

                <div className="listingBody">
                  <small>{listing.category}</small>

                  <h3>{listing.title}</h3>

                  <strong>
                    Rs.{" "}
                    {listing.price.toLocaleString(
                      "en-PK"
                    )}
                  </strong>

                  <p>
                    ⌖ {listing.city}
                  </p>

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
