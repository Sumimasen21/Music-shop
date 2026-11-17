import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { StoreProduct } from "@/lib/catalog";
import { money } from "@/lib/utils";
import { AddToCart } from "@/components/cart-controls";
import { imageSource } from "@/lib/images";
import { SavedButtons } from "@/components/saved-controls";
export const fallbackImage = "/images/hero.jpg";
export function ProductCard({ product }: { product: StoreProduct }) {
  const image = imageSource(product.images[0]);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-[#161619] transition-all hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#1d1d20]"
      >
        <Image
          src={image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161619]/40 to-transparent" />
        {product.oldPrice ? (
          <span className="absolute left-4 top-4 rounded-md border border-[#D4AF37]/30 bg-[#121214]/90 px-2.5 py-1 text-[11px] font-semibold text-[#E5C158]">
            −{Math.round((1 - product.price / product.oldPrice) * 100)}%
          </span>
        ) : product.isFeatured ? (
          <span className="absolute left-4 top-4 rounded-md border border-[#D4AF37]/30 bg-[#121214]/90 px-2.5 py-1 text-[11px] text-[#E5C158]">
            Выбор музыкантов
          </span>
        ) : null}
        <ArrowUpRight className="absolute bottom-4 right-4 size-5 text-white/70" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4">
          <SavedButtons id={product.id} />
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          {product.brand.name} <span className="mx-1 text-[#D4AF37]">/</span>{" "}
          {product.category.name}
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="mb-4 line-clamp-2 min-h-12 text-base font-medium leading-6 hover:text-[#E5C158]"
        >
          {product.title}
        </Link>
        <p
          className={`mb-5 flex items-center gap-2 text-xs ${product.stock ? "text-zinc-400" : "text-zinc-500"}`}
        >
          <span
            className={`size-1.5 rounded-full ${product.stock ? "bg-[#D4AF37]" : "bg-zinc-600"}`}
          />
          {product.stock ? "В наличии" : "Ожидаем поступление"}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            {product.oldPrice && (
              <p className="text-xs text-zinc-500 line-through">
                {money(product.oldPrice)}
              </p>
            )}
            <p className="text-xl font-semibold tracking-tight text-[#E5C158]">
              {money(product.price)}
            </p>
          </div>
          <AddToCart
            compact
            product={{
              productId: product.id,
              title: product.title,
              slug: product.slug,
              price: product.price,
              stock: product.stock,
              image,
            }}
          />
        </div>
      </div>
    </article>
  );
}
