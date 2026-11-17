import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { productSlugSchema } from "@/lib/validation";
import { ShieldCheck, PackageCheck } from "lucide-react";
import { getProduct } from "@/lib/catalog";
import { money } from "@/lib/utils";
import { Gallery } from "@/components/gallery";
import { AddToCart } from "@/components/cart-controls";
import { fallbackImage } from "@/components/product-card";
import { imageSource, isIllustration } from "@/lib/images";
import { SavedButtons } from "@/components/saved-controls";
import { ProductFeedback } from "@/components/product-feedback";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { productInclude } from "@/lib/catalog";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = productSlugSchema.safeParse(slug);
  const product = parsed.success ? await getProduct(parsed.data) : null;
  if (!product) return { title: "Товар не найден", robots: { index: false } };
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 160),
      images: [imageSource(product.images[0])],
    },
  };
}
const specNames: Record<string, string> = {
  strings: "Количество струн",
  body: "Корпус",
  neck: "Гриф",
  pickups: "Звукосниматели",
  color: "Цвет",
  keys: "Количество клавиш",
  polyphony: "Полифония",
  weight: "Вес",
  type: "Тип",
  pattern: "Направленность",
  connector: "Разъём",
  power: "Мощность",
  woofer: "НЧ-динамик",
  inputs: "Входы",
};
export default async function ProductPage({ params }: Props) {
  const parsed = productSlugSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();
  const product = await getProduct(parsed.data);
  if (!product) notFound();
  const images = product.images.length
    ? product.images.map(imageSource)
    : [fallbackImage];
  const specs =
    product.specs &&
    typeof product.specs === "object" &&
    !Array.isArray(product.specs)
      ? Object.entries(product.specs)
      : [];
  return (
    <div className="container-shell py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: product.images
              .map(imageSource)
              .map(
                (image) =>
                  new URL(
                    image,
                    process.env.SITE_URL ??
                      process.env.AUTH_URL ??
                      "http://localhost:3000",
                  ).href,
              ),
            sku: `MM-${String(product.id).padStart(5, "0")}`,
            brand: { "@type": "Brand", name: product.brand.name },
            offers: {
              "@type": "Offer",
              url: new URL(
                `/product/${product.slug}`,
                process.env.SITE_URL ??
                  process.env.AUTH_URL ??
                  "http://localhost:3000",
              ).href,
              priceCurrency: "RUB",
              price: product.price,
              availability: product.stock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
      <nav
        aria-label="Хлебные крошки"
        className="mb-8 flex flex-wrap gap-3 text-xs text-zinc-500"
      >
        <Link href="/">Главная</Link>
        <span>/</span>
        <Link href="/catalog">Каталог</Link>
        <span>/</span>
        <Link href={`/catalog?category=${product.category.slug}`}>
          {product.category.name}
        </Link>
      </nav>
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <div>
          <Gallery images={images} title={product.title} />
          {isIllustration(product.images[0]) && (
            <p className="mt-3 text-xs text-zinc-500">
              Фото для иллюстрации. Внешний вид конкретной модели может
              отличаться.
            </p>
          )}
        </div>
        <div className="py-3">
          <p className="eyebrow mb-5">
            {product.brand.name} / {product.category.name}
          </p>
          <h1 className="display text-4xl leading-tight lg:text-5xl">
            {product.title}
          </h1>
          <p className="mt-5 text-xs text-zinc-500">
            Артикул: MM-{String(product.id).padStart(5, "0")}
          </p>
          <p className="mt-6 flex items-center gap-2 text-sm text-zinc-400">
            <span
              className={`size-2 rounded-full ${product.stock ? "bg-[#D4AF37]" : "bg-zinc-500"}`}
            />
            {product.stock
              ? `В наличии: ${product.stock} шт.`
              : "Нет в наличии"}
          </p>
          <div className="my-8 border-y border-white/10 py-6">
            {product.oldPrice && (
              <p className="mb-1 text-sm text-zinc-500 line-through">
                {money(product.oldPrice)}
              </p>
            )}
            <p className="text-4xl font-semibold tracking-tight text-[#E5C158]">
              {money(product.price)}
            </p>
          </div>
          <AddToCart
            product={{
              productId: product.id,
              title: product.title,
              slug: product.slug,
              price: product.price,
              stock: product.stock,
              image: images[0],
            }}
          />
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Доставка согласуется после оформления. Оплата на сайте пока не
            подключена.
          </p>
          <SavedButtons id={product.id} />
          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 text-xs text-zinc-400">
            <p className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[#D4AF37]" />
              Стоимость фиксируется при оформлении заказа
            </p>
            <p className="flex items-center gap-3">
              <PackageCheck className="size-5 text-[#D4AF37]" />
              Проверяем наличие перед подтверждением
            </p>
          </div>
        </div>
      </div>
      <div className="mt-16 grid gap-12 md:grid-cols-2">
        <section>
          <p className="eyebrow mb-4">О твоём инструменте</p>
          <h2 className="display mb-5 text-3xl">Описание</h2>
          <p className="whitespace-pre-line text-sm leading-8 text-zinc-400">
            {product.description}
          </p>
        </section>
        <section>
          <p className="eyebrow mb-4">В деталях</p>
          <h2 className="display mb-5 text-3xl">Характеристики</h2>
          {specs.length ? (
            <dl>
              {specs.map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-5 border-b border-white/10 py-3 text-sm"
                >
                  <dt className="text-zinc-400">{specNames[key] ?? key}</dt>
                  <dd className="text-right">
                    {typeof value === "boolean"
                      ? value
                        ? "Да"
                        : "Нет"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">Характеристики уточняются.</p>
          )}
        </section>
      </div>
      <Suspense
        fallback={<p className="mt-10 text-zinc-400">Загружаем отзывы…</p>}
      >
        <ProductFeedback productId={product.id} />
      </Suspense>
      {!!product.relatedIds.length && (
        <Suspense fallback={null}>
          <RelatedProducts ids={product.relatedIds} />
        </Suspense>
      )}
    </div>
  );
}

async function RelatedProducts({ ids }: { ids: number[] }) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: productInclude,
    take: 8,
  });
  if (!products.length) return null;
  return (
    <section className="mt-16">
      <h2 className="display mb-6 text-3xl">Подобранные аксессуары</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
