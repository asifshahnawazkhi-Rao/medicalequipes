import { AuthSession, getSupabaseConfig } from "./auth";

export type CategoryOption = { id: string; name: string };

type ListingImageUpload = { path: string; publicUrl: string };

type OpenApiSchema = {
  definitions?: Record<string, { properties?: Record<string, unknown> }>;
  components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
};

const listingFields = {
  userId: ["user_id", "seller_id", "profile_id", "owner_id", "created_by"],
  category: ["category_id", "category"],
  title: ["title", "name"],
  brand: ["brand"],
  model: ["model"],
  condition: ["condition", "equipment_condition"],
  price: ["price", "asking_price", "amount"],
  city: ["city", "location_city", "location"],
  description: ["description", "details"],
  contactName: ["contact_name"],
  contactEmail: ["contact_email", "email"],
  contactPhone: ["contact_phone", "phone", "phone_number"],
  status: ["status"],
} as const;

const listingImageFields = {
  listingId: ["listing_id"],
  url: ["image_url", "url", "public_url"],
  path: ["storage_path", "path", "file_path"],
  sortOrder: ["sort_order", "position", "display_order"],
  altText: ["alt_text"],
} as const;

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

async function tableColumns(session: AuthSession, table: string) {
  const fieldMap = table === "listings" ? listingFields : listingImageFields;
  const candidates = [...new Set(Object.values(fieldMap).flat())];
  const columns = new Set<string>();

  for (const column of candidates) {
    try {
      await supabaseFetch<unknown[]>(
        `/rest/v1/${table}?select=${encodeURIComponent(column)}&limit=0`,
        session
      );
      columns.add(column);
    } catch {
      // Column does not exist or is not exposed; skip it.
    }
  }

  if (!columns.size) {
    throw new Error(
      `Could not detect usable columns for the ${table} table in Supabase.`
    );
  }

  return columns;
}

function setExisting(
  payload: Record<string, unknown>,
  columns: Set<string>,
  candidates: readonly string[],
  value: unknown,
) {
  const column = candidates.find((candidate) => columns.has(candidate));
  if (column && value !== undefined && value !== "") payload[column] = value;
}

export async function getCategories(session?: AuthSession) {
  try {
    const rows = await supabaseFetch<Array<Record<string, unknown>>>(
      "/rest/v1/categories?select=id,name&order=name.asc",
      session
    );

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? row.id),
    }));
  } catch {
    try {
      const rows = await supabaseFetch<Array<Record<string, unknown>>>(
        "/rest/v1/categories?select=id,title&order=title.asc",
        session
      );

      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.title ?? row.id),
      }));
    } catch {
      return [];
    }
  }
}

export async function createListing(session: AuthSession, values: Record<string, string>) {
  requireUserSession(session);
  const user = session.user!;
  const columns = await tableColumns(session, "listings");
  const payload: Record<string, unknown> = {};

  setExisting(payload, columns, listingFields.userId, user.id);
payload.seller_id = user.id;
setExisting(payload, columns, listingFields.category, values.categoryId);
  setExisting(payload, columns, listingFields.title, values.title.trim());
  setExisting(payload, columns, listingFields.brand, values.brand?.trim());
  setExisting(payload, columns, listingFields.model, values.model?.trim());
  setExisting(payload, columns, listingFields.condition, values.condition);
  setExisting(payload, columns, listingFields.price, Number(values.price));
  setExisting(payload, columns, listingFields.city, values.city.trim());
  setExisting(payload, columns, listingFields.description, values.description.trim());
  setExisting(payload, columns, listingFields.contactName, values.contactName?.trim());
  setExisting(payload, columns, listingFields.contactEmail, values.contactEmail?.trim() || user.email);
  setExisting(payload, columns, listingFields.contactPhone, values.contactPhone?.trim());
  setExisting(payload, columns, listingFields.status, "active");

  const rows = await supabaseFetch<Array<{ id: string }>>('/rest/v1/listings?select=id', session, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  return rows[0];
}
export type PublicListing = {
  id: string;
  title: string;
  category: string;
  price: number;
  city: string;
  condition: string;
  imageUrl: string;
};

export async function getPublicListings(session?: AuthSession): Promise<PublicListing[]> {
  const rows = await supabaseFetch<Array<Record<string, unknown>>>(
    "/rest/v1/listings?select=id,title,price,city,condition,status,categories(name),listing_images(image_url,sort_order)&status=eq.active&order=created_at.desc",
    session
  );

  return rows.map((row) => {
    const category = row.categories as { name?: string } | null;
    const images = Array.isArray(row.listing_images)
      ? (row.listing_images as Array<{ image_url?: string; sort_order?: number }>)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [];

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      category: String(category?.name ?? "Medical Equipment"),
      price: Number(row.price ?? 0),
      city: String(row.city ?? ""),
      condition: String(row.condition ?? ""),
      imageUrl: String(images[0]?.image_url ?? ""),
    };
  });
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
  const columns = await tableColumns(session, "listing_images");
  const rows = images.map((image, index) => {
    const row: Record<string, unknown> = {};
    setExisting(row, columns, listingImageFields.listingId, listingId);
    setExisting(row, columns, listingImageFields.url, image.publicUrl);
    setExisting(row, columns, listingImageFields.path, image.path);
    setExisting(row, columns, listingImageFields.sortOrder, index);
    setExisting(row, columns, listingImageFields.altText, `Equipment image ${index + 1}`);
    return row;
  });

  await supabaseFetch('/rest/v1/listing_images', session, { method: "POST", body: JSON.stringify(rows) });
}
export async function getListingById(id: string, session?: AuthSession) {
  const rows = await supabaseFetch<Array<Record<string, unknown>>>(
    `/rest/v1/listings?select=id,title,price,city,condition,description,brand,model,contact_name,contact_email,contact_phone,categories(name),listing_images(image_url,sort_order)&id=eq.${encodeURIComponent(id)}&limit=1`,
    session
  );

  const row = rows[0];
  if (!row) return null;

  const category = row.categories as { name?: string } | null;

  const images = Array.isArray(row.listing_images)
    ? (row.listing_images as Array<{
        image_url?: string;
        sort_order?: number;
      }>)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((image) => String(image.image_url ?? ""))
        .filter(Boolean)
    : [];

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: String(category?.name ?? "Medical Equipment"),
    price: Number(row.price ?? 0),
    city: String(row.city ?? ""),
    condition: String(row.condition ?? ""),
    description: String(row.description ?? ""),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    contactName: String(row.contact_name ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    contactPhone: String(row.contact_phone ?? ""),
    images,
  };
}
