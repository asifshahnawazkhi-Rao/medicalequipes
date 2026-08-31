import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../auth";

type ListingRow = {
  id: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  price?: number | null;
  city?: string | null;
  condition?: string | null;
  description?: string | null;
  categories?: { name?: string | null } | null;
  listing_images?: Array<{ image_url?: string | null; sort_order?: number | null }>;
};

function facebookCaption(listing: ListingRow) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://medicalequipes.com").replace(/\/$/, "");
  const details = [
    listing.categories?.name,
    listing.brand && `Brand: ${listing.brand}`,
    listing.model && `Model: ${listing.model}`,
    listing.condition && `Condition: ${listing.condition}`,
    listing.city && `Location: ${listing.city}`,
    listing.price != null && (Number(listing.price) > 0
      ? `Price: PKR ${Number(listing.price).toLocaleString("en-PK")}`
      : "Price: Ask for Price"),
  ].filter(Boolean);

  return [
    `New listing: ${listing.title}`,
    details.join("\n"),
    listing.description?.trim().slice(0, 1000),
    `View listing: ${siteUrl}/listing/${listing.id}`,
    "#MedicalEquipment #MedicalEquipes",
  ].filter(Boolean).join("\n\n");
}

async function graphPost(path: string, values: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/v26.0/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Facebook rejected the listing post.");
  }
  return data;
}

async function resolvePageAccessToken(pageId: string, storedToken: string) {
  const url = new URL("https://graph.facebook.com/v26.0/me/accounts");
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", storedToken);

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !Array.isArray(data?.data)) {
    return storedToken;
  }

  const page = data.data.find(
    (item: { id?: string; access_token?: string }) =>
      String(item.id ?? "") === pageId && item.access_token
  );

  return page?.access_token || storedToken;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { listingId } = await request.json() as { listingId?: string };
    if (!accessToken || !listingId) {
      return NextResponse.json({ error: "Missing session or listing id." }, { status: 400 });
    }

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ error: "Facebook publishing is not configured." }, { status: 503 });
    }

    const { url, key } = getSupabaseConfig();
    const authHeaders = { apikey: key, Authorization: `Bearer ${accessToken}` };
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: authHeaders, cache: "no-store" });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id) {
      return NextResponse.json({ error: "Your session is not valid." }, { status: 401 });
    }

    const listingResponse = await fetch(
      `${url}/rest/v1/listings?select=id,title,brand,model,price,city,condition,description,categories(name),listing_images(image_url,sort_order)&id=eq.${encodeURIComponent(listingId)}&seller_id=eq.${encodeURIComponent(user.id)}&status=eq.active&limit=1`,
      { headers: authHeaders, cache: "no-store" }
    );
    const listings = await listingResponse.json().catch(() => []);
    const listing = Array.isArray(listings) ? listings[0] as ListingRow | undefined : undefined;
    if (!listingResponse.ok || !listing) {
      return NextResponse.json({ error: "Active listing was not found." }, { status: 404 });
    }

    const caption = facebookCaption(listing);
    const resolvedPageToken = await resolvePageAccessToken(
      pageId,
      pageAccessToken
    );
    const imageUrl = [...(listing.listing_images || [])]
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0]?.image_url;

    const result = imageUrl
      ? await graphPost(`${pageId}/photos`, { url: imageUrl, caption, access_token: resolvedPageToken })
      : await graphPost(`${pageId}/feed`, { message: caption, access_token: resolvedPageToken });

    return NextResponse.json({ ok: true, postId: result.post_id || result.id });
  } catch (error) {
    console.error("Facebook listing publish failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not publish listing to Facebook." },
      { status: 502 }
    );
  }
}

