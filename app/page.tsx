const categories = [
  ["Diagnostic Equipment", "Ultrasound, ECG, patient monitors and more", "01"],
  ["Surgical Equipment", "OT tables, surgical instruments and accessories", "02"],
  ["Patient Care", "Beds, wheelchairs, stretchers and mobility", "03"],
  ["Laboratory Equipment", "Analyzers, microscopes and lab systems", "04"],
  ["Imaging Equipment", "X-Ray, CT, MRI and imaging accessories", "05"],
  ["Dental Equipment", "Dental chairs, units and instruments", "06"],
];

const listings = [
  ["GE Ultrasound Voluson E10", "Diagnostic Equipment", "Rs. 12,500,000", "Karachi", "Used"],
  ["Dräger Savina 300 Ventilator", "Patient Care", "Rs. 1,850,000", "Lahore", "Refurbished"],
  ["Maquet OT Table", "Surgical Equipment", "Rs. 3,200,000", "Islamabad", "Used"],
  ["Mindray BC-6800 Analyzer", "Laboratory Equipment", "Rs. 4,750,000", "Karachi", "Demo"],
];

export default function Home() {
  return (
    <main>
      <header className="header">
        <div className="container nav">
          <div className="brand"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></div>
          <nav><a href="#categories">Categories</a><a href="#listings">Buy</a><a href="#sell">Sell</a><a href="#sellers">Sellers</a></nav>
          <div className="navActions"><button className="login">Login</button><button className="primary">+ Sell Equipment</button></div>
        </div>
      </header>

      <section className="hero">
        <div className="container heroGrid">
          <div>
            <div className="eyebrow">PAKISTAN'S MEDICAL EQUIPMENT MARKETPLACE</div>
            <h1>Buy & Sell<br /><strong>Medical Equipment</strong></h1>
            <p>Find medical and surgical equipment from verified dealers, hospitals and professionals across Pakistan.</p>
            <div className="searchBox">
              <div className="searchInput"><span>⌕</span><span className="placeholder">Search equipment, brand or model...</span></div>
              <div className="location">Karachi ▾</div>
              <button className="searchBtn">Search</button>
            </div>
            <div className="popular"><b>Popular:</b> Ultrasound · ECG · Ventilator · OT Table · Analyzer</div>
          </div>
          <div className="heroVisual">
            <div className="deviceCard mainDevice"><div className="deviceScreen"><span>MEDICAL</span><b>EQUIPES</b><i>ECG / MONITOR</i></div><div className="deviceBase" /></div>
            <div className="floatCard"><span className="check">✓</span><div><b>Verified Sellers</b><small>Trusted marketplace members</small></div></div>
          </div>
        </div>
      </section>

      <section className="quick container">
        <div><span>⌕</span><div><b>Find Equipment</b><small>Search thousands of listings</small></div></div>
        <div><span>＋</span><div><b>Sell Equipment</b><small>Reach verified buyers</small></div></div>
        <div><span>✓</span><div><b>Verified Sellers</b><small>Buy with confidence</small></div></div>
      </section>

      <section id="categories" className="section container">
        <div className="sectionHead"><div><span className="eyebrow">EXPLORE</span><h2>Browse by Category</h2></div><a href="#">View all categories →</a></div>
        <div className="categoryGrid">{categories.map(([title, desc, n]) => <article className="category" key={title}><div className="catIcon">{n}</div><h3>{title}</h3><p>{desc}</p><span>Explore →</span></article>)}</div>
      </section>

      <section id="listings" className="section mutedSection">
        <div className="container">
          <div className="sectionHead"><div><span className="eyebrow">MARKETPLACE</span><h2>Featured Equipment</h2></div><a href="#">View all listings →</a></div>
          <div className="listingGrid">{listings.map(([title, cat, price, city, condition]) => <article className="listing" key={title}><div className="listingImage"><div className="equipmentShape" /><span className="badge">{condition}</span><button className="heart">♡</button></div><div className="listingBody"><small>{cat}</small><h3>{title}</h3><strong>{price}</strong><p>⌖ {city} <span>·</span> <em>✓ Verified Seller</em></p></div></article>)}</div>
        </div>
      </section>

      <section id="sellers" className="section container">
        <div className="sectionHead"><div><span className="eyebrow">TRUSTED NETWORK</span><h2>Verified Sellers</h2></div><a href="#">Browse sellers →</a></div>
        <div className="sellerGrid">{["ABC Medical Equipment","MediTech Pakistan","HealthCare Solutions"].map((s,i)=><article className="seller" key={s}><div className="avatar">{s[0]}</div><div><h3>{s}</h3><p>✓ Verified Dealer · {["Karachi","Lahore","Islamabad"][i]}</p><small>{[124,86,61][i]} active listings · ★ 4.{8-i}</small></div><button>View Profile</button></article>)}</div>
      </section>

      <section id="sell" className="sellCta"><div className="container sellInner"><div><span className="eyebrow">GROW YOUR BUSINESS</span><h2>Have medical equipment to sell?</h2><p>Reach serious buyers and healthcare businesses across Pakistan.</p></div><button className="lightBtn">+ Post Equipment</button></div></section>

      <section className="section container steps"><div className="sectionHead center"><div><span className="eyebrow">SIMPLE PROCESS</span><h2>How MedicalEquipes Works</h2></div></div><div className="stepGrid">{[["01","Register","Create your account and submit your details."],["02","Get Approved","Our team verifies your profile before selling."],["03","List Equipment","Add photos, specifications and pricing."],["04","Connect","Chat or contact buyers and sellers directly."]].map(([n,t,d])=><div className="step" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>)}</div></section>

      <footer><div className="container footerGrid"><div><div className="brand footerBrand"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></div><p>The professional marketplace for medical and surgical equipment.</p></div><div><b>Marketplace</b><a href="#">Browse Equipment</a><a href="#">Categories</a><a href="#">Verified Sellers</a></div><div><b>Company</b><a href="#">About Us</a><a href="#">Contact</a><a href="#">Help Center</a></div><div><b>Account</b><a href="#">Login</a><a href="#">Register</a><a href="#">Sell Equipment</a></div></div><div className="container copyright">© 2026 MedicalEquipes. All rights reserved.</div></footer>
    </main>
  );
}
