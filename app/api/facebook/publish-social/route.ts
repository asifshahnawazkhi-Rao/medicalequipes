import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";
import { publishSocialPost } from "../social-publisher";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken) return NextResponse.json({ error: "Admin session is missing." }, { status: 401 });

    const body = await request.json() as {
      title?: string; caption?: string; imageUrl?: string; websiteUrl?: string;
      publishFacebook?: boolean; publishInstagram?: boolean;
    };
    if (!body.title?.trim() || !body.caption?.trim() || !body.imageUrl?.trim()) {
      return NextResponse.json({ error: "Title, caption and image are required." }, { status: 400 });
    }
    if (!body.publishFacebook && !body.publishInstagram) {
      return NextResponse.json({ error: "Select Facebook, Instagram, or both." }, { status: 400 });
    }

    const { url, key } = getSupabaseConfig();
    const headers = { apikey: key, Authorization: `Bearer ${accessToken}` };
    const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id,role&id=eq.${encodeURIComponent((await (await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store" })).json()).id || "")}&limit=1`, { headers, cache: "no-store" });
    const profiles = await profileResponse.json().catch(() => []);
    if (!profileResponse.ok || !Array.isArray(profiles) || String(profiles[0]?.role ?? "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Only an administrator can publish social posts." }, { status: 403 });
    }

    const { facebook, instagram } = await publishSocialPost({
      title: body.title,
      caption: body.caption,
      imageUrl: body.imageUrl,
      websiteUrl: body.websiteUrl,
      publishFacebook: Boolean(body.publishFacebook),
      publishInstagram: Boolean(body.publishInstagram),
    });

    return NextResponse.json({ ok: facebook.status === "published" || instagram.status === "published", facebook, instagram });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social post could not be published." }, { status: 502 });
  }
}
