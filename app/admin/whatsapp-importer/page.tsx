"use client";
import { useEffect, useState } from "react";
import { getStoredSession } from "../../auth";

const phases = [
  [1, "ZIP Import", "Upload a WhatsApp chat export with media."],
  [2, "Extraction", "Read chat text, photos and brochures."],
  [3, "AI Analysis", "Identify seller, equipment, model, price and condition."],
  [4, "Duplicate Check", "Match existing sellers and products before creating anything."],
  [5, "Seller Registration", "Create a new seller only after admin confirmation."],
  [6, "Post Listing", "Prepare listings using the existing seller/listing workflow."],
  [7, "Admin Review", "Review, edit and publish selected listings."],
];

export default function WhatsAppImporterPage() {
  const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { const session = getStoredSession(); if (!session) { window.location.replace("/"); return; } }, []);
  function choose(selected: File | undefined) { setMessage(""); if (!selected) return; if (!selected.name.toLowerCase().endsWith(".zip")) { setFile(null); setMessage("Please select a ZIP file exported from WhatsApp."); return; } if (selected.size > 3 * 1024 * 1024 * 1024) { setFile(null); setMessage("Maximum ZIP size is 3GB."); return; } setFile(selected); }
  return <main className="adminDashboardPage"><div className="adminDashboardContainer container"><a href="/admin">← Admin Dashboard</a><section className="adminHero"><div><span className="eyebrow">ADMIN IMPORT CENTER</span><h1>WhatsApp AI Importer</h1><p>Import medical-equipment posts for review without changing your existing seller or listing system.</p></div><div className="adminHeroBadge">Phases 1–7</div></section><section className="adminPanel"><div className="adminPanelHead"><div><h2>Phase 1 — Upload WhatsApp ZIP</h2><p>Export the group chat from WhatsApp using “Include media”, then upload the ZIP here.</p></div></div><div className="adminManagedSellerForm"><label>WhatsApp chat export (.zip)<input type="file" accept=".zip,application/zip" onChange={(event) => choose(event.target.files?.[0])} /></label>{file && <p className="formMessage">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}{message && <p className="formError">{message}</p>}<button type="button" disabled={!file} onClick={() => setMessage("ZIP upload is ready. Extraction and AI analysis will be enabled in the next importer phase.")}>Start Import</button><p className="helpText">Only the admin can start an import. Nothing will be published automatically; every seller and listing will require review.</p></div></section><section className="adminPanel" style={{ marginTop: 20 }}><div className="adminPanelHead"><div><h2>Development sequence</h2><p>Phase 8 — direct WhatsApp connectivity remains disabled until separately verified.</p></div></div><div className="adminQuickGrid">{phases.map(([number, title, description]) => <article key={number}><span>PHASE {number}</span><strong>{title}</strong><small>{description}</small></article>)}</div></section></div></main>;
}
