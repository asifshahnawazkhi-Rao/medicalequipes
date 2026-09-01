import type { Metadata } from "next";

type SeoListing = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  city?: string | null;
  condition?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  categories?: { name?: string | null } | null;
  listing_images?: Array<{ image_url?: string | null; sort_order?: number | null }>;
};

async function getSeoListing(id: string): Promise<SeoListing | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(
      `${url}/rest/v1/listings?select=id,title,description,price,city,condition,brand,model,status,categories(name),listing_images(image_url,sort_order)&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    const rows = await response.json() as SeoListing[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getSeoListing(id);
  if (!listing) return { title: "Medical Equipment Listing" };
  const description = (listing.description || `${listing.title} available in ${listing.city || "Pakistan"}. View equipment details and contact the seller on MedicalEquipes.`).replace(/\s+/g, " ").slice(0, 160);
  const images = [...(listing.listing_images || [])]
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((image) => image.image_url)
    .filter((image): image is string => Boolean(image));
  return {
    title: `${listing.title}${listing.city ? ` in ${listing.city}` : ""}`,
    description,
    alternates: { canonical: `/listing/${id}` },
    openGraph: { type: "website", title: listing.title, description, url: `/listing/${id}`, images },
    twitter: { card: "summary_large_image", title: listing.title, description, images },
    robots: listing.status === "active" || listing.status === "out_of_stock" ? undefined : { index: false, follow: false },
  };
}

export default async function ListingLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const listing = await getSeoListing(id);
  const image = listing?.listing_images?.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0]?.image_url;
  const structuredData = listing ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || undefined,
    image: image ? [image] : undefined,
    brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
    model: listing.model || undefined,
    category: listing.categories?.name || undefined,
    itemCondition: listing.condition?.toLowerCase() === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers: Number(listing.price || 0) > 0 ? {
      "@type": "Offer",
      url: `https://www.medicalequipes.com/listing/${id}`,
      priceCurrency: "PKR",
      price: Number(listing.price || 0),
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    } : undefined,
  } : null;
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}{children}</>;
}

