import { AuthSession, getSupabaseConfig } from "./auth";

export type CategoryOption = { id: string; name: string };

type ListingImageUpload = { path: string; publicUrl: string };

export async function getProfile(session: AuthSession) {
  requireUserSession(session);

  const userId = session.user!.id;

  const rows = await supabaseFetch<Array<Record<string, unknown>>>(
    `/rest/v1/profiles?select=id,full_name,phone,role,status,business_name,city,visiting_card_url&id=eq.${encodeURIComponent(
      userId
    )}&limit=1`,
    session
  );

  const row = rows[0];

  if (!row) return null;

  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    phone: String(row.phone ?? ""),
    role: String(row.role ?? ""),
    status: String(row.status ?? ""),
    businessName: String(row.business_name ?? ""),
    city: String(row.city ?? ""),
    visitingCardUrl: String(row.visiting_card_url ?? ""),
  };
}

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
  brand: string;
model: string;
};

export async function getPublicListings(
  session?: AuthSession
): Promise<PublicListing[]> {
  const rows = await supabaseFetch<Array<Record<string, unknown>>>(
    "/rest/v1/listings?select=id,title,brand,model,price,city,condition,status,categories(name),listing_images(image_url,sort_order)&status=eq.active&order=created_at.desc",
    session
  );

  return rows.map((row) => {
    const category =
      row.categories as { name?: string } | null;

    const images = Array.isArray(row.listing_images)
      ? (
          row.listing_images as Array<{
            image_url?: string;
            sort_order?: number;
          }>
        ).sort(
          (a, b) =>
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0)
        )
      : [];

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      category: String(
        category?.name ?? "Medical Equipment"
      ),
      price: Number(row.price ?? 0),
      city: String(row.city ?? ""),
      condition: String(row.condition ?? ""),
      brand: String(row.brand ?? ""),
      model: String(row.model ?? ""),
      imageUrl: String(
        images[0]?.image_url ?? ""
      ),
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
export async function uploadVisitingCard(
  session: AuthSession,
  file: File
) {
  requireUserSession(session);

  const user = session.user!;

  const safeName =
    file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "") || "visiting-card";

  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  await supabaseFetch(
    `/storage/v1/object/visiting-cards/${path}`,
    session,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    }
  );

  return {
    path,
  };
}
export async function saveListingImages(
  session: AuthSession,
  listingId: string,
  images: ListingImageUpload[],
  startSortOrder = 0
) {
  requireUserSession(session);

  if (!images.length) return;

  const columns = await tableColumns(
    session,
    "listing_images"
  );

  const rows = images.map((image, index) => {
    const row: Record<string, unknown> = {};

    setExisting(
      row,
      columns,
      listingImageFields.listingId,
      listingId
    );

    setExisting(
      row,
      columns,
      listingImageFields.url,
      image.publicUrl
    );

    setExisting(
      row,
      columns,
      listingImageFields.path,
      image.path
    );

    setExisting(
      row,
      columns,
      listingImageFields.sortOrder,
      startSortOrder + index
    );

    setExisting(
      row,
      columns,
      listingImageFields.altText,
      `Equipment image ${
        startSortOrder + index + 1
      }`
    );

    return row;
  });

  await supabaseFetch(
    "/rest/v1/listing_images",
    session,
    {
      method: "POST",
      body: JSON.stringify(rows),
    }
  );
}
export type EditableListingImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export async function getListingImagesForEdit(
  session: AuthSession,
  listingId: string
): Promise<EditableListingImage[]> {
  requireUserSession(session);

  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/listing_images?select=id,image_url,sort_order&listing_id=eq.${encodeURIComponent(
      listingId
    )}&order=sort_order.asc`,
    session
  );

  return rows.map((row) => ({
    id: String(row.id ?? ""),
    imageUrl: String(row.image_url ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function deleteListingImage(
  session: AuthSession,
  listingId: string,
  imageId: string,
  imageUrl?: string
) {
  requireUserSession(session);

  await supabaseFetch(
    `/rest/v1/listing_images?id=eq.${encodeURIComponent(
      imageId
    )}&listing_id=eq.${encodeURIComponent(
      listingId
    )}`,
    session,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    }
  );

  // Best-effort storage cleanup.
  if (imageUrl) {
    const marker =
      "/storage/v1/object/public/listing-images/";

    const markerIndex = imageUrl.indexOf(marker);

    if (markerIndex >= 0) {
      const path = imageUrl.slice(
        markerIndex + marker.length
      );

      if (path) {
        try {
          await supabaseFetch(
            `/storage/v1/object/listing-images/${path}`,
            session,
            {
              method: "DELETE",
            }
          );
        } catch (error) {
          console.error(
            "Could not delete storage object:",
            error
          );
        }
      }
    }
  }
}
export async function getListingById(
  id: string,
  session?: AuthSession
) {
  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/listings?select=*,categories(name),listing_images(image_url,sort_order)&id=eq.${encodeURIComponent(
      id
    )}&limit=1`,
    session
  );

  const row = rows[0];

  if (!row) return null;

  const sellerId = String(row.seller_id ?? "");

  let sellerProfile: Record<string, unknown> | null = null;

  if (sellerId) {
    const profiles = await supabaseFetch<
      Array<Record<string, unknown>>
    >(
      `/rest/v1/profiles?select=id,full_name,phone,business_name,city,status,visiting_card_url&id=eq.${encodeURIComponent(
        sellerId
      )}&limit=1`,
      session
    );

    sellerProfile = profiles[0] ?? null;
  }

  const category =
    row.categories as { name?: string } | null;

  const images = Array.isArray(row.listing_images)
    ? (
        row.listing_images as Array<{
          image_url?: string;
          sort_order?: number;
        }>
      )
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0)
        )
        .map((image) =>
          String(image.image_url ?? "")
        )
        .filter(Boolean)
    : [];

  return {
    id: String(row.id),

    title: String(
      row.title ??
        row.name ??
        ""
    ),

    category: String(
      category?.name ??
        "Medical Equipment"
    ),

    price: Number(
      row.price ??
        row.asking_price ??
        row.amount ??
        0
    ),

    city: String(
      row.city ??
        row.location_city ??
        row.location ??
        ""
    ),

    condition: String(
      row.condition ??
        row.equipment_condition ??
        ""
    ),

    description: String(
      row.description ??
        row.details ??
        ""
    ),

    brand: String(row.brand ?? ""),

    model: String(row.model ?? ""),

    contactName: String(
      row.contact_name ??
        row.seller_name ??
        sellerProfile?.full_name ??
        ""
    ),

    contactEmail: String(
      row.contact_email ??
        row.email ??
        ""
    ),

    contactPhone: String(
      row.contact_phone ??
        row.phone ??
        row.phone_number ??
        sellerProfile?.phone ??
        ""
    ),

    sellerId,

    sellerFullName: String(
      sellerProfile?.full_name ?? ""
    ),

    sellerBusinessName: String(
      sellerProfile?.business_name ?? ""
    ),

    sellerCity: String(
      sellerProfile?.city ?? ""
    ),

    sellerPhone: String(
      sellerProfile?.phone ?? ""
    ),

    sellerStatus: String(
      sellerProfile?.status ?? ""
    ),

    sellerVisitingCardUrl: String(
      sellerProfile?.visiting_card_url ?? ""
    ),

    images,
  };
}
export async function updateProfile(
  session: AuthSession,
  values: {
    fullName: string;
    phone: string;
    businessName: string;
    city: string;
    visitingCardUrl?: string;
  }
) {
  requireUserSession(session);

  const userId = session.user!.id;

  const payload: Record<string, unknown> = {
    full_name: values.fullName,
    phone: values.phone,
    business_name: values.businessName,
    city: values.city,
  };

  if (typeof values.visitingCardUrl === "string") {
    payload.visiting_card_url = values.visitingCardUrl;
  }

  await supabaseFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    session,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );
}
export type SellerListing = {
  id: string;
  title: string;
  price: number;
  city: string;
  condition: string;
  status: string;
  imageUrl: string;
};

