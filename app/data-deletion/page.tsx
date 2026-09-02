export const metadata = {
  title: "Data Deletion Instructions | MedicalEquipes",
  description: "How to request deletion of your MedicalEquipes account data.",
};

export default function DataDeletionPage() {
  return (
    <main className="legalPage">
      <article className="legalCard">
        <a className="legalBrand" href="/">MedicalEquipes</a>
        <h1>Data Deletion Instructions</h1>
        <p className="legalUpdated">Last updated: September 2, 2026</p>
        <p>You can request deletion of your MedicalEquipes account and associated personal data at any time.</p>
        <h2>How to submit a request</h2>
        <ol>
          <li>Send a WhatsApp message to <a href="https://wa.me/923392743271">+92 339 2743271</a>.</li>
          <li>Write “Delete my MedicalEquipes account” and include the email address used for your account.</li>
          <li>We may ask you to verify account ownership before processing the request.</li>
        </ol>
        <h2>What will be deleted</h2>
        <p>After verification, we will delete or anonymize your profile and personal account information and remove associated content where legally and technically permitted. Some security, transaction, or legal records may be retained for the period required by law or legitimate fraud-prevention needs.</p>
        <p>We will normally respond to verified deletion requests within 30 days.</p>
        <a className="legalBack" href="/">Return to MedicalEquipes</a>
      </article>
    </main>
  );
}
