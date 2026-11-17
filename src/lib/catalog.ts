import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CatalogQuery } from "@/lib/validation";

export const productInclude = {
  category: true,
  brand: true,
} satisfies Prisma.ProductInclude;
export type StoreProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
export async function getTaxonomy() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { categories, brands };
}
export async function getFeatured() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return prisma.product.findMany({
    where: { isFeatured: true, status: "PUBLISHED" },
    include: productInclude,
    take: 4,
    orderBy: { id: "asc" },
  });
}
export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return prisma.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: productInclude,
  });
}
export async function getProducts(query: CatalogQuery) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(query.spec
      ? { specs: { path: [query.spec.key], equals: query.spec.value } }
      : {}),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    }),
    ...(query.category && { category: { slug: query.category } }),
    ...(query.brand && { brand: { slug: query.brand } }),
    ...((query.min !== undefined || query.max !== undefined) && {
      price: { gte: query.min, lte: query.max },
    }),
    ...(query.stock === "1" && { stock: { gt: 0 } }),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "price-asc"
      ? [{ price: "asc" }, { id: "asc" }]
      : query.sort === "price-desc"
        ? [{ price: "desc" }, { id: "asc" }]
        : query.sort === "newest"
          ? [{ createdAt: "desc" }, { id: "desc" }]
          : [{ isFeatured: "desc" }, { id: "asc" }];
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      take: 12,
      skip: (query.page - 1) * 12,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);
  return { products, total, pages: Math.ceil(total / 12) };
}

export async function getSpecOptions(category: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return prisma.$queryRaw<{ key: string; value: string | number | boolean }[]>`
    SELECT DISTINCT prop.key, prop.value FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(p.specs) = 'object' THEN p.specs ELSE '{}'::jsonb END) prop
    WHERE p.status = 'PUBLISHED' AND (${category} = '' OR c.slug = ${category})
      AND jsonb_typeof(prop.value) IN ('string', 'number', 'boolean')
    ORDER BY prop.key, prop.value LIMIT 200`;
}
