"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "../auth";
import {
  getPendingSellers,
  getProfile,
  getVisitingCardSignedUrl,
  updateSellerApproval,
  type AdminSellerProfile,
} from "../supabaseData";

type SellerWithCard = AdminSellerProfile & {
  cardUrl?: string;
};

export default function AdminPage() {
  const [sellers, setSellers] = useState<SellerWithCard[]>([]);
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

      const pending = await getPendingSellers(session);

      const withCards = await Promise.all(
        pending.map(async (seller) => {
          if (!seller.visitingCardUrl) {
            return seller;
          }

          try {
            const cardUrl =
              await getVisitingCardSignedUrl(
                session,
                seller.visitingCardUrl
              );

            return {
              ...seller,
              cardUrl,
            };
          } catch {
            return seller;
          }
        })
      );

      setSellers(withCards);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load pending sellers."
      );
    } finally {
      setLoading(false);
    }
  }

  loadAdmin();
}, []);

        if (!profile || profile.role !== "admin") {
          window.location.replace("/dashboard");
          return;
        }

        const pending = await getPendingSellers(session);

        const withCards = await Promise.all(
          pending.map(async (seller) => {
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
            } catch {
              return seller;
            }
          })
        );

        setSellers(withCards);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load pending sellers."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAdmin();
  }, []);

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
        current.filter(
          (seller) => seller.id !== sellerId
        )
      );

      setMessage(
        status === "approved"
          ? "Seller approved successfully."
          : "Seller rejected."
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

            <h1>Pending Sellers</h1>

            <p>
              Review seller profiles and approve or reject
              marketplace access.
            </p>
          </div>
        </section>

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

        {sellers.length === 0 ? (
          <div className="dashboardEmpty">
            <h2>No pending sellers</h2>
            <p>
              All seller applications have been reviewed.
            </p>
          </div>
        ) : (
          <div className="dashboardListingGrid">
            {sellers.map((seller) => (
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
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
