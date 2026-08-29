"use client";
// Trigger production deployment

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getStoredSession } from "../../auth";
import AuthModal from "../../AuthModal";

import {
  getListingById,
  recordListingView,
  getVisitingCardSignedUrl,
  submitListingReport,
} from "../../supabaseData";

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
  sellerId: string;
sellerFullName: string;
sellerBusinessName: string;
sellerCity: string;
sellerPhone: string;
sellerStatus: string;
sellerVisitingCardUrl: string;
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
  const [sellerCardUrl, setSellerCardUrl] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const recordedViewRef = useRef<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
 
  useEffect(() => {
    params.then(({ id }) => setListingId(id));
  }, [params]);

  useEffect(() => {
  if (!listingId) return;

  const session = getStoredSession();

  setIsLoggedIn(Boolean(session?.access_token));
  async function loadListing() {
    try {
      const data = await getListingById(
        listingId,
        session ?? undefined
      );

      setListing(data);
      setActiveImage(0);

      if (
  data &&
  recordedViewRef.current !== listingId
) {
  try {
    await recordListingView(
      listingId,
      session ?? undefined
    );

    recordedViewRef.current = listingId;

    console.log(
      "Listing view recorded:",
      listingId
    );
  } catch (error) {
    console.error(
      "VIEW RECORD ERROR:",
      error
    );

    window.alert(
      error instanceof Error
        ? `View recording failed: ${error.message}`
        : "View recording failed."
    );
  }
}
      if (
        data?.sellerVisitingCardUrl &&
        session?.access_token
      ) {
        try {
          const signedUrl =
            await getVisitingCardSignedUrl(
              session,
              data.sellerVisitingCardUrl
            );

          setSellerCardUrl(signedUrl);
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  loadListing();
}, [listingId]);

  async function handleSubmitReport() {
    const session = getStoredSession();

    if (!session?.access_token) {
      setAuthOpen(true);
      return;
    }

    if (!listing) return;

    if (!reportReason) {
      setReportMessage("Please select a reason.");
      return;
    }

    try {
      setReportSubmitting(true);
      setReportMessage("");

      await submitListingReport(
        session,
        listing.id,
        reportReason,
        reportDescription
      );

      setReportMessage("Report submitted successfully.");
      setReportReason("");
      setReportDescription("");

      setTimeout(() => {
        setReportOpen(false);
        setReportMessage("");
      }, 1200);
    } catch (error) {
      setReportMessage(
        error instanceof Error
          ? error.message
          : "Could not submit report."
      );
    } finally {
      setReportSubmitting(false);
    }
  }

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

  async function shareListing() {
    if (!listing) return;

    const shareData = {
      title: listing.title,
      text: `${listing.title} on MedicalEquipes`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Shared");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage("Link copied");
      }
      window.setTimeout(() => setShareMessage(""), 1800);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareMessage("Could not share");
    }
  }

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
            <a href="/favorites">Favorites</a>
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

            <div className="listingTitleRow">
              <h1>{listing.title}</h1>
              <button className="listingShareButton" type="button" onClick={shareListing} aria-label="Share listing" title="Share listing">
                <span aria-hidden="true">↗</span>
                Share
              </button>
            </div>
            {shareMessage && <small className="listingShareMessage" role="status">{shareMessage}</small>}

            <div className="listingPrice">
              {listing.price > 0 ? `Rs. ${listing.price.toLocaleString("en-PK")}` : "Ask for Price"}
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
    <span className="eyebrow">
      SELLER INFORMATION
    </span>

    <h2>
      {listing.sellerBusinessName ||
        listing.sellerFullName ||
        "Seller"}
    </h2>

    {listing.sellerStatus === "approved" && (
      <p>
        <strong>✓ Approved Seller</strong>
      </p>
    )}
  </div>

  {listing.sellerFullName && (
    <div className="sellerContactRow">
      <span>Contact person</span>
      <strong>{listing.sellerFullName}</strong>
    </div>
  )}

  {listing.sellerBusinessName && (
    <div className="sellerContactRow">
      <span>Business</span>
      <strong>{listing.sellerBusinessName}</strong>
    </div>
  )}

  {listing.sellerCity && (
    <div className="sellerContactRow">
      <span>Seller location</span>
      <strong>{listing.sellerCity}</strong>
    </div>
  )}

 {isLoggedIn ? (
  <>
    {listing.contactName && (
      <div className="sellerContactRow">
        <span>Listing contact</span>
        <strong>{listing.contactName}</strong>
      </div>
    )}

    {listing.contactPhone && (
      <div className="sellerContactRow">
        <span>Phone / WhatsApp</span>
        <strong>{listing.contactPhone}</strong>
      </div>
    )}

    {listing.contactEmail && (
      <div className="sellerContactRow">
        <span>Email</span>
        <strong>{listing.contactEmail}</strong>
      </div>
    )}

    {sellerCardUrl && (
      <div className="sellerContactRow">
        <span>Verification</span>

        <a
          href={sellerCardUrl}
          target="_blank"
          rel="noreferrer"
        >
          View Visiting Card
        </a>
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
  </>
) : (
  <div className="sellerLoginRequired">
    <p>
      Login to view seller contact details.
    </p>

    <button
      type="button"
      className="primary"
      onClick={() => setAuthOpen(true)}
    >
      Login to Contact Seller
    </button>
  </div>
)}

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

  <button
    type="button"
    className="reportListingButton"
    onClick={() => {
      if (!isLoggedIn) {
        setAuthOpen(true);
        return;
      }

      setReportOpen(true);
      setReportMessage("");
    }}
  >
    Report Listing
  </button>
</aside>
        </div>
      </div>
      {reportOpen && (
        <div
          className="reportModalBackdrop"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="reportModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reportModalHeader">
              <div>
                <span className="eyebrow">MARKETPLACE SAFETY</span>
                <h2>Report Listing</h2>
              </div>

              <button
                type="button"
                className="reportModalClose"
                onClick={() => setReportOpen(false)}
              >
                ×
              </button>
            </div>

            <p>Tell us why this listing should be reviewed.</p>

            <label className="reportField">
              <span>Reason</span>

              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="misleading_information">
                  Misleading information
                </option>
                <option value="suspected_fraud">Suspected fraud</option>
                <option value="duplicate_listing">Duplicate listing</option>
                <option value="wrong_category">Wrong category</option>
                <option value="inappropriate_content">
                  Inappropriate content
                </option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="reportField">
              <span>Additional details</span>

              <textarea
                value={reportDescription}
                onChange={(event) =>
                  setReportDescription(event.target.value)
                }
                rows={5}
                maxLength={1000}
                placeholder="Optional details for the admin..."
              />
            </label>

            {reportMessage && (
              <p className="reportMessage">{reportMessage}</p>
            )}

            <div className="reportModalActions">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                disabled={reportSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary"
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    <AuthModal
  open={authOpen}
  onClose={() => setAuthOpen(false)}
  onLoginSuccess={() => {
    setAuthOpen(false);
    setIsLoggedIn(true);

    const session = getStoredSession();

    if (
      session?.access_token &&
      listing?.sellerVisitingCardUrl
    ) {
      getVisitingCardSignedUrl(
        session,
        listing.sellerVisitingCardUrl
      )
        .then(setSellerCardUrl)
        .catch(console.error);
    }
  }}
/>
    </main>
  );
}