export async function getSellerListings(
  session: AuthSession
): Promise<SellerListing[]> {
  requireUserSession(session);

  const userId = session.user!.id;

  const rows = await supabaseFetch<Array<Record<string, unknown>>>(
    `/rest/v1/listings?select=id,title,price,city,condition,status,listing_images(image_url,sort_order)&seller_id=eq.${encodeURIComponent(
      userId
    )}&order=created_at.desc`,
    session
  );

  return rows.map((row) => {
    const images = Array.isArray(row.listing_images)
      ? (
          row.listing_images as Array<{
            image_url?: string;
            sort_order?: number;
          }>
        )
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [];

    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      price: Number(row.price ?? 0),
      city: String(row.city ?? ""),
      condition: String(row.condition ?? ""),
      status: String(row.status ?? ""),
      imageUrl: String(images[0]?.image_url ?? ""),
    };
  });
}
export async function getVisitingCardSignedUrl(
  session: AuthSession,
  path: string
) {
  requireUserSession(session);

  if (!path) return "";

  const data = await supabaseFetch<{
    signedURL?: string;
    signedUrl?: string;
  }>(
    `/storage/v1/object/sign/visiting-cards/${path}`,
    session,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expiresIn: 3600,
      }),
    }
  );

  const signedPath = String(
    data.signedURL ?? data.signedUrl ?? ""
  );

  if (!signedPath) return "";

  if (
    signedPath.startsWith("http://") ||
    signedPath.startsWith("https://")
  ) {
    return signedPath;
  }

  const { url } = getSupabaseConfig();

  if (signedPath.startsWith("/storage/v1/")) {
    return `${url}${signedPath}`;
  }

  if (signedPath.startsWith("/object/")) {
    return `${url}/storage/v1${signedPath}`;
  }

  return `${url}/storage/v1/${signedPath.replace(/^\/+/, "")}`;
}
export async function updateListing(
  session: AuthSession,
  listingId: string,
  values: Record<string, string>
) {
  requireUserSession(session);

  const user = session.user!;
  const columns = await tableColumns(session, "listings");
  const payload: Record<string, unknown> = {};

  setExisting(payload, columns, listingFields.category, values.categoryId);
  setExisting(payload, columns, listingFields.title, values.title?.trim());
  setExisting(payload, columns, listingFields.brand, values.brand?.trim());
  setExisting(payload, columns, listingFields.model, values.model?.trim());
  setExisting(payload, columns, listingFields.condition, values.condition);
  setExisting(payload, columns, listingFields.price, Number(values.price));
  setExisting(payload, columns, listingFields.city, values.city?.trim());
  setExisting(
    payload,
    columns,
    listingFields.description,
    values.description?.trim()
  );
  setExisting(
    payload,
    columns,
    listingFields.contactName,
    values.contactName?.trim()
  );
  setExisting(
    payload,
    columns,
    listingFields.contactEmail,
    values.contactEmail?.trim()
  );
  setExisting(
    payload,
    columns,
    listingFields.contactPhone,
    values.contactPhone?.trim()
  );

  await supabaseFetch(
    `/rest/v1/listings?id=eq.${encodeURIComponent(
      listingId
    )}&seller_id=eq.${encodeURIComponent(user.id)}`,
    session,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );
}
export async function deleteListing(
  session: AuthSession,
  listingId: string
) {
  requireUserSession(session);

  const user = session.user!;

  await supabaseFetch(
    `/rest/v1/listings?id=eq.${encodeURIComponent(
      listingId
    )}&seller_id=eq.${encodeURIComponent(user.id)}`,
    session,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    }
  );
}
export async function updateListingStatus(
  listingId: string,
  status: "active" | "sold" | "draft",
  session: AuthSession
) {
  requireUserSession(session);

  const userId = session.user!.id;

  await supabaseFetch(
    `/rest/v1/listings?id=eq.${encodeURIComponent(
      listingId
    )}&seller_id=eq.${encodeURIComponent(userId)}`,
    session,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );
}


      
export type AdminSellerProfile = {
  id: string;
  fullName: string;
  businessName: string;
  phone: string;
  city: string;
  role: string;
  status: string;
  visitingCardUrl: string;
};

