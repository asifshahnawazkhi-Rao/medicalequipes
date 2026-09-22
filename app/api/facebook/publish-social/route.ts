import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";
import { publishInstagramImage } from "../instagram";

async function graphPost(path: string, values: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/v26.0/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Meta rejected the post.");
  return data as Record<string, unknown>;
}

async function resolvePageAccessToken(pageId: string, storedToken: string) {
  const url = new URL("https://graph.facebook.com/v26.0/me/accounts");
  url.searchParams.set("fields", "id,access_token");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", storedToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.data)) return storedToken;
  return data.data.find((item: { id?: string; access_token?: string }) => String(item.id ?? "") === pageId)?.access_token || storedToken;
}

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

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const storedToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageId || !storedToken) return NextResponse.json({ error: "Meta publishing is not configured." }, { status: 503 });
    const pageToken = await resolvePageAccessToken(pageId, storedToken);
    const caption = `${body.title.trim()}\n\n${body.caption.trim()}${body.websiteUrl?.trim() ? `\n\nLearn more: ${body.websiteUrl.trim()}` : ""}`;

    const facebook: { status: string; postId?: string; error?: string } = { status: body.publishFacebook ? "pending" : "not_selected" };
    const instagram: { status: string; postId?: string; error?: string } = { status: body.publishInstagram ? "pending" : "not_selected" };

    if (body.publishFacebook) {
      try {
        const result = await graphPost(`${pageId}/photos`, { url: body.imageUrl, caption, access_token: pageToken });
        facebook.status = "published";
        facebook.postId = String(result.post_id || result.id || "");
      } catch (error) {
        facebook.status = "failed";
        facebook.error = error instanceof Error ? error.message : "Facebook publishing failed.";
      }
    }

    if (body.publishInstagram) {
      try {
        const result = await publishInstagramImage(pageId, pageToken, body.imageUrl, caption);
        instagram.status = "published";
        instagram.postId = result.postId;
      } catch (error) {
        instagram.status = "failed";
        instagram.error = error instanceof Error ? error.message : "Instagram publishing failed.";
      }
    }

    return NextResponse.json({ ok: facebook.status === "published" || instagram.status === "published", facebook, instagram });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social post could not be published." }, { status: 502 });
  }
}
