"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getStoredSession, type AuthSession } from "../../auth";
import { createRequirement } from "../../supabaseData";

export default function PostRequirementPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.access_token) {
      window.location.replace("/");
      return;
    }
    setSession(stored);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!values.requiredItem?.trim() || !values.equipmentModel?.trim() || !values.acceptableCondition || !values.details?.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setMessage("Publishing requirement...");
      const requirement = await createRequirement(session, values);
      if (!requirement?.id) throw new Error("Requirement was created without an id response.");

      setMessage("Sharing requirement on Facebook...");
      const facebookResponse = await fetch("/api/facebook/publish-requirement", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requirementId: requirement.id }),
      });
      const facebookResult = await facebookResponse.json().catch(() => ({}));

      setMessage(
        facebookResponse.ok
          ? "Requirement published and shared on Facebook. Redirecting..."
          : `Requirement published successfully. Facebook sharing could not finish${facebookResult?.error ? `: ${facebookResult.error}` : "."}`
      );
      window.setTimeout(() => {
        window.location.assign("/dashboard#requirements");
      }, facebookResponse.ok ? 1200 : 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post requirement.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="requirementPage">
      <header className="header"><div className="container nav"><Link className="brand" href="/"><span className="brandMark">+</span><span>Medical<span>Equipes</span></span></Link><nav><Link href="/#listings">Buy</Link><Link href="/dashboard">Dashboard</Link></nav></div></header>
      <section className="requirementHero"><div className="container"><span className="eyebrow">BUYER REQUIREMENT</span><h1>Post Required Equipment or Part</h1><p>Tell verified marketplace sellers exactly what you need.</p></div></section>
      <section className="container requirementFormWrap">
        <form className="requirementForm" onSubmit={submit}>
          <label>Required item *<input name="requiredItem" required placeholder="Cardiac Board" /></label>
          <label>Equipment brand / model *<input name="equipmentModel" required placeholder="Toshiba Aplio 400" /></label>
          <label>Condition acceptable *<select name="acceptableCondition" required defaultValue="Any"><option>New</option><option>Used</option><option>Refurbished</option><option>Any</option></select></label>
          <label>Details *<textarea name="details" required rows={6} placeholder="Problem, specification or part number" /></label>
          {error && <div className="formError" role="alert">{error}</div>}
          {message && <div className="formMessage" role="status">{message}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? "Posting requirement..." : "+ Post Requirement"}</button>
        </form>
      </section>
    </main>
  );
}
