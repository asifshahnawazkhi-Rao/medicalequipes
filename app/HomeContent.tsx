"use client";
import {
  clearSession,
  getStoredSession,
} from "./auth";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addFavorite,
  getCategories,
  getFavoriteListingIds,
  getPublicListings,
  removeFavorite,
  type CategoryOption,
} from "./supabaseData";
import AuthModal from "./AuthModal";


type Listing = [
  string, // id
  string, // title
  string, // category
  string, // formatted price
  string, // city
  string, // condition
  string, // imageUrl
  string, // brand
  string, // model
  number  // numericPrice
];



export default function HomeContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Pakistan");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [marketListings, setMarketListings] = useState<Listing[]>([]);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [conditionFilter, setConditionFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

useEffect(() => {
  function checkSession() {
    const session = getStoredSession();

    setIsLoggedIn(
      Boolean(session?.access_token)
    );
  }

  // Page load par check
  checkSession();

  // Har 30 seconds expired session check
  const interval = window.setInterval(
    checkSession,
    30000
  );

  // User tab/browser par wapas aaye to foran check
  window.addEventListener("focus", checkSession);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener(
      "focus",
      checkSession
    );
  };
}, []);
  useEffect(() => {
  getCategories()
    .then(setCategoryOptions)
    .catch(() => setCategoryOptions([]));
}, []);
  useEffect(() => {
  const session = getStoredSession();

  if (!session?.access_token) {
    setFavorites([]);
    return;
  }

  getFavoriteListingIds(session)
    .then(setFavorites)
    .catch(() => setFavorites([]));
}, [isLoggedIn]);
  
  function contactSeller(id: string) {
    const session = getStoredSession();

    if (!session?.access_token) {
      setPendingContactId(id);
      setAuthOpen(true);
      return;
    }

    window.location.assign(`/listing/${id}`);
  }

  // useEffect etc. continues here...
