import { AuthSession, getSupabaseConfig } from "./auth";

export type CategoryOption = { id: string; name: string };

type ListingImageUpload = { path: string; publicUrl: string };

function requireUserSession(session: AuthSession) {
  if (!session.access_token) throw new Error("Your session is missing an access token. Please log in again.");
  if (!session.user?.id) throw new Error("Your session is missing a user id. Please log in again.");
}

function explainSupabaseError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("row-level security") || normalized.includes("violates row-level security")) {
    return `${message} Confirm Supabase RLS allows authenticated users to create their own listing, upload to listing-images, and add image rows for listings they own.`;
  }
  if (normalized.includes("secret api key required")) {
    return "Supabase rejected a request that should use the logged-in user's access token. Please refresh the page and sign in again.";
  }
  return message;
}

export async function supabaseFetch<T>(path: string, session?: AuthSession, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${session?.access_token ?? key}`);
  if (init.body && !headers.has("Content-Type") && typeof init.body === "string") headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || `Supabase request failed (${response.status})`;
    throw new Error(explainSupabaseError(String(message)));
  }

  return data as T;
}

export async function getCategories(session?: AuthSession) {
  try {
    const rows = await supabaseFetch<Array<Record<string, unknown>>>('/rest/v1/categories?select=id,name,title&order=name.asc', session);
    return rows.map((row) => ({ id: String(row.id), name: String(row.name ?? row.title ?? row.id) }));
  } catch {
    return [];
  }
}

export async function createListing(session: AuthSession, values: Record<string, string>) {
  requireUserSession(session);
  const user = session.user!;

  const payload = {
    user_id: user.id,
    category_id: values.categoryId,
    title: values.title.trim(),
    brand: values.brand?.trim() || null,
    model: values.model?.trim() || null,
    condition: values.condition,
    price: Number(values.price),
    city: values.city.trim(),
    description: values.description.trim(),
    contact_name: values.contactName?.trim() || null,
    contact_email: values.contactEmail?.trim() || user.email || null,
    contact_phone: values.contactPhone?.trim() || null,
    status: "active",
  };

  const rows = await supabaseFetch<Array<{ id: string }>>('/rest/v1/listings?select=id', session, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  return rows[0];
}

export async function uploadListingImage(session: AuthSession, listingId: string, file: File) {
  requireUserSession(session);
  const user = session.user!;
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "image";
  const path = `${user.id}/${listingId}/${crypto.randomUUID()}-${safeName}`;
  await supabaseFetch(`/storage/v1/object/listing-images/${path}`, session, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  const { url } = getSupabaseConfig();
  return { path, publicUrl: `${url}/storage/v1/object/public/listing-images/${path}` };
}

export async function saveListingImages(session: AuthSession, listingId: string, images: ListingImageUpload[]) {
  requireUserSession(session);
  if (!images.length) return;

  const rows = images.map((image, index) => ({
    listing_id: listingId,
    image_url: image.publicUrl,
    storage_path: image.path,
    sort_order: index,
    alt_text: `Equipment image ${index + 1}`,
  }));

  await supabaseFetch('/rest/v1/listing_images', session, { method: "POST", body: JSON.stringify(rows) });
}
