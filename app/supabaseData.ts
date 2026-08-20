import { AuthSession, getSupabaseConfig } from "./auth";

type Schema = Record<string, { properties?: Record<string, unknown> }>;

export type CategoryOption = { id: string; name: string };

const listingColumnAliases = {
  userId: ["user_id", "seller_id", "profile_id", "owner_id", "created_by"],
  categoryId: ["category_id"],
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
};

const imageColumnAliases = {
  listingId: ["listing_id"],
  url: ["image_url", "url", "public_url"],
  path: ["storage_path", "path", "file_path"],
  sortOrder: ["sort_order", "position", "display_order"],
  altText: ["alt_text"],
};

export async function supabaseFetch<T>(path: string, session?: AuthSession, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${session?.access_token ?? key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

async function getSchema(session?: AuthSession) {
  const api = await supabaseFetch<{ definitions?: Schema }>("/rest/v1/", session);
  return api.definitions ?? {};
}

function columnsFor(schema: Schema, table: string) {
  return Object.keys(schema[table]?.properties ?? {});
}

function pick(columns: string[], aliases: string[]) {
  return aliases.find((column) => columns.includes(column));
}

function assignKnown(payload: Record<string, unknown>, columns: string[], aliases: string[], value: unknown) {
  const column = pick(columns, aliases);
  if (column && value !== undefined && value !== "") payload[column] = value;
}

export async function getCategories(session?: AuthSession) {
  try {
    const rows = await supabaseFetch<Array<Record<string, unknown>>>("/rest/v1/categories?select=id,name,title&order=name.asc", session);
    return rows.map((row) => ({ id: String(row.id), name: String(row.name ?? row.title ?? row.id) }));
  } catch {
    return [];
  }
}

export async function createListing(session: AuthSession, values: Record<string, string>) {
  if (!session.user?.id) throw new Error("Your session is missing a user id. Please log in again.");

  const schema = await getSchema(session);
  const columns = columnsFor(schema, "listings");
  if (!columns.length) throw new Error("Could not inspect the listings table schema from Supabase.");

  const payload: Record<string, unknown> = {};
  assignKnown(payload, columns, listingColumnAliases.userId, session.user.id);
  assignKnown(payload, columns, listingColumnAliases.categoryId, values.categoryId);
  assignKnown(payload, columns, listingColumnAliases.title, values.title.trim());
  assignKnown(payload, columns, listingColumnAliases.brand, values.brand.trim());
  assignKnown(payload, columns, listingColumnAliases.model, values.model.trim());
  assignKnown(payload, columns, listingColumnAliases.condition, values.condition);
  assignKnown(payload, columns, listingColumnAliases.price, Number(values.price));
  assignKnown(payload, columns, listingColumnAliases.city, values.city.trim());
  assignKnown(payload, columns, listingColumnAliases.description, values.description.trim());
  assignKnown(payload, columns, listingColumnAliases.contactName, values.contactName.trim());
  assignKnown(payload, columns, listingColumnAliases.contactEmail, values.contactEmail.trim());
  assignKnown(payload, columns, listingColumnAliases.contactPhone, values.contactPhone.trim());
  assignKnown(payload, columns, listingColumnAliases.status, "active");

  const rows = await supabaseFetch<Array<{ id: string }>>("/rest/v1/listings?select=id", session, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  return rows[0];
}

export async function uploadListingImage(session: AuthSession, listingId: string, file: File) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${session.user?.id}/${listingId}/${Date.now()}-${safeName}`;
  await supabaseFetch(`/storage/v1/object/listing-images/${path}`, session, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  });
  const { url } = getSupabaseConfig();
  return { path, publicUrl: `${url}/storage/v1/object/public/listing-images/${path}` };
}

export async function saveListingImages(session: AuthSession, listingId: string, images: Array<{ path: string; publicUrl: string }>) {
  if (!images.length) return;
  const schema = await getSchema(session);
  const columns = columnsFor(schema, "listing_images");
  if (!columns.length) throw new Error("Could not inspect the listing_images table schema from Supabase.");

  const rows = images.map((image, index) => {
    const payload: Record<string, unknown> = {};
    assignKnown(payload, columns, imageColumnAliases.listingId, listingId);
    assignKnown(payload, columns, imageColumnAliases.url, image.publicUrl);
    assignKnown(payload, columns, imageColumnAliases.path, image.path);
    assignKnown(payload, columns, imageColumnAliases.sortOrder, index);
    assignKnown(payload, columns, imageColumnAliases.altText, `Equipment image ${index + 1}`);
    return payload;
  });

  await supabaseFetch("/rest/v1/listing_images", session, { method: "POST", body: JSON.stringify(rows) });
}
