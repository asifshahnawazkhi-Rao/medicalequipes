import { NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "../../../auth";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }

    const { url, key } = getSupabaseConfig();
    const authHeaders = {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    };

    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: authHeaders,
      cache: "no-store",
    });
    const user = await userResponse.json().catch(() => ({}));

    if (!userResponse.ok || !user?.id) {
      return NextResponse.json({ error: "Your login session has expired. Please log in again." }, { status: 401 });
    }

    const form = await request.formData();
    const listingId = String(form.get("listingId") ?? "");
    const file = form.get("file");

    if (!listingId || !(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Listing ID and image are required." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type) || file.size > maxFileSize) {
      return NextResponse.json({ error: "Image must be JPG, PNG or WebP and no larger than 5 MB." }, { status: 400 });
    }

    const listingResponse = await fetch(
      `${url}/rest/v1/listings?select=id&limit=1&id=eq.${encodeURIComponent(listingId)}&seller_id=eq.${encodeURIComponent(user.id)}`,
      { headers: authHeaders, cache: "no-store" }
    );
    const listings = await listingResponse.json().catch(() => []);

    if (!listingResponse.ok || !Array.isArray(listings) || !listings.length) {
      return NextResponse.json({ error: "You can only upload images to your own listing." }, { status: 403 });
    }

    const safeName =
      file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image";
    const path = `${user.id}/${listingId}/${crypto.randomUUID()}-${safeName}`;

    const uploadResponse = await fetch(
      `${url}/storage/v1/object/listing-images/${path}`,
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": file.type,
          "x-upsert": "false",
        },
        body: await file.arrayBuffer(),
      }
    );

    const uploadResult = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: uploadResult.message || uploadResult.error || "Image storage upload failed." },
        { status: uploadResponse.status }
      );
    }

    return NextResponse.json({
      path,
      publicUrl: `${url}/storage/v1/object/public/listing-images/${path}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image upload failed." },
      { status: 500 }
    );
  }
}
