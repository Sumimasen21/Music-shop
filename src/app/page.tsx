import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  PackageCheck,
  Headphones,
} from "lucide-react";
import { getFeatured, getTaxonomy } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { HeroBanner } from "@/components/hero-banner";

const categoryImages: Record<string, string> = {
  "electric-guitars": "/images/hero.jpg",
  synthesizers: "/images/keys.jpg",
  "studio-gear": "/images/studio.jpg",
};
export default async function Home() {
  const [products, { categories, brands }] = await Promise.all([
    getFeatured(),
    getTaxonomy(),
  ]);
  return (
    <>
      <HeroBanner />
      <div className="container-shell grid mt-10 gap-6 border-b border-white/10 px-6 py-8 sm:grid-cols-3 sm:px-8">
        {[
          {
            icon: ShieldCheck,
            title: "Внимание к деталям",
            text: "Подробные характеристики инструментов",
          },
          {
            icon: PackageCheck,
            title: "Актуальное наличие",
            text: "Остатки проверяются при заказе",
          },
          {
            icon: Headphones,
            title: "Всё для твоего звука",
            text: "От домашней студии до сцены",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex min-w-0 items-center gap-4 sm:justify-self-center sm:first:justify-self-start sm:last:justify-self-end"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5">
              <Icon className="size-5 text-[#D4AF37]" strokeWidth={1.3} />
            </div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 font-serif text-sm italic leading-relaxed text-zinc-400">
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>
      <section className="container-shell pt-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Территория музыки</p>
            <h2 className="display text-4xl">Найди своё направление</h2>
          </div>
          <Link
            href="/catalog"
            className="hidden items-center gap-2 text-xs text-zinc-400 hover:text-[#D4AF37] sm:flex"
          >
            Весь каталог <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/catalog?category=${category.slug}`}
              className="group relative min-h-60 overflow-hidden rounded-xl border border-[#D4AF37]/30 hover:border-[#D4AF37]"
            >
              {(category.imageUrl?.startsWith("https://images.unsplash.com/") ||
                categoryImages[category.slug]) && (
                <Image
                  src={
                    category.imageUrl?.startsWith(
                      "https://images.unsplash.com/",
                    )
                      ? category.imageUrl
                      : categoryImages[category.slug]
                  }
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-65 transition duration-700 group-hover:scale-105 group-hover:opacity-85"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/20 to-transparent" />
              <span className="absolute left-6 top-5 font-mono text-xs text-white/50">
                0{index + 1}
              </span>
              <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
                <div>
                  <h3 className="text-xl font-medium">{category.name}</h3>
                  <p className="mt-2 text-xs text-zinc-400">
                    Товаров: {category._count.products}
                  </p>
                </div>
                <ArrowUpRight
                  className="size-6 text-[#E5C158]"
                  strokeWidth={1.2}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section id="featured" className="container-shell pt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Проверено вдохновением</p>
            <h2 className="display text-4xl">
              Выбор музыкантов<span className="text-[#D4AF37]">.</span>
            </h2>
          </div>
          <Link
            href="/catalog"
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-[#D4AF37]"
          >
            Все товары <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!products.length && (
          <p className="panel p-8 text-zinc-400">
            Скоро здесь появятся избранные инструменты. Загляните в каталог.
          </p>
        )}
      </section>
      <section className="container-shell mt-20 border-y border-white/10 py-10">
        <p className="eyebrow text-center text-zinc-500">Популярные модели</p>
        <div className="mt-8 flex flex-wrap items-center justify-around gap-8">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/catalog?brand=${brand.slug}`}
              className="font-serif text-3xl italic text-zinc-500 transition hover:text-[#E5C158]"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </section>
      <section className="container-shell mt-16 flex flex-col items-start justify-between gap-8 rounded-xl border border-[#D4AF37]/30 bg-[#161619] p-8 md:flex-row md:items-center md:p-12">
        <div>
          <p className="eyebrow mb-4">Музыка начинается с тебя</p>
          <h2 className="display text-4xl">Твой следующий звук — здесь.</h2>
          <p className="mt-4 text-sm text-zinc-400">
            Собери свой сетап. Найди то, что вдохновляет играть.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/catalog">
            Открыть каталог <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
