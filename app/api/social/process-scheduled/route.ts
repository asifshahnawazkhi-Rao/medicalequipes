import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";
import { publishSocialPost } from "../../facebook/social-publisher";

export const maxDuration = 60;

type ScheduledPost = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  website_url?: string | null;
  publish_facebook: boolean;
  publish_instagram: boolean;
  attempts?: number;
};

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.SOCIAL_CRON_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Scheduler authorization failed." }, { status: 401 });
  }

  const { url } = getSupabaseConfig();
  const headers = serviceHeaders();
  const dueUrl = `${url}/rest/v1/social_posts?select=id,title,caption,image_url,website_url,publish_facebook,publish_instagram,attempts&schedule_status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(new Date().toISOString())}&order=scheduled_at.asc&limit=10`;
  const dueResponse = await fetch(dueUrl, { headers, cache: "no-store" });
  const duePosts = await dueResponse.json().catch(() => []);
  if (!dueResponse.ok || !Array.isArray(duePosts)) {
    return NextResponse.json({ error: "Could not load scheduled posts." }, { status: 502 });
  }

  const results = [];
  for (const post of duePosts as ScheduledPost[]) {
    const claimResponse = await fetch(`${url}/rest/v1/social_posts?id=eq.${encodeURIComponent(post.id)}&schedule_status=eq.scheduled`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ schedule_status: "processing", attempts: Number(post.attempts || 0) + 1, last_attempt_at: new Date().toISOString() }),
    });
    const claimed = await claimResponse.json().catch(() => []);
    if (!claimResponse.ok || !Array.isArray(claimed) || !claimed.length) continue;

    try {
      const published = await publishSocialPost({
        title: post.title,
        caption: post.caption,
        imageUrl: post.image_url,
        websiteUrl: post.website_url || "",
        publishFacebook: post.publish_facebook,
        publishInstagram: post.publish_instagram,
      });
      const successful = [published.facebook.status, published.instagram.status].includes("published");
      await fetch(`${url}/rest/v1/social_posts?id=eq.${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          schedule_status: successful ? "published" : "failed",
          facebook_status: published.facebook.status,
          instagram_status: published.instagram.status,
          facebook_post_id: published.facebook.postId || null,
          instagram_post_id: published.instagram.postId || null,
          facebook_error: published.facebook.error || null,
          instagram_error: published.instagram.error || null,
          published_at: successful ? new Date().toISOString() : null,
        }),
      });
      results.push({ id: post.id, status: successful ? "published" : "failed" });
    } catch (error) {
      await fetch(`${url}/rest/v1/social_posts?id=eq.${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ schedule_status: "failed", facebook_error: error instanceof Error ? error.message : "Scheduled publishing failed." }),
      });
      results.push({ id: post.id, status: "failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
