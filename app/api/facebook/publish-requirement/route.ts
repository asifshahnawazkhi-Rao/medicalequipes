import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";

type RequirementRow = {
  id: string;
  required_item: string;
  equipment_model: string;
  acceptable_condition: string;
  details: string;
  poster_name?: string | null;
  poster_city?: string | null;
};

function requirementCaption(requirement: RequirementRow) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://medicalequipes.com").replace(/\/$/, "");

  return [
    `REQUIRED: ${requirement.required_item}`,
    [
      `Equipment Brand / Model: ${requirement.equipment_model}`,
      `Condition Acceptable: ${requirement.acceptable_condition}`,
      requirement.poster_city && `Location: ${requirement.poster_city}`,
      requirement.poster_name && `Required by: ${requirement.poster_name}`,
    ].filter(Boolean).join("\n"),
    requirement.details.trim().slice(0, 1500),
    `View buyer requirements: ${siteUrl}/#requirements`,
    "#MedicalEquipmentRequired #MedicalEquipment #MedicalEquipes",
  ].filter(Boolean).join("\n\n");
}

async function resolvePageAccessToken(pageId: string, storedToken: string) {
  const url = new URL("https://graph.facebook.com/v26.0/me/accounts");
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", storedToken);

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.data)) return storedToken;

  const page = data.data.find(
    (item: { id?: string; access_token?: string }) =>
      String(item.id ?? "") === pageId && item.access_token
  );
  return page?.access_token || storedToken;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { requirementId } = await request.json() as { requirementId?: string };
    if (!accessToken || !requirementId) {
      return NextResponse.json({ error: "Missing session or requirement id." }, { status: 400 });
    }

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const storedPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageId || !storedPageToken) {
      return NextResponse.json({ error: "Facebook publishing is not configured." }, { status: 503 });
    }

    const { url, key } = getSupabaseConfig();
    const authHeaders = { apikey: key, Authorization: `Bearer ${accessToken}` };
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: authHeaders, cache: "no-store" });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id) {
      return NextResponse.json({ error: "Your session is not valid." }, { status: 401 });
    }

    const requirementResponse = await fetch(
      `${url}/rest/v1/requirements?select=id,required_item,equipment_model,acceptable_condition,details,poster_name,poster_city&id=eq.${encodeURIComponent(requirementId)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.open&limit=1`,
      { headers: authHeaders, cache: "no-store" }
    );
    const requirements = await requirementResponse.json().catch(() => []);
    const requirement = Array.isArray(requirements) ? requirements[0] as RequirementRow | undefined : undefined;
    if (!requirementResponse.ok || !requirement) {
      return NextResponse.json({ error: "Open requirement was not found." }, { status: 404 });
    }

    const pageAccessToken = await resolvePageAccessToken(pageId, storedPageToken);
    const facebookResponse = await fetch(`https://graph.facebook.com/v26.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        message: requirementCaption(requirement),
        access_token: pageAccessToken,
      }),
      cache: "no-store",
    });
    const result = await facebookResponse.json().catch(() => ({}));
    if (!facebookResponse.ok) {
      throw new Error(result?.error?.message || "Facebook rejected the requirement post.");
    }

    return NextResponse.json({ ok: true, postId: result.id });
  } catch (error) {
    console.error("Facebook requirement publish failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not publish requirement to Facebook." },
      { status: 502 }
    );
  }
}
