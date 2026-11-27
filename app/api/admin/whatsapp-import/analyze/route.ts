import { NextRequest, NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { getSupabaseConfig } from "../../../../auth";

export const runtime = "nodejs";
function extract(text: string, pattern: RegExp) { return text.match(pattern)?.[1]?.trim() || ""; }
const productWords = /(?:available|for sale|required|contact|machine|equipment|monitor|printer|ventilator|ultrasound|x[- ]?ray|shaker|cycle|cardiac|audiometer|booth|hysteroflator|oxygen|blender|aloka|sony|mitsubishi|siemens|ge\.?|mindray|philips|toshiba|canon|storz|model|price|qty|quantity)/i;
const phonePattern = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/;
const ignored = /messages and calls|end-to-end encrypted|this message was deleted|<media omitted>/i;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { url, key } = getSupabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  try {
    const user = await (await fetch(`${url}/auth/v1/user`, { headers })).json();
    if (!user?.id) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const { jobId } = await request.json();
    const jobRows = await (await fetch(`${url}/rest/v1/whatsapp_import_jobs?id=eq.${encodeURIComponent(jobId)}&limit=1`, { headers })).json();
    const job = jobRows?.[0];
    if (!job) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    const media = Array.isArray(job.media_manifest) ? job.media_manifest : [];
    let extractedText = String(job.extracted_text || "");
    // Fallback: read the TXT directly from the uploaded ZIP if the job row has no text.
    if (!extractedText.trim() && job.storage_path) {
      const zipResponse = await fetch(`${url}/storage/v1/object/whatsapp-imports/${job.storage_path}`, { headers, cache: "no-store" });
      if (zipResponse.ok) {
        const files = unzipSync(new Uint8Array(await zipResponse.arrayBuffer()));
        for (const [name, bytes] of Object.entries(files)) {
          if (name.toLowerCase().endsWith(".txt") && bytes.length) extractedText += new TextDecoder().decode(bytes) + "\n";
        }
      }
    }
    const lines = extractedText.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    const candidates = lines.filter((line: string) => productWords.test(line) && !ignored.test(line));
    const usable = candidates.length ? candidates : lines.filter((line: string) => !ignored.test(line)).slice(0, 100);
    const items = usable.map((line: string, index: number) => ({
      import_job_id: jobId, source_text: line,
      seller_name: extract(line, /(?:seller|vendor|contact)\s*[:\-]\s*([^,|]+)/i),
      seller_phone: line.match(phonePattern)?.[0]?.replace(/[\s-]/g, "") || "",
      brand: extract(line, /\b(sony|mitsubishi|siemens|ge|mindray|philips|toshiba|aloka|canon|storz)\b/i),
      model: line.match(/\b(?:UP[- ]?[A-Z]?\d{3,4}|P[- ]?\d{2,3}|[A-Z]{1,5}[- ]?\d{2,5}[A-Z]{0,4})\b/i)?.[0] || "",
      title: line.slice(0, 160),
      condition: line.match(/\b(new|used|refurbished|refurb|working|faulty|fresh import)\b/i)?.[0] || "",
      price: Number((line.match(/(?:rs\.?|pkr)\s*([\d,]+)/i)?.[1] || "").replace(/,/g, "")) || null,
      quantity: Number(line.match(/(?:qty|quantity|lot of)\s*[:\-]?\s*(\d+)/i)?.[1] || 0) || null,
      media_files: index === 0 ? media : [], status: "pending"
    }));
    if (!items.length) return NextResponse.json({ error: "No readable product text found in ZIP." }, { status: 422 });
    const save = await fetch(`${url}/rest/v1/whatsapp_import_items`, { method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(items) });
    if (!save.ok) throw new Error(await save.text());
    await fetch(`${url}/rest/v1/whatsapp_import_jobs?id=eq.${encodeURIComponent(jobId)}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status: "review", extracted_text: extractedText.slice(0, 2000000) }) });
    return NextResponse.json({ jobId, candidates: items.length, status: "review" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "AI analysis failed." }, { status: 500 }); }
}
