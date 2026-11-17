import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/profile",
        "/cart",
        "/login",
        "/register",
        "/api/",
        "/favorites",
        "/compare",
      ],
    },
    sitemap: new URL("/sitemap.xml", base).href,
  };
}
