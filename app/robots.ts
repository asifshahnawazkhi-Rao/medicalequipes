import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/profile", "/favorites", "/sell"],
    },
    sitemap: "https://www.medicalequipes.com/sitemap.xml",
    host: "https://www.medicalequipes.com",
  };
}

