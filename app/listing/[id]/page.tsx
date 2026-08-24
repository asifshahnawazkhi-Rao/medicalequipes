"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    params.then(({ id }) => setListingId(id));
  }, [params]);

  useEffect(() => {
    if (!listingId) return;

    const session = getStoredSession();

    getListingById(listingId, session ?? undefined)
      .then((data) => {
        setListing(data);
        setActiveImage(0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listingId]);

  const whatsappNumber = useMemo(() => {
    if (!listing?.contactPhone) return "";

    return listing.contactPhone.replace(/[^\d]/g, "");
  }, [listing?.contactPhone]);

  const whatsappMessage = useMemo(() => {
    if (!listing) return "";

    return encodeURIComponent(
      `Hi, I am interested in your ${listing.title} listed on MedicalEquipes.`
    );
  }, [listing]);

  if (loading) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">Loading equipment...</div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="listingDetailPage">
        <div className="listingDetailState">
          <h1>Listing not found</h1>
          <a href="/">← Back to marketplace</a>
        </div>
      </main>
    );
  }

  return (
    <main className="listingDetailPage">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brandMark">+</span>
            <span>
              Medical<span>Equipes</span>
            </span>
          </a>

          <nav>
            <a href="/#categories">Categories</a>
            <a href="/#listings">Buy</a>
            <a href="/sell">Sell</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
        </div>
      </header>

      <div className="container listingDetailContainer">
        <a className="backLink" href="/#listings">
          ← Back to marketplace
        </a>

        <div className="listingDetailGrid">
          <section className="listingGallery">
            <div className="listingMainImageWrap">
              {listing.images.length > 0 ? (
                <img
                  className="listingDetailImage"
                  src={listing.images[activeImage]}
                  alt={listing.title}
                />
              ) : (
                <div className="listingDetailPlaceholder">
                  No equipment image
                </div>
              )}
            </div>

            {listing.images.length > 1 && (
              <div className="listingThumbs">
                {listing.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={
                      index === activeImage
                        ? "listingThumb active"
                        : "listingThumb"
                    }
                    onClick={() => setActiveImage(index)}
                  >
                    <img
                      src={image}
                      alt={`${listing.title} image ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="listingDetailInfo">
            <div className="listingMetaTop">
              <span className="eyebrow">{listing.category}</span>
              <span className="detailBadge">{listing.condition}</span>
            </div>

            <h1>{listing.title}</h1>

            <div className="listingPrice">
              Rs. {listing.price.toLocaleString("en-PK")}
            </div>

            <p className="listingLocation">⌖ {listing.city}</p>

            <div className="equipmentFacts">
              {listing.brand && (
                <div>
                  <span>Brand</span>
                  <strong>{listing.brand}</strong>
                </div>
              )}

              {listing.model && (
                <div>
                  <span>Model</span>
                  <strong>{listing.model}</strong>
                </div>
              )}

              <div>
                <span>Condition</span>
                <strong>{listing.condition}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{listing.city}</strong>
              </div>
            </div>

            <div className="listingDescription">
              <h2>Description</h2>
              <p>{listing.description || "No description provided."}</p>
            </div>
          </section>
        </div>

        <div className="listingLowerGrid">
          <section className="sellerContactCard">
            <div>
              <span className="eyebrow">SELLER INFORMATION</span>
              <h2>Contact Seller</h2>
            </div>

            {listing.contactName && (
              <div className="sellerContactRow">
                <span>Seller</span>
                <strong>{listing.contactName}</strong>
              </div>
            )}

            {listing.contactPhone && (
              <div className="sellerContactRow">
                <span>Phone</span>
                <strong>{listing.contactPhone}</strong>
              </div>
            )}

            {listing.contactEmail && (
              <div className="sellerContactRow">
                <span>Email</span>
                <strong>{listing.contactEmail}</strong>
              </div>
            )}

            <div className="sellerActions">
              {listing.contactPhone && (
                <a
                  className="primary sellerAction"
                  href={`tel:${listing.contactPhone}`}
                >
                  Call Seller
                </a>
              )}

              {whatsappNumber && (
                <a
                  className="sellerAction"
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}

              {listing.contactEmail && (
                <a
                  className="sellerAction"
                  href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(
                    `MedicalEquipes enquiry: ${listing.title}`
                  )}`}
                >
                  Email Seller
                </a>
              )}
            </div>
          </section>

          <aside className="listingSafetyCard">
            <span className="eyebrow">BUY SAFELY</span>
            <h2>Marketplace safety</h2>
            <p>
              Verify equipment condition, serial numbers and service history
              before making payment.
            </p>
            <p>
              Meet in a suitable location and inspect equipment where practical.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
