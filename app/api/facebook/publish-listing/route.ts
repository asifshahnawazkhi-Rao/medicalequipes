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
  contact_name?: string | null;
  contact_phone?: string | null;
  categories?: { name?: string | null } | null;
  managed_sellers?: {
    company_name?: string | null;
    contact_person?: string | null;
    phone?: string | null;
  } | null;
  listing_images?: Array<{ image_url?: string | null; sort_order?: number | null }>;
};

function facebookCaption(listing: ListingRow, updated = false) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://medicalequipes.com").replace(/\/$/, "");
  const sellerName = listing.managed_sellers?.company_name
    || listing.managed_sellers?.contact_person
    || listing.contact_name;
  const sellerContact = listing.managed_sellers?.phone || listing.contact_phone;
  const details = [
    listing.categories?.name,
    listing.brand && `Brand: ${listing.brand}`,
    listing.model && `Model: ${listing.model}`,
    listing.condition && `Condition: ${listing.condition}`,
    listing.city && `Location: ${listing.city}`,
    listing.price != null && (Number(listing.price) > 0
      ? `Price: PKR ${Number(listing.price).toLocaleString("en-PK")}`
      : "Price: Ask for Price"),
    sellerName && `Seller: ${sellerName}`,
    sellerContact && `Seller Contact / WhatsApp: ${sellerContact}`,
  ].filter(Boolean);

  return [
    `${updated ? "Updated listing" : "New listing"}: ${listing.title}`,
    details.join("\n"),
    listing.description?.trim().slice(0, 1000),
    `View listing: ${siteUrl}/listing/${listing.id}`,
    "#MedicalEquipment #MedicalEquipes",
  ].filter(Boolean).join("\n\n");
}

async function findExistingFacebookPost(
  pageId: string,
  listingId: string,
  accessToken: string
) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://medicalequipes.com").replace(/\/$/, "");
  const listingUrl = `${siteUrl}/listing/${listingId}`;
  let nextUrl = new URL(`https://graph.facebook.com/v26.0/${pageId}/photos`);
  nextUrl.searchParams.set("fields", "id,name");
  nextUrl.searchParams.set("type", "uploaded");
  nextUrl.searchParams.set("limit", "100");
  nextUrl.searchParams.set("access_token", accessToken);

  for (let page = 0; page < 5; page++) {
    const response = await fetch(nextUrl, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data?.data)) break;
    const match = data.data.find((item: { id?: string; name?: string }) =>
      String(item.name ?? "").includes(listingUrl)
    );
    if (match?.id) return { id: String(match.id), type: "photo" as const };
    if (!data?.paging?.next) break;
    nextUrl = new URL(data.paging.next);
  }

  nextUrl = new URL(`https://graph.facebook.com/v26.0/${pageId}/published_posts`);
  nextUrl.searchParams.set("fields", "id,message");
  nextUrl.searchParams.set("limit", "100");
  nextUrl.searchParams.set("access_token", accessToken);

  for (let page = 0; page < 5; page++) {
    const response = await fetch(nextUrl, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data?.data)) return null;
    const match = data.data.find((item: { id?: string; message?: string }) =>
      String(item.message ?? "").includes(listingUrl)
    );
    if (match?.id) return { id: String(match.id), type: "feed" as const };
    if (!data?.paging?.next) return null;
    nextUrl = new URL(data.paging.next);
  }

  return null;
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
    const { listingId, action = "publish" } = await request.json() as {
      listingId?: string;
      action?: "publish" | "update";
    };
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
      `${url}/rest/v1/listings?select=id,title,brand,model,price,city,condition,description,contact_name,contact_phone,categories(name),listing_images(image_url,sort_order),managed_sellers(company_name,contact_person,phone)&id=eq.${encodeURIComponent(listingId)}&seller_id=eq.${encodeURIComponent(user.id)}&status=eq.active&limit=1`,
      { headers: authHeaders, cache: "no-store" }
    );
    const listings = await listingResponse.json().catch(() => []);
    const listing = Array.isArray(listings) ? listings[0] as ListingRow | undefined : undefined;
    if (!listingResponse.ok || !listing) {
      return NextResponse.json({ error: "Active listing was not found." }, { status: 404 });
    }

    const resolvedPageToken = await resolvePageAccessToken(
      pageId,
      pageAccessToken
    );
    const existingPost = action === "update"
      ? await findExistingFacebookPost(pageId, listing.id, resolvedPageToken)
      : null;
    const caption = facebookCaption(listing, Boolean(existingPost));
    const imageUrl = [...(listing.listing_images || [])]
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0]?.image_url;

    let result: Record<string, unknown>;
    let updated = false;

    if (existingPost) {
      try {
        result = await graphPost(existingPost.id, {
          [existingPost.type === "photo" ? "caption" : "message"]: caption,
          access_token: resolvedPageToken,
        });
        updated = true;
      } catch (updateError) {
        console.warn("Facebook post update failed; creating a replacement post.", updateError);
        result = imageUrl
          ? await graphPost(`${pageId}/photos`, { url: imageUrl, caption, access_token: resolvedPageToken })
          : await graphPost(`${pageId}/feed`, { message: caption, access_token: resolvedPageToken });
      }
    } else {
      result = imageUrl
        ? await graphPost(`${pageId}/photos`, { url: imageUrl, caption, access_token: resolvedPageToken })
        : await graphPost(`${pageId}/feed`, { message: caption, access_token: resolvedPageToken });
    }

    return NextResponse.json({
      ok: true,
      updated,
      postId: updated ? existingPost?.id : result.post_id || result.id,
    });
  } catch (error) {
    console.error("Facebook listing publish failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not publish listing to Facebook." },
      { status: 502 }
    );
  }
}

