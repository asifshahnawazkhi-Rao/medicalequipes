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
  getPublicSellers,
  removeFavorite,
  type PublicSeller,
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
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
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
  const [loggedInUser, setLoggedInUser] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [publicSellers, setPublicSellers] = useState<PublicSeller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
useEffect(() => {
  function checkSession() {
    const session = getStoredSession();

    setIsLoggedIn(Boolean(session?.access_token));
    setLoggedInUser(session?.user?.email ?? "");
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
  useEffect(() => {
  getPublicSellers()
    .then(setPublicSellers)
    .catch((error) => {
      console.error("Could not load verified sellers:", error);
      setPublicSellers([]);
    });
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
    <a className="headerUser" href="/profile" title={loggedInUser || "Logged in user"}>
      <span className="headerUserAvatar">
        {(loggedInUser || "U").charAt(0).toUpperCase()}
      </span>
      <span className="headerUserText">
        <small>Signed in as</small>
        <strong>{loggedInUser || "My Account"}</strong>
      </span>
    </a>
    <a href="/dashboard">Dashboard</a>
    <a href="/favorites">Favorites</a>
    <a href="/profile">Profile</a>

    <button
      type="button"
      className="headerLogoutButton"
      onClick={() => {
        clearSession();
        setIsLoggedIn(false);
        setLoggedInUser("");
        window.location.assign("/");
      }}
    >
      Logout
    </button>
  </>
) : (
  <div className="headerAuthButtons">
    <button
      type="button"
      className="headerLoginButton"
      onClick={() => {
        setAuthMode("login");
        setAuthOpen(true);
      }}
    >
      Login
    </button>
    <button
      type="button"
      className="headerSignupButton"
      onClick={() => {
        setAuthMode("signup");
        setAuthOpen(true);
      }}
    >
      Sign Up
    </button>
  </div>
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
        <div className="popular"><b>Popular:</b> {['Ultrasound','ECG','Ventilator','OT Table','Analyzer'].map((term) => <button className={query === term ? "popularChip active" : "popularChip"} key={term} type="button" onClick={() => { setQuery(term); setTimeout(() => search(), 20); }}>{term}</button>)}</div></div><div className="heroVisual"><div className="deviceCard mainDevice"><div className="monitorShell"><div className="deviceScreen monitorScreen"><div className="monitorTop"><span>ECG MONITOR</span><i>● LIVE</i></div><div className="monitorDisplay"><svg className="ecgWave" viewBox="0 0 560 120" role="img" aria-label="Live ECG waveform"><defs><pattern id="ecgGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.7" /></pattern></defs><rect width="560" height="120" fill="url(#ecgGrid)" /><polyline points="0,69 45,69 58,64 68,70 80,69 94,25 108,104 122,50 136,69 186,69 200,64 210,70 223,69 237,25 251,104 265,50 279,69 329,69 343,64 353,70 366,69 380,25 394,104 408,50 422,69 472,69 486,64 496,70 509,69 523,25 537,104 551,50 560,69" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="monitorVitals"><div><span>HR</span><b>78</b><small>BPM</small></div><div><span>SpO₂</span><b>98</b><small>%</small></div><div><span>NIBP</span><b>120/80</b><small>mmHg</small></div></div></div><div className="monitorBrand"><span>MEDICAL</span><strong>EQUIPES</strong></div></div><div className="monitorControls"><span /><span /><span /><span /><b /></div></div><div className="deviceStand"><span /><b /></div></div><div className="floatCard"><span className="check">✓</span><div><b>Verified Sellers</b><small>Trusted marketplace members</small></div></div></div></div></section>

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
  <a
    className="listingImageLink"
    href={`/listing/${id}`}
    aria-label={`View ${title}`}
  >
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={title}
        className="listingPhoto"
      />
    ) : (
      <div className="equipmentShape" />
    )}
  </a><span className="badge">{condition}</span><button
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

   <section id="sellers" className="section container">
  <div className="sectionHead">
    <div>
      <span className="eyebrow">TRUSTED NETWORK</span>
      <h2>Verified Sellers</h2>
    </div>

    <button
      type="button"
      onClick={() => {
        if (isLoggedIn) {
          window.location.assign("/profile");
        } else {
          setAuthOpen(true);
        }
      }}
    >
      Join as a seller →
    </button>
  </div>

  {publicSellers.length > 0 ? (
    <div className="sellerGrid">
      {publicSellers.map((seller) => {
        const sellerName =
          seller.businessName ||
          seller.fullName ||
          "Verified Seller";

        return (
          <article className="seller" key={seller.id}>
            <div className="avatar">
              {sellerName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h3>{sellerName}</h3>

              <p>
                ✓ Verified Seller
                {seller.city ? ` · ${seller.city}` : ""}
              </p>

              <small>
                {seller.activeListingCount} active{" "}
                {seller.activeListingCount === 1
                  ? "listing"
                  : "listings"}
              </small>
            </div>

            <div className="sellerActions">
              <button
                type="button"
                onClick={() => {
                  setSelectedSellerId(seller.id);

                  window.setTimeout(() => {
                    document
                      .getElementById("listings")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }, 20);
                }}
              >
                View Listings
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.assign(
                    `/seller/${seller.id}`
                  );
                }}
              >
                View Seller
              </button>
            </div>
          </article>
        );
      })}
    </div>
  ) : (
    <div className="emptyState">
      <h3>No verified sellers yet</h3>

      <p>
        Approved marketplace sellers will appear here.
      </p>
    </div>
  )}
</section>
<section id="sell" className="sellCta">
  <div className="container sellInner">
    <div>
      <span className="eyebrow">GROW YOUR BUSINESS</span>
      <h2>Have medical equipment to sell?</h2>
      <p>
        Reach serious buyers and healthcare businesses across Pakistan.
      </p>
    </div>

    <button className="lightBtn" onClick={goToSell}>
      + Post Equipment
    </button>
  </div>
</section>

<section className="section container steps">
  <div className="sectionHead center">
    <div>
      <span className="eyebrow">SIMPLE PROCESS</span>
      <h2>How MedicalEquipes Works</h2>
    </div>
  </div>

  <div className="stepGrid">
    {[
      ["01", "Register", "Create your account and submit your details."],
      ["02", "Get Approved", "Our team verifies your profile before selling."],
      ["03", "List Equipment", "Add photos, specifications and pricing."],
      ["04", "Connect", "Chat or contact buyers and sellers directly."],
    ].map(([n, t, d]) => (
      <div className="step" key={n}>
        <b>{n}</b>
        <h3>{t}</h3>
        <p>{d}</p>
      </div>
    ))}
  </div>
</section>

<footer>
  <div className="container footerGrid">
    <div>
      <div className="brand footerBrand">
        <span className="brandMark">+</span>
        <span>
          Medical<span>Equipes</span>
        </span>
      </div>

      <p>
        The professional marketplace for medical and surgical equipment.
      </p>
    </div>

    <div>
      <b>Marketplace</b>
      <a href="#listings">Browse Equipment</a>
      <a href="#categories">Categories</a>
      <a href="#sellers">Verified Sellers</a>
    </div>

    <div>
      <b>Company</b>
      <a href="/about">About Us</a>
      <a href="/contact">Contact</a>
      <a href="/help">Help Center</a>
    </div>

    <div>
      <b>Account</b>
      <button type="button" onClick={() => setAuthOpen(true)}>
        Login / Register
      </button>

      <button type="button" onClick={goToSell}>
        Sell Equipment
      </button>
    </div>
  </div>

  <div className="container copyright">
    © 2026 MedicalEquipes. All rights reserved.
  </div>
</footer>

<AuthModal
  open={authOpen}
  initialMode={authMode}
  onClose={() => {
    setAuthOpen(false);
    setAuthMode("login");
  }}
  onLoginSuccess={() => {
    setIsLoggedIn(true);
    setLoggedInUser(getStoredSession()?.user?.email ?? "");

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

