"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredSession } from "../auth";
import {
  getAdminSellers,
  getProfile,
  getVisitingCardSignedUrl,
  updateSellerApproval,
  type AdminSellerProfile,
} from "../supabaseData";

type SellerWithCard = AdminSellerProfile & {
  cardUrl?: string;
};

type SellerFilter = "pending" | "approved" | "rejected";

export default function AdminPage() {
  const [sellers, setSellers] = useState<SellerWithCard[]>([]);
  const [filter, setFilter] = useState<SellerFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredSession();

    if (!stored?.access_token) {
      window.location.replace("/");
      return;
    }

    const session = stored;

    async function loadAdmin() {
      try {
        const profile = await getProfile(session);

        if (!profile || profile.role !== "admin") {
          window.location.replace("/dashboard");
          return;
        }

        const allSellers = await getAdminSellers(session);

        const withCards: SellerWithCard[] = await Promise.all(
          allSellers.map(async (seller) => {
            if (!seller.visitingCardUrl) {
              return seller;
            }

            try {
              const cardUrl = await getVisitingCardSignedUrl(
                session,
                seller.visitingCardUrl
              );

              return {
                ...seller,
                cardUrl,
              };
            } catch (err) {
              console.error(err);
              return seller;
            }
          })
        );

        setSellers(withCards);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load sellers."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAdmin();
  }, []);

  const filteredSellers = useMemo(() => {
    return sellers.filter(
      (seller) => seller.status === filter
    );
  }, [sellers, filter]);

  const counts = useMemo(() => {
    return {
      pending: sellers.filter(
        (seller) => seller.status === "pending"
      ).length,

      approved: sellers.filter(
        (seller) => seller.status === "approved"
      ).length,

      rejected: sellers.filter(
        (seller) => seller.status === "rejected"
      ).length,
    };
  }, [sellers]);

  async function handleApproval(
    sellerId: string,
    status: "approved" | "rejected"
  ) {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    setMessage("");
    setError("");

    try {
      await updateSellerApproval(
        session,
        sellerId,
        status
      );

      setSellers((current) =>
        current.map((seller) =>
          seller.id === sellerId
            ? {
                ...seller,
                status,
              }
            : seller
        )
      );

      setMessage(
        status === "approved"
          ? "Seller approved successfully."
          : "Seller rejected successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update seller approval."
      );
    }
  }

  if (loading) {
    return (
      <main className="dashboardPage">
        Loading admin dashboard...
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
              ADMIN DASHBOARD
            </span>

            <h1>Seller Management</h1>

            <p>
              Review pending sellers and manage approved
              or rejected marketplace sellers.
            </p>
          </div>
        </section>

        <div
          className="dashboardListingActions"
          style={{ marginBottom: "24px" }}
        >
          <button
            type="button"
            className={
              filter === "pending"
                ? "primary"
                : ""
            }
            onClick={() =>
              setFilter("pending")
            }
          >
            Pending ({counts.pending})
          </button>

          <button
            type="button"
            className={
              filter === "approved"
                ? "primary"
                : ""
            }
            onClick={() =>
              setFilter("approved")
            }
          >
            Approved ({counts.approved})
          </button>

          <button
            type="button"
            className={
              filter === "rejected"
                ? "primary"
                : ""
            }
            onClick={() =>
              setFilter("rejected")
            }
          >
            Rejected ({counts.rejected})
          </button>
        </div>

        {message && (
          <div className="authMessage">
            {message}
          </div>
        )}

        {error && (
          <div className="formError">
            {error}
          </div>
        )}

        {filteredSellers.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>
              No {filter} sellers
            </h2>

            <p>
              There are currently no sellers in this
              section.
            </p>
          </div>
        ) : (
          <div className="dashboardListingGrid">
            {filteredSellers.map((seller) => (
              <article
                className="dashboardListingCard"
                key={seller.id}
              >
                <div className="dashboardListingBody">
                  <span className="dashboardStatus">
                    {seller.status}
                  </span>

                  <h2>
                    {seller.businessName ||
                      seller.fullName ||
                      "Seller"}
                  </h2>

                  {seller.fullName && (
                    <p>
                      <strong>Name:</strong>{" "}
                      {seller.fullName}
                    </p>
                  )}

                  {seller.businessName && (
                    <p>
                      <strong>Business:</strong>{" "}
                      {seller.businessName}
                    </p>
                  )}

                  {seller.phone && (
                    <p>
                      <strong>Phone:</strong>{" "}
                      {seller.phone}
                    </p>
                  )}

                  {seller.city && (
                    <p>
                      <strong>City:</strong>{" "}
                      {seller.city}
                    </p>
                  )}

                  {seller.cardUrl && (
                    <p>
                      <a
                        href={seller.cardUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Visiting Card
                      </a>
                    </p>
                  )}

                  {seller.status === "pending" && (
                    <div className="dashboardListingActions">
                      <button
                        className="primary"
                        type="button"
                        onClick={() =>
                          handleApproval(
                            seller.id,
                            "approved"
                          )
                        }
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleApproval(
                            seller.id,
                            "rejected"
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {seller.status === "approved" && (
                    <div className="dashboardListingActions">
                      <button
                        type="button"
                        onClick={() =>
                          handleApproval(
                            seller.id,
                            "rejected"
                          )
                        }
                      >
                        Revoke Approval
                      </button>
                    </div>
                  )}

                  {seller.status === "rejected" && (
                    <div className="dashboardListingActions">
                      <button
                        className="primary"
                        type="button"
                        onClick={() =>
                          handleApproval(
                            seller.id,
                            "approved"
                          )
                        }
                      >
                        Approve Seller
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
