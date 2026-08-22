"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getPublicListings } from "./supabaseData";
import AuthModal from "./AuthModal";

type Listing = [string, string, string, string, string];

const categories = [
  ["Diagnostic Equipment", "Ultrasound, ECG, patient monitors and more", "01"],
  ["Surgical Equipment", "OT tables, surgical instruments and accessories", "02"],
  ["Patient Care", "Beds, wheelchairs, stretchers and mobility", "03"],
  ["Laboratory Equipment", "Analyzers, microscopes and lab systems", "04"],
  ["Imaging Equipment", "X-Ray, CT, MRI and imaging accessories", "05"],
  ["Dental Equipment", "Dental chairs, units and instruments", "06"],
];



export default function HomeContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Pakistan");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
 const [marketListings, setMarketListings] = useState<Listing[]>([]);

useEffect(() => {
  getPublicListings()
    .then((rows) => {
      setMarketListings(
        rows.map((item) => [
          item.title,
          item.category,
          `Rs. ${item.price.toLocaleString("en-PK")}`,
          item.city,
          item.condition,
        ])
      );
    })
    .catch(() => setMarketListings([]));
}, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketListings.filter(([title, cat, , listingCity]) =>
      (!q || `${title} ${cat} ${listingCity}`.toLowerCase().includes(q)) &&
      (category === "All" || cat === category) &&
      (city === "All Pakistan" || listingCity === city)
    );
 }, [query, city, category, marketListings]);

  function goToSell() { window.location.assign("/sell"); }
  function search(event?: FormEvent) { event?.preventDefault(); document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" }); }
  function chooseCategory(name: string) { setCategory(name); setTimeout(() => document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" }), 20); }
  function toggleFavorite(title: string) { setFavorites((items) =>
  items.includes(title)
    ? items.filter((item) => item !== title)
    : [...items, title]
); }

  return (
    <main>
      <header className="header"><div className="container nav"><a className="brand" href="#top"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></a><nav><a href="#categories">Categories</a><a href="#listings">Buy</a><button type="button" onClick={goToSell}>Sell</button><a href="#sellers">Sellers</a></nav><div className="navActions"><button className="login" onClick={() => setAuthOpen(true)}>Login</button><button className="primary" onClick={goToSell}>+ Sell Equipment</button></div></div></header>

      <section id="top" className="hero"><div className="container heroGrid"><div><div className="eyebrow">PAKISTAN&apos;S MEDICAL EQUIPMENT MARKETPLACE</div><h1>Buy & Sell<br /><strong>Medical Equipment</strong></h1><p>Find medical and surgical equipment from verified dealers, hospitals and professionals across Pakistan.</p><form className="searchBox" onSubmit={search}><div className="searchInput"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search equipment, brand or model..." aria-label="Search equipment" /></div><select className="location" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Location"><option>All Pakistan</option><option>Karachi</option><option>Lahore</option><option>Islamabad</option></select><button className="searchBtn" type="submit">Search</button></form><div className="popular"><b>Popular:</b> {['Ultrasound','ECG','Ventilator','OT Table','Analyzer'].map((term, i) => <span key={term}><button type="button" onClick={() => { setQuery(term); setTimeout(() => search(), 20); }}>{term}</button>{i < 4 ? ' · ' : ''}</span>)}</div></div><div className="heroVisual"><div className="deviceCard mainDevice"><div className="deviceScreen"><span>MEDICAL</span><b>EQUIPES</b><i>ECG / MONITOR</i></div><div className="deviceBase" /></div><div className="floatCard"><span className="check">✓</span><div><b>Verified Sellers</b><small>Trusted marketplace members</small></div></div></div></div></section>

      <section className="quick container"><button className="quickAction" onClick={() => search()}><span>⌕</span><div><b>Find Equipment</b><small>Search available listings</small></div></button><button className="quickAction" onClick={goToSell}><span>＋</span><div><b>Sell Equipment</b><small>Reach verified buyers</small></div></button><a href="#sellers"><span>✓</span><div><b>Verified Sellers</b><small>Buy with confidence</small></div></a></section>

      <section id="categories" className="section container"><div className="sectionHead"><div><span className="eyebrow">EXPLORE</span><h2>Browse by Category</h2></div><button type="button" onClick={() => chooseCategory("All")}>View all categories →</button></div><div className="categoryGrid">{categories.map(([title, desc, n]) => <button type="button" className={`category ${category === title ? "active" : ""}`} key={title} onClick={() => chooseCategory(title)}><div className="catIcon">{n}</div><h3>{title}</h3><p>{desc}</p><span>Explore →</span></button>)}</div></section>

      <section id="listings" className="section mutedSection"><div className="container"><div className="sectionHead"><div><span className="eyebrow">MARKETPLACE</span><h2>Featured Equipment</h2><p>{filtered.length} listing{filtered.length === 1 ? "" : "s"} found</p></div><button type="button" onClick={() => { setQuery(""); setCity("All Pakistan"); setCategory("All"); }}>Clear filters</button></div>{filtered.length > 0 ? <div className="listingGrid">{filtered.map(([title, cat, price, listingCity, condition]) => <article className="listing" key={title}><div className="listingImage"><div className="equipmentShape" /><span className="badge">{condition}</span><button className="heart" type="button" onClick={() => toggleFavorite(title)} aria-label="Save listing">{favorites.includes(title) ? "♥" : "♡"}</button></div><div className="listingBody"><small>{cat}</small><h3>{title}</h3><strong>{price}</strong><p>⌖ {listingCity} <span>·</span> <em>✓ Verified Seller</em></p><button type="button" onClick={() => setAuthOpen(true)}>Contact Seller</button></div></article>)}</div> : <div className="emptyState"><h3>No equipment found</h3><p>Try another keyword, location or category.</p><button className="primary" type="button" onClick={() => { setQuery(""); setCity("All Pakistan"); setCategory("All"); }}>Show all equipment</button></div>}</div></section>

      <section id="sellers" className="section container"><div className="sectionHead"><div><span className="eyebrow">TRUSTED NETWORK</span><h2>Verified Sellers</h2></div><button type="button" onClick={() => setAuthOpen(true)}>Join as a seller →</button></div><div className="sellerGrid">{["ABC Medical Equipment","MediTech Pakistan","HealthCare Solutions"].map((s,i)=><article className="seller" key={s}><div className="avatar">{s[0]}</div><div><h3>{s}</h3><p>✓ Verified Dealer · {["Karachi","Lahore","Islamabad"][i]}</p><small>{[124,86,61][i]} active listings · ★ 4.{8-i}</small></div><button type="button" onClick={() => { setCity(["Karachi","Lahore","Islamabad"][i]); search(); }}>View Listings</button></article>)}</div></section>

      <section id="sell" className="sellCta"><div className="container sellInner"><div><span className="eyebrow">GROW YOUR BUSINESS</span><h2>Have medical equipment to sell?</h2><p>Reach serious buyers and healthcare businesses across Pakistan.</p></div><button className="lightBtn" onClick={goToSell}>+ Post Equipment</button></div></section>

      <section className="section container steps"><div className="sectionHead center"><div><span className="eyebrow">SIMPLE PROCESS</span><h2>How MedicalEquipes Works</h2></div></div><div className="stepGrid">{[["01","Register","Create your account and submit your details."],["02","Get Approved","Our team verifies your profile before selling."],["03","List Equipment","Add photos, specifications and pricing."],["04","Connect","Chat or contact buyers and sellers directly."]].map(([n,t,d])=><div className="step" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>)}</div></section>

      <footer><div className="container footerGrid"><div><div className="brand footerBrand"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></div><p>The professional marketplace for medical and surgical equipment.</p></div><div><b>Marketplace</b><a href="#listings">Browse Equipment</a><a href="#categories">Categories</a><a href="#sellers">Verified Sellers</a></div><div><b>Company</b><a href="#top">About Us</a><a href="mailto:support@medicalequipes.com">Contact</a><a href="#top">Help Center</a></div><div><b>Account</b><button onClick={() => setAuthOpen(true)}>Login / Register</button><button onClick={goToSell}>Sell Equipment</button></div></div><div className="container copyright">© 2026 MedicalEquipes. All rights reserved.</div></footer><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
