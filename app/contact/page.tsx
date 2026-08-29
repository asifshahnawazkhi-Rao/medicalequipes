import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="infoPage">
      <header className="header">
        <div className="container nav">
          <Link className="brand" href="/">
            <span className="brandMark">+</span>
            <span>Medical<span>Equipes</span></span>
          </Link>
          <nav>
            <Link href="/about">About Us</Link>
            <Link href="/help">Help Center</Link>
            <Link href="/">Marketplace</Link>
          </nav>
        </div>
      </header>

      <section className="infoHero">
        <div className="container infoHeroInner">
          <span className="eyebrow">CONTACT US</span>
          <h1>How can we help?</h1>
          <p>
            Contact MedicalEquipes for account assistance, seller approval,
            listing questions, technical problems, or marketplace safety concerns.
          </p>
        </div>
      </section>

      <section className="container infoContent">
        <div className="contactGrid">
          <article className="contactCard">
            <span className="contactIcon">@</span>
            <div>
              <h2>Email support</h2>
              <p>Send the relevant listing link and a clear description of your issue.</p>
              <a href="mailto:support@medicalequipes.com">support@medicalequipes.com</a>
            </div>
          </article>

          <article className="contactCard">
            <span className="contactIcon">?</span>
            <div>
              <h2>Self-service help</h2>
              <p>Find quick guidance for accounts, listings, photos, and buyer safety.</p>
              <Link href="/help">Visit Help Center</Link>
            </div>
          </article>
        </div>

        <div className="infoCallout">
          <div>
            <span className="eyebrow">REPORT A LISTING</span>
            <h2>See suspicious or misleading content?</h2>
            <p>
              Open the listing and use the Report Listing button. Include enough
              detail for the marketplace team to review the concern.
            </p>
          </div>
          <Link className="primary infoAction" href="/#listings">Browse Listings</Link>
        </div>
      </section>
    </main>
  );
}

