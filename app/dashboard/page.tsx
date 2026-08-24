"use client";

import { useEffect, useState } from "react";
import { clearSession, getStoredSession } from "../auth";
import {
  deleteListing,
  getSellerListings,
  type SellerListing,
} from "../supabaseData";
export default function Dashboard() {
  const [email, setEmail] = useState<string | undefined>();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    setEmail(session.user?.email);

    getSellerListings(session)
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearSession();
    window.location.assign("/");
  }
async function handleDelete(listingId: string, title: string) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${title}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  const session = getStoredSession();

  if (!session?.access_token) {
    window.location.replace("/");
    return;
  }

  try {
    await deleteListing(session, listingId);

    setListings((current) =>
      current.filter((listing) => listing.id !== listingId)
    );
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : "Could not delete listing."
    );
  }
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
            <a href="/sell">Sell Equipment</a>
            <a href="/profile">Profile</a>
          </nav>
        </div>
      </header>

      <div className="container sellerDashboardContainer">
        <section className="dashboardWelcome">
          <div>
            <span className="eyebrow">SELLER DASHBOARD</span>
            <h1>My Listings</h1>
            <p>
              Welcome{email ? `, ${email}` : ""}. Manage your marketplace
              equipment listings.
            </p>
          </div>

          <div className="dashboardTopActions">
            <button
              className="primary"
              type="button"
              onClick={() => window.location.assign("/sell")}
            >
              + Add Listing
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/profile")}
            >
              Edit Profile
            </button>

            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </section>

        {loading ? (
          <div className="dashboardEmpty">Loading your listings...</div>
        ) : listings.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>No listings yet</h2>
            <p>Create your first equipment listing.</p>

            <button
              className="primary"
              type="button"
              onClick={() => window.location.assign("/sell")}
            >
              + Sell Equipment
            </button>
          </div>
        ) : (
          <div className="dashboardListingGrid">
  {listings.map((listing) => (
    <article className="dashboardListingCard" key={listing.id}>
      <div className="dashboardListingImage">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} />
        ) : (
          <div>No image</div>
        )}

        <span className="dashboardStatus">
          {listing.status}
        </span>
      </div>

      <div className="dashboardListingBody">
        <h2>{listing.title}</h2>

        <strong>
          Rs. {listing.price.toLocaleString("en-PK")}
        </strong>

        <p>
          {listing.condition} · {listing.city}
        </p>

       <div className="dashboardListingActions">
  <a href={`/listing/${listing.id}`}>
    View Listing
  </a>

  <button
    type="button"
    onClick={() =>
      window.location.assign(`/listing/${listing.id}/edit`)
    }
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => handleDelete(listing.id, listing.title)}
  >
    Delete
  </button>
</div>
      </div>
    </article>
  ))}
</div>
            
        )}
      </div>
    </main>
  );
}
