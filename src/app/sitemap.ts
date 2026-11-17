import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const base =
    process.env.SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return [
    ...["/", "/catalog", "/delivery"].map((path) => ({
      url: new URL(path, base).href,
    })),
    ...products.map((product) => ({
      url: new URL(`/product/${product.slug}`, base).href,
      lastModified: product.updatedAt,
    })),
  ];
}
