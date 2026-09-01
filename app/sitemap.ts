import type { MetadataRoute } from "next";

type SitemapListing = { id?: string; created_at?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.medicalequipes.com";
  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return pages;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/listings?select=id,created_at&status=in.(active,out_of_stock)&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } }
    );
    if (!response.ok) return pages;
    const listings = await response.json() as SitemapListing[];
    return pages.concat(listings.filter((item) => item.id).map((item) => ({
      url: `${baseUrl}/listing/${item.id}`,
      lastModified: item.created_at || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })));
  } catch {
    return pages;
  }
}

