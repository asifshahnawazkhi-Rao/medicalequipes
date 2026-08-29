import Link from "next/link";

const helpTopics = [
  ["How do I sell equipment?", "Create an account, complete your seller profile, wait for approval, and then use Sell Equipment to publish a detailed listing."],
  ["How many photos can I add?", "You can add up to eight JPG, PNG, or WebP images. Each image must be 5MB or smaller. On mobile, you can also take a new photo with the camera."],
  ["Why can’t I see seller contact details?", "Seller contact information is available after you log in. This helps keep marketplace communication connected to registered accounts."],
  ["How do I report a listing?", "Open the listing, select Report Listing in the Marketplace Safety section, choose a reason, and add any useful details."],
  ["Does MedicalEquipes handle payments?", "No. Buyers and sellers agree inspection, delivery, and payment arrangements directly. Always verify the equipment before payment."],
  ["How can I edit my listing?", "Open your Dashboard, find the listing, and choose Edit. Keep specifications, price, condition, and contact details accurate."],
];

export default function HelpPage() {
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
            <Link href="/contact">Contact</Link>
            <Link href="/">Marketplace</Link>
          </nav>
        </div>
      </header>

      <section className="infoHero">
        <div className="container infoHeroInner">
          <span className="eyebrow">HELP CENTER</span>
          <h1>Answers for buyers and sellers</h1>
          <p>
            Find guidance for accounts, seller approval, equipment listings,
            photos, contact details, reporting, and safer marketplace use.
          </p>
        </div>
      </section>

      <section className="container infoContent">
        <div className="helpGrid">
          {helpTopics.map(([title, description]) => (
            <article className="helpCard" key={title}>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="infoCallout">
          <div>
            <span className="eyebrow">NEED MORE HELP?</span>
            <h2>Contact the MedicalEquipes team</h2>
            <p>Include your account email or listing link when it is relevant to the issue.</p>
          </div>
          <Link className="primary infoAction" href="/contact">Contact Support</Link>
        </div>
      </section>
    </main>
  );
}

