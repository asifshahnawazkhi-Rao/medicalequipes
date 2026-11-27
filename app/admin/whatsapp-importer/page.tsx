"use client";
import { useEffect, useState } from "react";
import { getStoredSession, getSupabaseConfig } from "../../auth";

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
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [analysis, setAnalysis] = useState<{ candidates?: number; status?: string } | null>(null);

  useEffect(() => { const session = getStoredSession(); if (!session) window.location.replace("/"); }, []);

  function choose(selected: File | undefined) {
    setMessage(""); setAnalysis(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".zip")) { setFile(null); setMessage("Please select a ZIP file exported from WhatsApp."); return; }
    if (selected.size > 3 * 1024 * 1024 * 1024) { setFile(null); setMessage("Maximum ZIP size is 3GB."); return; }
    setFile(selected);
  }

  async function startImport() {
    const session = getStoredSession();
    if (!session?.access_token || !session.user?.id || !file) return;
    setMessage("Uploading ZIP…");
    try {
      const { url, key } = getSupabaseConfig();
      const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const upload = await fetch(`${url}/storage/v1/object/whatsapp-imports/${path}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/zip", "x-upsert": "false" }, body: file });
      if (!upload.ok) throw new Error(`ZIP upload failed (HTTP ${upload.status}).`);
      const job = await fetch(`${url}/rest/v1/whatsapp_import_jobs`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ created_by: session.user.id, file_name: file.name, file_size: file.size, storage_path: path, status: "uploaded" }) });
      if (!job.ok) throw new Error(`Import job failed (HTTP ${job.status}).`);
      const createdJob = (await job.json())?.[0];
      setJobId(createdJob?.id || "");
      setMessage("ZIP uploaded. Extracting chat and media…");
      const extraction = await fetch("/api/admin/whatsapp-import/extract", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ jobId: createdJob?.id }) });
      const result = await extraction.json().catch(() => ({}));
      if (!extraction.ok) throw new Error(result.error || "ZIP extraction failed.");
      setMessage(`Extraction complete. ${result.files} files indexed. Analysing products and matching sellers…`);
      const analyzed = await fetch("/api/admin/whatsapp-import/analyze", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ jobId: createdJob?.id }) });
      const analyzedResult = await analyzed.json().catch(() => ({}));
      if (!analyzed.ok) throw new Error(analyzedResult.error || "Product analysis failed.");
      setAnalysis(analyzedResult);
      setMessage(`Analysis complete. ${analyzedResult.candidates || 0} candidate products are ready for review. Nothing was published automatically.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
  }

  return <main className="adminDashboardPage"><div className="adminDashboardContainer container">
    <a href="/admin">← Admin Dashboard</a>
    <section className="adminHero"><div><span className="eyebrow">ADMIN IMPORT CENTER</span><h1>WhatsApp AI Importer</h1><p>Import medical-equipment posts for review without changing your existing seller or listing system.</p></div><div className="adminHeroBadge">Phases 1–7</div></section>
    <section className="adminPanel"><div className="adminPanelHead"><div><h2>Phase 2 — Upload WhatsApp ZIP</h2><p>Export the group chat from WhatsApp using “Include media”, then upload the ZIP here.</p></div></div>
      <div className="adminManagedSellerForm"><label>WhatsApp chat export (.zip)<input type="file" accept=".zip,application/zip" onChange={(event) => choose(event.target.files?.[0])} /></label>
      {file && <p className="formMessage">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
      {message && <p className="formMessage">{message}</p>}
      {analysis && <p className="formMessage">Review queue created for import job {jobId.slice(0, 8)}…</p>}
      <button type="button" disabled={!file} onClick={startImport}>Start Import</button>
      <p className="helpText">ZIP extraction, product analysis and seller matching run automatically. Publishing remains behind admin review.</p></div>
    </section>
    <section className="adminPanel" style={{ marginTop: 20 }}><div className="adminPanelHead"><div><h2>Development sequence</h2><p>Phase 8 — direct WhatsApp connectivity remains disabled until separately verified.</p></div></div><div className="adminQuickGrid">{phases.map(([number, title, description]) => <article key={number}><span>PHASE {number}</span><strong>{title}</strong><small>{description}</small></article>)}</div></section>
  </div></main>;
}
