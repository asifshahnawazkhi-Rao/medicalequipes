"use client";

import { useEffect, useMemo, useState } from "react";
import { clearSession, getStoredSession } from "../auth";
import {
  convertBuyerToApprovedSeller, getAdminListings, getAdminReports, getAdminSellers, getProfile,
  getVisitingCardSignedUrl, updateAdminListingStatus, updateAdminReportStatus,
  updateSellerApproval, type AdminListing, type AdminReport, type AdminSellerProfile,
} from "../supabaseData";

type Section = "overview" | "sellers" | "listings" | "reports" | "backups";
type SellerWithCard = AdminSellerProfile & { cardUrl?: string };

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [sellers, setSellers] = useState<SellerWithCard[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [sellerFilter, setSellerFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<SellerWithCard | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (!session?.access_token) { window.location.replace("/"); return; }
    async function load() {
      try {
        const profile = await getProfile(session!);
        if (!profile || profile.role.toLowerCase() !== "admin") { window.location.replace("/dashboard"); return; }
        const [sellerRows, listingRows, reportRows] = await Promise.all([
          getAdminSellers(session!), getAdminListings(session!), getAdminReports(session!),
        ]);
        const cards = await Promise.all(sellerRows.map(async (seller) => {
          if (!seller.visitingCardUrl) return seller;
          try { return { ...seller, cardUrl: await getVisitingCardSignedUrl(session!, seller.visitingCardUrl) }; }
          catch { return seller; }
        }));
        const listingsWithSellers = listingRows.map((listing) => {
          const seller = sellerRows.find((item) => item.id === listing.sellerId);
          return { ...listing, sellerName: seller?.fullName ?? "", sellerBusinessName: seller?.businessName ?? "" };
        });
        setSellers(cards); setListings(listingsWithSellers); setReports(reportRows);
      } catch (err) { setError(err instanceof Error ? err.message : "Could not load admin dashboard."); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const stats = useMemo(() => ({
    sellers: sellers.filter((x) => x.role === "seller").length,
    pendingSellers: sellers.filter((x) => x.role === "seller" && x.status === "pending").length,
    listings: listings.length,
    activeListings: listings.filter((x) => x.status === "active").length,
    pendingReports: reports.filter((x) => x.status === "pending").length,
    resolvedReports: reports.filter((x) => x.status === "resolved").length,
  }), [sellers, listings, reports]);

  const visibleSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((x) => (sellerFilter === "all" || x.status === sellerFilter) && (!q || `${x.fullName} ${x.businessName} ${x.phone} ${x.city}`.toLowerCase().includes(q)));
  }, [sellers, sellerFilter, search]);
  const visibleListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((x) => (listingFilter === "all" || x.status === listingFilter) && (!q || `${x.title} ${x.sellerName} ${x.sellerBusinessName} ${x.city}`.toLowerCase().includes(q)));
  }, [listings, listingFilter, search]);
  const visibleReports = useMemo(() => reports.filter((x) => reportFilter === "all" || x.status === reportFilter), [reports, reportFilter]);

  async function sellerStatus(id: string, status: "approved" | "rejected") {
    const session = getStoredSession(); if (!session) return;
    try { setBusyId(id); setError(""); await updateSellerApproval(session, id, status); setSellers((rows) => rows.map((x) => x.id === id ? { ...x, status } : x)); setMessage(`Seller ${status}.`); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update seller."); }
    finally { setBusyId(""); }
  }
  async function convertToSeller(id: string) {
    const session = getStoredSession(); if (!session) return;
    try {
      setBusyId(id); setError("");
      await convertBuyerToApprovedSeller(session, id);
      setSellers((rows) => rows.map((x) => x.id === id ? { ...x, role: "seller", status: "approved" } : x));
      setSelectedSeller((seller) => seller?.id === id ? { ...seller, role: "seller", status: "approved" } : seller);
      setMessage("Buyer account converted to an approved seller.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not convert this account to seller."); }
    finally { setBusyId(""); }
  }
  async function listingStatus(id: string, status: "active" | "sold" | "draft" | "out_of_stock") {
    const session = getStoredSession(); if (!session) return;
    try { setBusyId(id); setError(""); await updateAdminListingStatus(session, id, status); setListings((rows) => rows.map((x) => x.id === id ? { ...x, status } : x)); setMessage("Listing status updated."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update listing."); }
    finally { setBusyId(""); }
  }
  async function reportStatus(id: string, status: "reviewed" | "resolved" | "dismissed") {
    const session = getStoredSession(); if (!session) return;
    try { setBusyId(id); setError(""); await updateAdminReportStatus(session, id, status); setReports((rows) => rows.map((x) => x.id === id ? { ...x, status } : x)); setMessage("Report status updated."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update report."); }
    finally { setBusyId(""); }
  }
  function logout() { clearSession(); window.location.assign("/"); }

  function downloadMarketplaceBackup() {
    const createdAt = new Date();
    const safeSellers = sellers.map(({ cardUrl: _cardUrl, ...seller }) => seller);
    const backup = {
      backupFormat: "medicalequipes-marketplace-v1",
      website: "https://www.medicalequipes.com",
      createdAt: createdAt.toISOString(),
      summary: { sellers: safeSellers.length, listings: listings.length, reports: reports.length },
      data: { sellers: safeSellers, listings, reports },
      excludedForSecurity: ["Passwords and authentication sessions", "Supabase secret keys", "Facebook access tokens", "Temporary signed visiting-card links"],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medicalequipes-backup-${createdAt.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Marketplace backup downloaded successfully.");
  }

  if (loading) return <main className="dashboardPage">Loading admin dashboard...</main>;

  const filters = (items: string[], current: string, change: (value: string) => void) => (
    <div className="adminFilters">{items.map((item) => <button key={item} className={current === item ? "active" : ""} type="button" onClick={() => change(item)}>{item.replaceAll("_", " ")}</button>)}</div>
  );

  return <main className="adminDashboardPage">
    <header className="header"><div className="container nav"><a className="brand" href="/"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></a><nav><a href="/">Marketplace</a><a href="/dashboard">Seller Dashboard</a><a href="/profile">Profile</a></nav><button className="adminLogout" type="button" onClick={logout}>Logout</button></div></header>
    <div className="container adminDashboardContainer">
      <section className="adminHero"><div><span className="eyebrow">ADMIN CONTROL CENTER</span><h1>Marketplace Administration</h1><p>Manage sellers, listings and marketplace safety from one place.</p></div><div className="adminHeroBadge">Secure Admin Area</div></section>
      <nav className="adminTabs">{(["overview", "sellers", "listings", "reports", "backups"] as Section[]).map((item) => <button key={item} className={section === item ? "active" : ""} type="button" onClick={() => { setSection(item); setSearch(""); }}>{item === "reports" && stats.pendingReports ? `Reports (${stats.pendingReports})` : item}</button>)}</nav>
      {message && <div className="authMessage adminMessage">{message}</div>}{error && <div className="formError adminMessage">{error}</div>}

      {section === "overview" && <><section className="adminStats"><div><span>Total Sellers</span><strong>{stats.sellers}</strong></div><div><span>Pending Sellers</span><strong>{stats.pendingSellers}</strong></div><div><span>Total Listings</span><strong>{stats.listings}</strong></div><div><span>Active Listings</span><strong>{stats.activeListings}</strong></div><div><span>Pending Reports</span><strong>{stats.pendingReports}</strong></div><div><span>Resolved Reports</span><strong>{stats.resolvedReports}</strong></div></section><section className="adminQuickGrid"><button onClick={() => setSection("sellers")}><span>Seller Approvals</span><strong>{stats.pendingSellers} pending</strong><small>Review profiles and verification cards.</small></button><button onClick={() => setSection("listings")}><span>Listing Control</span><strong>{stats.listings} listings</strong><small>Control listing availability and status.</small></button><button onClick={() => setSection("reports")}><span>Safety Reports</span><strong>{stats.pendingReports} pending</strong><small>Review reports submitted by users.</small></button><button onClick={() => setSection("backups")}><span>Backup My Data</span><strong>Secure export</strong><small>Download a copy of marketplace development data.</small></button></section></>}

      {section === "backups" && <section className="adminPanel adminBackupPanel"><div className="adminPanelHead"><div><h2>Backup My Data</h2><p>Download a dated copy of the MedicalEquipes marketplace data.</p></div></div><div className="adminBackupGrid"><article><span className="adminBackupIcon">↓</span><div><h3>Marketplace Data Backup</h3><p>Includes seller profiles, equipment listings, statuses and safety reports currently visible to the admin account.</p><ul><li>{stats.sellers} seller records</li><li>{stats.listings} listing records</li><li>{reports.length} report records</li></ul><button type="button" onClick={downloadMarketplaceBackup}>Download JSON Backup</button></div></article><article><span className="adminBackupIcon">✓</span><div><h3>Development Source Backup</h3><p>Your website source code and development history are stored separately in the connected GitHub repository.</p><a href="https://github.com/asifshahnawazkhi-Rao/medicalequipes" target="_blank" rel="noreferrer">Open GitHub Repository</a><small>Passwords, secret keys, sessions and access tokens are never included in downloads.</small></div></article></div></section>}

      {section === "sellers" && <section className="adminPanel"><div className="adminPanelHead"><div><h2>User & Seller Management</h2><p>Convert existing buyers to sellers, or review registered sellers.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." /></div>{filters(["all", "pending", "approved", "rejected"], sellerFilter, setSellerFilter)}<div className="adminTableWrap"><table className="adminTable"><thead><tr><th>User</th><th>Contact</th><th>City</th><th>Role / Status</th><th>Verification</th><th>Actions</th></tr></thead><tbody>{visibleSellers.map((x) => <tr key={x.id}><td><button className="adminSellerLink" type="button" onClick={() => setSelectedSeller(x)}><strong>{x.businessName || x.fullName || "User"}</strong><small>{x.fullName}</small></button></td><td>{x.phone || "—"}</td><td>{x.city || "—"}</td><td><small className="adminRoleLabel">{x.role}</small><span className={`adminStatus ${x.status}`}>{x.status}</span></td><td>{x.cardUrl ? <a href={x.cardUrl} target="_blank" rel="noreferrer">View card</a> : "Not provided"}</td><td><div className="adminRowActions"><button type="button" onClick={() => setSelectedSeller(x)}>View Details</button>{x.role === "buyer" ? <button disabled={busyId === x.id} onClick={() => convertToSeller(x.id)}>Convert to Seller</button> : <>{x.status !== "approved" && <button disabled={busyId === x.id} onClick={() => sellerStatus(x.id, "approved")}>Approve</button>}{x.status !== "rejected" && <button disabled={busyId === x.id} onClick={() => sellerStatus(x.id, "rejected")}>Reject</button>}</>}</div></td></tr>)}</tbody></table>{!visibleSellers.length && <div className="adminEmpty">No users found.</div>}</div></section>}

      {selectedSeller && <div className="adminSellerModal" role="dialog" aria-modal="true" aria-labelledby="admin-seller-title" onClick={() => setSelectedSeller(null)}><section className="adminSellerDetails" onClick={(event) => event.stopPropagation()}><button className="adminSellerClose" type="button" aria-label="Close seller details" onClick={() => setSelectedSeller(null)}>×</button><span className="eyebrow">USER DETAILS</span><h2 id="admin-seller-title">{selectedSeller.businessName || selectedSeller.fullName || "User"}</h2><div className="adminSellerDetailGrid"><div><span>Contact person</span><strong>{selectedSeller.fullName || "Not provided"}</strong></div><div><span>Phone</span><strong>{selectedSeller.phone || "Not provided"}</strong></div><div><span>City</span><strong>{selectedSeller.city || "Not provided"}</strong></div><div><span>Role</span><strong>{selectedSeller.role}</strong></div><div><span>Status</span><strong className={`adminStatus ${selectedSeller.status}`}>{selectedSeller.status}</strong></div><div><span>Total listings</span><strong>{listings.filter((listing) => listing.sellerId === selectedSeller.id).length}</strong></div></div><div className="adminSellerDetailActions">{selectedSeller.role === "buyer" && <button type="button" disabled={busyId === selectedSeller.id} onClick={() => convertToSeller(selectedSeller.id)}>Convert to Seller</button>}{selectedSeller.cardUrl && <a href={selectedSeller.cardUrl} target="_blank" rel="noreferrer">View Visiting Card</a>}{selectedSeller.role === "seller" && selectedSeller.status === "approved" && <a href={`/seller/${selectedSeller.id}`} target="_blank" rel="noreferrer">Open Public Seller Profile</a>}</div></section></div>}

      {section === "listings" && <section className="adminPanel"><div className="adminPanelHead"><div><h2>Listing Management</h2><p>Monitor and control marketplace listings.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." /></div>{filters(["all", "active", "out_of_stock", "sold", "draft"], listingFilter, setListingFilter)}<div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Listing</th><th>Seller</th><th>Price</th><th>City</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleListings.map((x) => <tr key={x.id}><td><a href={`/listing/${x.id}`} target="_blank"><strong>{x.title}</strong></a><small>{x.createdAt ? new Date(x.createdAt).toLocaleDateString("en-PK") : ""}</small></td><td>{x.sellerBusinessName || x.sellerName || "—"}</td><td>{x.price > 0 ? `Rs. ${x.price.toLocaleString("en-PK")}` : "Ask for Price"}</td><td>{x.city}</td><td><span className={`adminStatus ${x.status}`}>{x.status.replaceAll("_", " ")}</span></td><td><select value={x.status} disabled={busyId === x.id} onChange={(e) => listingStatus(x.id, e.target.value as "active" | "sold" | "draft" | "out_of_stock")}><option value="active">Active</option><option value="out_of_stock">Out of Stock</option><option value="sold">Sold</option><option value="draft">Inactive</option></select></td></tr>)}</tbody></table>{!visibleListings.length && <div className="adminEmpty">No listings found.</div>}</div></section>}

      {section === "reports" && <section className="adminPanel"><div className="adminPanelHead"><div><h2>Marketplace Reports</h2><p>Review safety reports submitted by users.</p></div></div>{filters(["all", "pending", "reviewed", "resolved", "dismissed"], reportFilter, setReportFilter)}<div className="adminReportGrid">{visibleReports.map((x) => <article className="adminReportCard" key={x.id}><div><span className={`adminStatus ${x.status}`}>{x.status}</span><small>{x.createdAt ? new Date(x.createdAt).toLocaleString("en-PK") : ""}</small></div><h3>{x.reason.replaceAll("_", " ")}</h3><p>{x.description || "No additional details provided."}</p>{x.targetType === "listing" && <a href={`/listing/${x.targetId}`} target="_blank">View reported listing →</a>}<div className="adminRowActions"><button disabled={busyId === x.id} onClick={() => reportStatus(x.id, "reviewed")}>Reviewed</button><button disabled={busyId === x.id} onClick={() => reportStatus(x.id, "resolved")}>Resolve</button><button disabled={busyId === x.id} onClick={() => reportStatus(x.id, "dismissed")}>Dismiss</button></div></article>)}</div>{!visibleReports.length && <div className="adminEmpty">No reports in this section.</div>}</section>}
    </div>
  </main>;
}