export async function getPendingSellers(
  session: AuthSession
): Promise<AdminSellerProfile[]> {
  requireUserSession(session);

  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/profiles?select=id,full_name,business_name,phone,city,role,status,visiting_card_url&status=eq.pending&order=created_at.asc`,
    session
  );

  return rows.map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    businessName: String(row.business_name ?? ""),
    phone: String(row.phone ?? ""),
    city: String(row.city ?? ""),
    role: String(row.role ?? ""),
    status: String(row.status ?? ""),
    visitingCardUrl: String(row.visiting_card_url ?? ""),
  }));
}

export async function updateSellerApproval(
  session: AuthSession,
  sellerId: string,
  status: "approved" | "rejected"
) {
  requireUserSession(session);

  await supabaseFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(sellerId)}`,
    session,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );
}
export async function getAdminSellers(
  session: AuthSession
): Promise<AdminSellerProfile[]> {
  requireUserSession(session);

  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/profiles?select=id,full_name,business_name,phone,city,role,status,visiting_card_url&role=eq.seller&order=created_at.desc`,
    session
  );

  return rows.map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    businessName: String(row.business_name ?? ""),
    phone: String(row.phone ?? ""),
    city: String(row.city ?? ""),
    role: String(row.role ?? ""),
    status: String(row.status ?? ""),
    visitingCardUrl: String(
      row.visiting_card_url ?? ""
    ),
  }));
}
export async function getFavoriteListingIds(
  session: AuthSession
): Promise<string[]> {
  requireUserSession(session);

  const userId = session.user!.id;

  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/favorites?select=listing_id&user_id=eq.${encodeURIComponent(
      userId
    )}`,
    session
  );

  return rows
    .map((row) => String(row.listing_id ?? ""))
    .filter(Boolean);
}

