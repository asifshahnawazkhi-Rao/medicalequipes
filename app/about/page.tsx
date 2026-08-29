import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="infoPage">
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            <span className="brandMark">+</span>
            <span>Medical<span>Equipes</span></span>
          </Link>
          <nav>
            <Link href="/#listings">Marketplace</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/help">Help Center</Link>
          </nav>
        </div>
      </header>

      <section className="infoHero">
        <div className="container infoHeroInner">
          <span className="eyebrow">ABOUT MEDICALEQUIPES</span>
          <h1>A focused marketplace for medical equipment</h1>
          <p>
            MedicalEquipes helps healthcare professionals, hospitals, clinics,
            laboratories, and verified sellers discover and list medical and
            surgical equipment across Pakistan.
          </p>
        </div>
      </section>

      <section className="container infoContent">
        <div className="infoIntro">
          <h2>Built for clearer, safer connections</h2>
          <p>
            Our platform brings equipment information, seller details, photos,
            pricing, and location into one professional marketplace. Buyers can
            compare available equipment while sellers can reach relevant
            healthcare businesses.
          </p>
        </div>

        <div className="infoCardGrid">
          <article className="infoCard">
            <span>01</span>
            <h3>Verified sellers</h3>
            <p>Seller profiles are reviewed before equipment can be published.</p>
          </article>
          <article className="infoCard">
            <span>02</span>
            <h3>Detailed listings</h3>
            <p>Listings include specifications, condition, location, pricing, and photos.</p>
          </article>
          <article className="infoCard">
            <span>03</span>
            <h3>Direct connection</h3>
            <p>Interested buyers can contact sellers directly after signing in.</p>
          </article>
        </div>

        <div className="infoCallout">
          <div>
            <span className="eyebrow">OUR APPROACH</span>
            <h2>Professional information, practical decisions</h2>
            <p>
              MedicalEquipes supports discovery and communication. Buyers should
              always inspect equipment, verify serial numbers and service history,
              and agree payment terms directly with the seller.
            </p>
          </div>
          <Link className="primary infoAction" href="/#listings">Browse Equipment</Link>
        </div>
      </section>
    </main>
  );
}

