import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";
import { publishInstagramVideoContainer } from "../instagram";
import { getSocialPageCredentials } from "../social-publisher";

async function isAdmin(accessToken: string) {
  const { url, key } = getSupabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${accessToken}` };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store" });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user?.id) return false;
  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers, cache: "no-store" });
  const profiles = await profileResponse.json().catch(() => []);
  return profileResponse.ok && Array.isArray(profiles) && String(profiles[0]?.role ?? "").toLowerCase() === "admin";
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken || !(await isAdmin(accessToken))) {
      return NextResponse.json({ error: "Only an administrator can publish social posts." }, { status: 403 });
    }
    const body = await request.json() as { instagramId?: string; containerId?: string };
    if (!body.instagramId || !body.containerId) {
      return NextResponse.json({ error: "Instagram processing information is missing." }, { status: 400 });
    }
    const { pageToken } = await getSocialPageCredentials();
    const result = await publishInstagramVideoContainer(body.instagramId, body.containerId, pageToken);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Instagram video could not be published." }, { status: 502 });
  }
}