export async function addFavorite(
  session: AuthSession,
  listingId: string
) {
  requireUserSession(session);

  const userId = session.user!.id;

  await supabaseFetch(
    "/rest/v1/favorites",
    session,
    {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        listing_id: listingId,
      }),
    }
  );
}

export async function removeFavorite(
  session: AuthSession,
  listingId: string
) {
  requireUserSession(session);

  const userId = session.user!.id;

  await supabaseFetch(
    `/rest/v1/favorites?user_id=eq.${encodeURIComponent(
      userId
    )}&listing_id=eq.${encodeURIComponent(listingId)}`,
    session,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    }
  );
}
export type PublicSeller = {
  id: string;
  fullName: string;
  businessName: string;
  city: string;
  activeListingCount: number;
};

export async function getPublicSellers(): Promise<PublicSeller[]> {
  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    "/rest/v1/rpc/get_public_sellers",
    undefined,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  return rows.map((row) => ({
    id: String(row.id ?? ""),
    fullName: String(row.full_name ?? ""),
    businessName: String(row.business_name ?? ""),
    city: String(row.city ?? ""),
    activeListingCount: Number(
      row.active_listing_count ?? 0
    ),
  }));
}
export async function getPublicSellerById(
  sellerId: string
): Promise<PublicSeller | null> {
  const sellers = await getPublicSellers();

  return (
    sellers.find(
      (seller) => seller.id === sellerId
    ) ?? null
  );
}

export async function getPublicSellerListings(
  sellerId: string
): Promise<PublicListing[]> {
  const rows = await supabaseFetch<
    Array<Record<string, unknown>>
  >(
    `/rest/v1/listings?select=id,title,brand,model,price,city,condition,status,categories(name),listing_images(image_url,sort_order)&seller_id=eq.${encodeURIComponent(
      sellerId
    )}&status=eq.active&order=created_at.desc`
  );

  return rows.map((row) => {
    const category =
      row.categories as { name?: string } | null;

    const images = Array.isArray(row.listing_images)
      ? (
          row.listing_images as Array<{
            image_url?: string;
            sort_order?: number;
          }>
        ).sort(
          (a, b) =>
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0)
        )
      : [];

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      category: String(
        category?.name ?? "Medical Equipment"
      ),
      price: Number(row.price ?? 0),
      city: String(row.city ?? ""),
      condition: String(row.condition ?? ""),
      brand: String(row.brand ?? ""),
      model: String(row.model ?? ""),
      imageUrl: String(
        images[0]?.image_url ?? ""
      ),
    };
  });
}
