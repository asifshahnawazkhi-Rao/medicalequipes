const GRAPH_VERSION = "v26.0";

async function graphRequest(path: string, values: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Instagram rejected the post.");
  }
  return data as Record<string, unknown>;
}

async function graphGet(path: string, values: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Instagram media status could not be checked.");
  }
  return data as Record<string, unknown>;
}

async function waitForMediaContainer(containerId: string, accessToken: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const container = await graphGet(containerId, {
      fields: "status_code,status",
      access_token: accessToken,
    });
    const statusCode = String(container.status_code ?? "").toUpperCase();
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(String(container.status ?? "Instagram could not process the listing image."));
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Instagram image processing timed out. Please try publishing again.");
}

export async function resolveInstagramBusinessId(pageId: string, accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account{id,username}");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Could not find the connected Instagram account.");
  }
  const id = data?.instagram_business_account?.id;
  if (!id) throw new Error("No Instagram business account is connected to this Facebook Page.");
  return String(id);
}

export async function publishInstagramImage(
  pageId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  const instagramId = await resolveInstagramBusinessId(pageId, accessToken);
  const container = await graphRequest(`${instagramId}/media`, {
    image_url: imageUrl,
    caption: caption.slice(0, 2200),
    access_token: accessToken,
  });
  if (!container.id) throw new Error("Instagram media container was not created.");
  await waitForMediaContainer(String(container.id), accessToken);
  const published = await graphRequest(`${instagramId}/media_publish`, {
    creation_id: String(container.id),
    access_token: accessToken,
  });
  return { instagramId, postId: String(published.id ?? "") };
}
