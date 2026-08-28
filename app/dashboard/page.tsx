"use client";

import { useMemo, useEffect, useState } from "react";
import { clearSession, getStoredSession } from "../auth";
import {
  deleteListing,
  getSellerListings,
  updateListingStatus,
  type SellerListing,
  renewListing,
} from "../supabaseData";

type ListingFilter =
  | "all"
  | "active"
  | "sold"
  | "draft";

export default function Dashboard() {
  const [email, setEmail] = useState<string | undefined>();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ListingFilter>("all");

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

  const counts = useMemo(() => {
  return {
    total: listings.length,

    active: listings.filter(
      (listing) => listing.status === "active"
    ).length,

    sold: listings.filter(
      (listing) => listing.status === "sold"
    ).length,

    draft: listings.filter(
      (listing) => listing.status === "draft"
    ).length,
  };
}, [listings]);

const filteredListings = useMemo(() => {
  if (filter === "all") {
    return listings;
  }

  return listings.filter(
    (listing) => listing.status === filter
  );
}, [listings, filter]);

function logout() {
  clearSession();
  window.location.assign("/");
}
function getDaysRemaining(expiresAt: string) {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();

  return Math.ceil(
    (expiry - now) / (1000 * 60 * 60 * 24)
  );
}
  async function handleRenew(listingId: string) {
  const session = getStoredSession();

  if (!session?.access_token) {
    window.location.replace("/");
    return;
  }

  const confirmed = window.confirm(
    "Renew this listing for another 60 days?"
  );

  if (!confirmed) return;

  try {
    await renewListing(session, listingId);

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 60);

    setListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              status: "active",
              expiresAt: newExpiry.toISOString(),
            }
          : listing
      )
    );
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : "Could not renew listing."
    );
  }
}
  async function handleDelete(
    listingId: string,
    title: string
  ) {
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
        current.filter(
          (listing) => listing.id !== listingId
        )
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Could not delete listing."
      );
    }
  }

  async function handleStatusChange(
  listingId: string,
  nextStatus: "active" | "sold" | "draft"
) {
  if (nextStatus === "draft") {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this listing?\n\nIt will be hidden from the marketplace until you reactivate it."
    );

    if (!confirmed) return;
  }

  const session = getStoredSession();

  if (!session?.access_token) {
    window.location.replace("/");
    return;
  }

  try {
    await updateListingStatus(
      listingId,
      nextStatus,
      session
    );

    setListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              status: nextStatus,
            }
          : listing
      )
    );
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : "Could not update listing status."
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
            <span className="eyebrow">
              SELLER DASHBOARD
            </span>

            <h1>My Listings</h1>

            <p>
              Welcome{email ? `, ${email}` : ""}. Manage
              your marketplace equipment listings.
            </p>
          </div>

          <div className="dashboardTopActions">
            <button
              className="primary"
              type="button"
              onClick={() =>
                window.location.assign("/sell")
              }
            >
              + Add Listing
            </button>

            <button
              type="button"
              onClick={() =>
                window.location.assign("/profile")
              }
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </section>

        {!loading && (
          <>
            <section className="dashboardStats">
              <div className="dashboardStatCard">
                <span>Total Listings</span>
                <strong>{counts.total}</strong>
              </div>

              <div className="dashboardStatCard">
                <span>Active</span>
                <strong>{counts.active}</strong>
              </div>

              <div className="dashboardStatCard">
                <span>Sold</span>
                <strong>{counts.sold}</strong>
              </div>
          
<div className="dashboardStatCard">
  <span>Inactive</span>
  <strong>{counts.draft}</strong>
</div>
       </section>
            <div className="dashboardFilterTabs">
              <button
                type="button"
                className={
                  filter === "all"
                    ? "primary"
                    : ""
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                All ({counts.total})
              </button>

              <button
                type="button"
                className={
                  filter === "active"
                    ? "primary"
                    : ""
                }
                onClick={() =>
                  setFilter("active")
                }
              >
                Active ({counts.active})
              </button>

              <button
                type="button"
                className={
                  filter === "sold"
                    ? "primary"
                    : ""
                }
                onClick={() =>
                  setFilter("sold")
                }
              >
                Sold ({counts.sold})
              </button>
              <button
  type="button"
  className={
    filter === "draft"
      ? "primary"
      : ""
  }
  onClick={() =>
    setFilter("draft")
  }
>
  Inactive ({counts.draft})
</button>
            </div>
          </>
        )}

        {loading ? (
          <div className="dashboardEmpty">
            Loading your listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>No listings yet</h2>

            <p>
              Create your first equipment listing.
            </p>

            <button
              className="primary"
              type="button"
              onClick={() =>
                window.location.assign("/sell")
              }
            >
              + Sell Equipment
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>
              No {filter} listings
            </h2>

            <p>
              There are currently no listings in this
              section.
            </p>
          </div>
        ) : (
          <div className="dashboardListingGrid">
            {filteredListings.map((listing) => (
              <article
                className="dashboardListingCard"
                key={listing.id}
              >
                <div className="dashboardListingImage">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                    />
                  ) : (
                    <div>No image</div>
                  )}

                  <span className="dashboardStatus">
  {listing.status === "draft"
    ? "Inactive"
    : listing.status === "active"
      ? "Active"
      : listing.status === "sold"
        ? "Sold"
        : listing.status}
</span>
                  {(() => {
  const daysRemaining = getDaysRemaining(
    listing.expiresAt
  );

  if (daysRemaining === null) return null;

  if (daysRemaining <= 0) {
    return (
      <p className="listingExpiry expired">
        Expired
      </p>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <p className="listingExpiry warning">
        Expires in {daysRemaining} day
        {daysRemaining === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <p className="listingExpiry">
      {daysRemaining} days remaining
    </p>
  );
})()}
                </div>

                <div className="dashboardListingBody">
                  <h2>{listing.title}</h2>

                  <strong>
                    Rs.{" "}
                    {listing.price.toLocaleString(
                      "en-PK"
                    )}
                  </strong>

                  <p>
                    {listing.condition} ·{" "}
                    {listing.city}
                  </p>

                  <div className="dashboardListingActions">
                    <a
                      href={`/listing/${listing.id}`}
                    >
                      View Listing
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        window.location.assign(
                          `/listing/${listing.id}/edit`
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          listing.id,
                          listing.title
                        )
                      }
                    >
                      Delete
                    </button>

                    {listing.status === "active" ? (
  <>
    <button
      type="button"
      onClick={() =>
        handleStatusChange(
          listing.id,
          "sold"
        )
      }
    >
      Mark Sold
    </button>

    <button
      type="button"
      onClick={() =>
        handleStatusChange(
          listing.id,
          "draft"
        )
      }
    >
      Deactivate
    </button>
  </>
) : listing.status === "sold" ? (
  <button
    type="button"
    onClick={() =>
      handleStatusChange(
        listing.id,
        "active"
      )
    }
  >
    Mark Active
  </button>
) : listing.status === "draft" ? (
  <button
    type="button"
    onClick={() =>
      handleStatusChange(
        listing.id,
        "active"
      )
    }
  >
    Reactivate
  </button>
) : null}
                    {getDaysRemaining(listing.expiresAt) !== null &&
  getDaysRemaining(listing.expiresAt)! <= 7 && (
    <button
      type="button"
      onClick={() => handleRenew(listing.id)}
    >
      Renew Listing
    </button>
  )}
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
