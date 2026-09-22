import { ImageResponse } from "next/og";
import { getSupabaseConfig } from "../../../../auth";

export const runtime = "edge";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { url, key } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/requirements?select=required_item,equipment_model,acceptable_condition,poster_city&id=eq.${encodeURIComponent(id)}&status=eq.open&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  const rows = await response.json().catch(() => []);
  const requirement = Array.isArray(rows) ? rows[0] : null;
  if (!response.ok || !requirement) return new Response("Requirement not found", { status: 404 });

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "78px", color: "white", background: "linear-gradient(145deg, #073b49 0%, #087f8c 68%, #20a7ad 100%)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 34, fontWeight: 800 }}><span style={{ display: "flex", width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 16, background: "white", color: "#087f8c", fontSize: 44 }}>+</span>MedicalEquipes</div>
        <div style={{ display: "flex", padding: "14px 24px", borderRadius: 999, background: "#ffedd5", color: "#a9470b", fontSize: 25, fontWeight: 900, letterSpacing: 2 }}>REQUIRED</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", color: "#a9f5ed", fontSize: 25, fontWeight: 700, letterSpacing: 2 }}>MEDICAL EQUIPMENT / PART</div>
        <div style={{ display: "flex", fontSize: 70, fontWeight: 900, lineHeight: 1.05 }}>{String(requirement.required_item ?? "Required Item").slice(0, 54)}</div>
        <div style={{ display: "flex", fontSize: 38, color: "#d5ffff", fontWeight: 700 }}>{String(requirement.equipment_model ?? "").slice(0, 70)}</div>
        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginTop: 16 }}>
          <span style={{ display: "flex", padding: "15px 22px", borderRadius: 14, background: "rgba(255,255,255,.16)", fontSize: 25 }}>Condition: {String(requirement.acceptable_condition ?? "Any")}</span>
          {requirement.poster_city ? <span style={{ display: "flex", padding: "15px 22px", borderRadius: 14, background: "rgba(255,255,255,.16)", fontSize: 25 }}>Location: {String(requirement.poster_city)}</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 28, borderTop: "2px solid rgba(255,255,255,.24)", fontSize: 25 }}><span>Pakistan&apos;s Medical Equipment Marketplace</span><strong>medicalequipes.com</strong></div>
    </div>,
    { width: 1080, height: 1080 }
  );
}
