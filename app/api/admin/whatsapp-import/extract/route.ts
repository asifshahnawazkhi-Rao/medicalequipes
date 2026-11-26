import { NextRequest, NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { getSupabaseConfig } from "../../../../auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { url, key } = getSupabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store" });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const profileResponse = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers, cache: "no-store" });
    const profiles = await profileResponse.json().catch(() => []);
    if (!profiles?.[0] || String(profiles[0].role).toLowerCase() !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const { jobId } = await request.json();
    const jobResponse = await fetch(`${url}/rest/v1/whatsapp_import_jobs?id=eq.${encodeURIComponent(jobId)}&limit=1`, { headers, cache: "no-store" });
    const jobs = await jobResponse.json().catch(() => []);
    if (!jobs?.[0]) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    const job = jobs[0];
    await fetch(`${url}/rest/v1/whatsapp_import_jobs?id=eq.${encodeURIComponent(jobId)}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status: "extracting" }) });
    const zipResponse = await fetch(`${url}/storage/v1/object/whatsapp-imports/${job.storage_path}`, { headers, cache: "no-store" });
    if (!zipResponse.ok) throw new Error("Could not read the uploaded ZIP from storage.");
    const zipBytes = new Uint8Array(await zipResponse.arrayBuffer());
    const files = unzipSync(zipBytes);
    let text = ""; const manifest: Array<{ name: string; type: string; size: number }> = [];
    for (const [name, bytes] of Object.entries(files)) {
      if (!bytes.length || name.endsWith("/")) continue;
      const lower = name.toLowerCase(); const type = lower.endsWith(".txt") ? "text" : lower.match(/\.(jpg|jpeg|png|webp)$/) ? "image" : lower.endsWith(".pdf") ? "pdf" : "other";
      manifest.push({ name, type, size: bytes.length });
      if (type === "text") text += new TextDecoder().decode(bytes) + "\n";
    }
    await fetch(`${url}/rest/v1/whatsapp_import_jobs?id=eq.${encodeURIComponent(jobId)}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status: "review", extracted_text: text.slice(0, 2_000_000), media_manifest: manifest }) });
    return NextResponse.json({ jobId, status: "review", files: manifest.length, textLength: text.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Extraction failed." }, { status: 500 });
  }
}
