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
  const published = await graphRequest(`${instagramId}/media_publish`, {
    creation_id: String(container.id),
    access_token: accessToken,
  });
  return { instagramId, postId: String(published.id ?? "") };
}
