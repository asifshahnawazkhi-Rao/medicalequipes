import { publishInstagramImage, publishInstagramVideo } from "./instagram";

export type SocialMediaType = "image" | "video" | "pdf";

export type SocialPublishInput = {
  title: string;
  caption: string;
  imageUrl: string;
  mediaType?: SocialMediaType;
  websiteUrl?: string;
  publishFacebook: boolean;
  publishInstagram: boolean;
};

export type SocialPublishResult = {
  facebook: { status: string; postId?: string; error?: string };
  instagram: { status: string; postId?: string; error?: string };
};

async function graphPost(path: string, values: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/v26.0/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Meta rejected the post.");
  return data as Record<string, unknown>;
}

async function resolvePageAccessToken(pageId: string, storedToken: string) {
  const url = new URL("https://graph.facebook.com/v26.0/me/accounts");
  url.searchParams.set("fields", "id,access_token");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", storedToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.data)) return storedToken;
  return data.data.find((item: { id?: string; access_token?: string }) => String(item.id ?? "") === pageId)?.access_token || storedToken;
}

export async function publishSocialPost(input: SocialPublishInput): Promise<SocialPublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const storedToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !storedToken) throw new Error("Meta publishing is not configured.");

  const pageToken = await resolvePageAccessToken(pageId, storedToken);
  const caption = `${input.title.trim()}\n\n${input.caption.trim()}${input.websiteUrl?.trim() ? `\n\nLearn more: ${input.websiteUrl.trim()}` : ""}`;
  const facebook: SocialPublishResult["facebook"] = { status: input.publishFacebook ? "pending" : "not_selected" };
  const instagram: SocialPublishResult["instagram"] = { status: input.publishInstagram ? "pending" : "not_selected" };
  const mediaType = input.mediaType || "image";

  if (input.publishFacebook) {
    try {
      const result = mediaType === "video"
        ? await graphPost(`${pageId}/videos`, { file_url: input.imageUrl, description: caption, access_token: pageToken })
        : mediaType === "pdf"
          ? await graphPost(`${pageId}/feed`, { message: caption, link: input.imageUrl, access_token: pageToken })
          : await graphPost(`${pageId}/photos`, { url: input.imageUrl, caption, access_token: pageToken });
      facebook.status = "published";
      facebook.postId = String(result.post_id || result.id || "");
    } catch (error) {
      facebook.status = "failed";
      facebook.error = error instanceof Error ? error.message : "Facebook publishing failed.";
    }
  }

  if (input.publishInstagram) {
    try {
      if (mediaType === "pdf") {
        instagram.status = "not_supported";
        instagram.error = "Instagram does not support direct PDF posts. Select Facebook only or convert the PDF page to an image.";
        return { facebook, instagram };
      }
      const result = mediaType === "video"
        ? await publishInstagramVideo(pageId, pageToken, input.imageUrl, caption)
        : await publishInstagramImage(pageId, pageToken, input.imageUrl, caption);
      instagram.status = "published";
      instagram.postId = result.postId;
    } catch (error) {
      instagram.status = "failed";
      instagram.error = error instanceof Error ? error.message : "Instagram publishing failed.";
    }
  }

  return { facebook, instagram };
}