useEffect(() => {
  getPublicListings()
    .then((rows) => {
      setMarketListings(
       rows.map((item) => [
  item.id,
  item.title,
  item.category,
  `Rs. ${item.price.toLocaleString("en-PK")}`,
  item.city,
  item.condition,
  item.imageUrl,
  item.brand,
  item.model,
  item.price,
])
      );
    })
    .catch(() => setMarketListings([]));
}, []);
const cityOptions = useMemo(() => {
  const uniqueCities = Array.from(
    new Set(
      marketListings
        .map(([, , , , listingCity]) => listingCity.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return ["All Pakistan", ...uniqueCities];
}, [marketListings]);
  const conditionOptions = useMemo(() => {
  const uniqueConditions = Array.from(
    new Set(
      marketListings
        .map(([, , , , , listingCondition]) =>
          listingCondition.trim()
        )
        .filter(Boolean)
    )
  );

  return ["All", ...uniqueConditions];
}, [marketListings]);
  const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;

  return marketListings.filter(
    ([
      ,
      title,
      cat,
      ,
      listingCity,
      condition,
      ,
      brand,
      model,
      numericPrice,
    ]) =>
      (
        !q ||
        `${title} ${cat} ${listingCity} ${condition} ${brand} ${model}`
          .toLowerCase()
          .includes(q)
      ) &&
      (category === "All" || cat === category) &&
      (city === "All Pakistan" || listingCity === city) &&
      (
        conditionFilter === "All" ||
        condition === conditionFilter
      ) &&
      (
        min === null ||
        numericPrice >= min
      ) &&
      (
        max === null ||
        numericPrice <= max
      )
  );
}, [
  query,
  city,
  category,
  conditionFilter,
  minPrice,
  maxPrice,
  marketListings,
]);
  const sortedListings = useMemo(() => {
  const items = [...filtered];

  if (sortBy === "price-low") {
    return items.sort((a, b) => a[9] - b[9]);
  }

  if (sortBy === "price-high") {
    return items.sort((a, b) => b[9] - a[9]);
  }

  // getPublicListings already created_at.desc mein aa rahi hain,
  // isliye original order = newest first.
  return items;
}, [filtered, sortBy]);

  function goToSell() { window.location.assign("/sell"); }
  function search(event?: FormEvent) { event?.preventDefault(); document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" }); }
  function chooseCategory(name: string) { setCategory(name); setTimeout(() => document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" }), 20); }
  async function toggleFavorite(listingId: string) {
  const session = getStoredSession();

  if (!session?.access_token) {
    setAuthOpen(true);
    return;
  }

  const isFavorite = favorites.includes(listingId);

  try {
    if (isFavorite) {
      await removeFavorite(session, listingId);

      setFavorites((items) =>
        items.filter((id) => id !== listingId)
      );
    } else {
      await addFavorite(session, listingId);

      setFavorites((items) => [
        ...items,
        listingId,
      ]);
    }
  } catch (error) {
    console.error(error);
  }
}

  return (
    <main>
      <header className="header"><div className="container nav"><a className="brand" href="#top"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></a><nav><a href="#categories">Categories</a><a href="#listings">Buy</a><button type="button" onClick={goToSell}>Sell</button><a href="#sellers">Sellers</a></nav><div className="navActions">
  {isLoggedIn ? (
  <>
    <a href="/dashboard">Dashboard</a>
    <a href="/favorites">Favorites</a>
    <a href="/profile">Profile</a>

    <button
      type="button"
      className="headerLogoutButton"
      onClick={() => {
        clearSession();
        setIsLoggedIn(false);
        window.location.assign("/");
      }}
    >
      Logout
    </button>
  </>
) : (
  <button
    type="button"
    className="headerLoginButton"
    onClick={() => setAuthOpen(true)}
  >
    Login
  </button>
)}
  <button className="primary" type="button" onClick={goToSell}>
    + Sell Equipment
  </button>
</div></div></header>

      <section id="top" className="hero"><div className="container heroGrid"><div><div className="eyebrow">PAKISTAN&apos;S MEDICAL EQUIPMENT MARKETPLACE</div><h1>Buy & Sell<br /><strong>Medical Equipment</strong></h1><p>Find medical and surgical equipment from verified dealers, hospitals and professionals across Pakistan.</p>
      <form className="searchBox googleSearchBox" onSubmit={search}>
  <div className="searchInput googleSearchInput">
    <span className="searchIcon">⌕</span>

    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search equipment, brand or model..."
      aria-label="Search equipment"
    />
  </div>

  <select
    className="location googleLocation"
    value={city}
    onChange={(e) => setCity(e.target.value)}
    aria-label="Location"
  >
    {cityOptions.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>

  <button className="searchBtn" type="submit">
    Search
  </button>
        
</form>
        <button
  type="button"
  className="filterToggle"
  onClick={() => setShowFilters((value) => !value)}
>
  <span>☷</span>
  {showFilters ? "Hide Filters" : "More Filters"}
</button>

{showFilters && (
  <div className="advancedFilters">
    <select
      value={conditionFilter}
      onChange={(e) => setConditionFilter(e.target.value)}
      aria-label="Condition"
    >
      {conditionOptions.map((option) => (
        <option key={option} value={option}>
          {option === "All" ? "All Conditions" : option}
        </option>
      ))}
    </select>

    <input
      type="number"
      min="0"
      value={minPrice}
      onChange={(e) => setMinPrice(e.target.value)}
      placeholder="Min Price"
    />

    <input
      type="number"
      min="0"
      value={maxPrice}
      onChange={(e) => setMaxPrice(e.target.value)}
      placeholder="Max Price"
    />

    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      aria-label="Category"
    >
      <option value="All">All Categories</option>

      {categoryOptions.map((cat) => (
        <option key={cat.id} value={cat.name}>
          {cat.name}
        </option>
      ))}
    </select>
  </div>
)}
        <div className="popular"><b>Popular:</b> {['Ultrasound','ECG','Ventilator','OT Table','Analyzer'].map((term, i) => <span key={term}><button type="button" onClick={() => { setQuery(term); setTimeout(() => search(), 20); }}>{term}</button>{i < 4 ? ' · ' : ''}</span>)}</div></div><div className="heroVisual"><div className="deviceCard mainDevice"><div className="deviceScreen"><span>MEDICAL</span><b>EQUIPES</b><i>ECG / MONITOR</i></div><div className="deviceBase" /></div><div className="floatCard"><span className="check">✓</span><div><b>Verified Sellers</b><small>Trusted marketplace members</small></div></div></div></div></section>

      <section className="quick container"><button className="quickAction" onClick={() => search()}><span>⌕</span><div><b>Find Equipment</b><small>Search available listings</small></div></button><button className="quickAction" onClick={goToSell}><span>＋</span><div><b>Sell Equipment</b><small>Reach verified buyers</small></div></button><a href="#sellers"><span>✓</span><div><b>Verified Sellers</b><small>Buy with confidence</small></div></a></section>

      <section id="categories" className="section container"><div className="sectionHead"><div><span className="eyebrow">EXPLORE</span><h2>Browse by Category</h2></div><button type="button" onClick={() => chooseCategory("All")}>View all categories →</button></div><div className="categoryGrid">
  {categoryOptions.map((cat, index) => (
    <button
      type="button"
      className={`category ${
        category === cat.name ? "active" : ""
      }`}
      key={cat.id}
      onClick={() => chooseCategory(cat.name)}
    >
      <div className="catIcon">
        {String(index + 1).padStart(2, "0")}
      </div>

      <h3>{cat.name}</h3>

      <p>
        Browse available {cat.name.toLowerCase()} listings.
      </p>

      <span>Explore →</span>
    </button>
  ))}
</div></section>

      <section id="listings" className="section mutedSection"><div className="container"><div className="sectionHead"><div><span className="eyebrow">MARKETPLACE</span><h2>Featured Equipment</h2><p>{filtered.length} listing{filtered.length === 1 ? "" : "s"} found</p></div><button
  type="button"
  onClick={() => {
    setQuery("");
    setCity("All Pakistan");
    setCategory("All");
    setConditionFilter("All");
    setMinPrice("");
    setMaxPrice("");
  }}
>
  Clear filters
</button> </div>
       <div className="marketplaceControls">
  <select
    className="sortSelect"
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    aria-label="Sort listings"
  >
    <option value="newest">Newest First</option>
    <option value="price-low">Price: Low to High</option>
    <option value="price-high">Price: High to Low</option>
  </select>

  <button
    type="button"
    onClick={() => {
      setQuery("");
      setCity("All Pakistan");
      setCategory("All");
      setConditionFilter("All");
      setMinPrice("");
      setMaxPrice("");
      setSortBy("newest");
    }}
  >
    Clear filters
  </button>
</div>
        {filtered.length > 0 ? <div className="listingGrid">{sortedListings.map(([id, title, cat, price, listingCity, condition, imageUrl]) => <article className="listing" key={id}><div className="listingImage">
  {imageUrl ? (
    <img
      src={imageUrl}
      alt={title}
      className="listingPhoto"
    />
  ) : (
    <div className="equipmentShape" />
  )}<span className="badge">{condition}</span><button
  className="heart"
  type="button"
  onClick={() => toggleFavorite(id)}
  aria-label="Save listing"
>
  {favorites.includes(id) ? "♥" : "♡"}
</button></div><div className="listingBody"><small>{cat}</small><h3>{title}</h3><strong>{price}</strong><p>⌖ {listingCity} <span>·</span> <em>✓ Verified Seller</em></p><button type="button" onClick={() => contactSeller(id)}>
  Contact Seller
</button></div></article>)}</div> : <div className="emptyState"><h3>No equipment found</h3><p>Try another keyword, location or category.</p><button
  className="primary"
  type="button"
  onClick={() => {
    setQuery("");
    setCity("All Pakistan");
    setCategory("All");
    setConditionFilter("All");
    setMinPrice("");
    setMaxPrice("");
  }}
>
  Show all equipment
</button></div>}</div></section>

      <section id="sellers" className="section container"><div className="sectionHead"><div><span className="eyebrow">TRUSTED NETWORK</span><h2>Verified Sellers</h2></div><button type="button" onClick={() => setAuthOpen(true)}>Join as a seller →</button></div><div className="sellerGrid">{["ABC Medical Equipment","MediTech Pakistan","HealthCare Solutions"].map((s,i)=><article className="seller" key={s}><div className="avatar">{s[0]}</div><div><h3>{s}</h3><p>✓ Verified Dealer · {["Karachi","Lahore","Islamabad"][i]}</p><small>{[124,86,61][i]} active listings · ★ 4.{8-i}</small></div><button type="button" onClick={() => { setCity(["Karachi","Lahore","Islamabad"][i]); search(); }}>View Listings</button></article>)}</div></section>

      <section id="sell" className="sellCta"><div className="container sellInner"><div><span className="eyebrow">GROW YOUR BUSINESS</span><h2>Have medical equipment to sell?</h2><p>Reach serious buyers and healthcare businesses across Pakistan.</p></div><button className="lightBtn" onClick={goToSell}>+ Post Equipment</button></div></section>

      <section className="section container steps"><div className="sectionHead center"><div><span className="eyebrow">SIMPLE PROCESS</span><h2>How MedicalEquipes Works</h2></div></div><div className="stepGrid">{[["01","Register","Create your account and submit your details."],["02","Get Approved","Our team verifies your profile before selling."],["03","List Equipment","Add photos, specifications and pricing."],["04","Connect","Chat or contact buyers and sellers directly."]].map(([n,t,d])=><div className="step" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>)}</div></section>

      <footer><div className="container footerGrid"><div><div className="brand footerBrand"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></div><p>The professional marketplace for medical and surgical equipment.</p></div><div><b>Marketplace</b><a href="#listings">Browse Equipment</a><a href="#categories">Categories</a><a href="#sellers">Verified Sellers</a></div><div><b>Company</b><a href="#top">About Us</a><a href="mailto:support@medicalequipes.com">Contact</a><a href="#top">Help Center</a></div><div><b>Account</b><button onClick={() => setAuthOpen(true)}>Login / Register</button><button onClick={goToSell}>Sell Equipment</button></div></div><div className="container copyright">© 2026 MedicalEquipes. All rights reserved.</div></footer><AuthModal
  open={authOpen}
  onClose={() => setAuthOpen(false)}
  onLoginSuccess={() => {
    setIsLoggedIn(true);
    if (pendingContactId) {
      const id = pendingContactId;
      setPendingContactId(null);
      window.location.assign(`/listing/${id}`);
    }
  }}
/>
    </main>
  );
}
