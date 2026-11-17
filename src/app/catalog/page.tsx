import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { getProducts, getTaxonomy, getSpecOptions } from "@/lib/catalog";
import { catalogSchema } from "@/lib/validation";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { specLabels } from "@/lib/specs";
export const metadata: Metadata = { title: "Каталог" };
type Params = Promise<Record<string, string | string[] | undefined>>;
async function Catalog({ searchParams }: { searchParams: Params }) {
  const raw = await searchParams;
  const parsed = catalogSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <div className="container-shell py-16">
        <h1 className="display text-4xl">Проверьте параметры фильтра</h1>
        <p className="my-6 text-zinc-400">
          {parsed.error.issues[0].message ===
          "Минимальная цена не должна превышать максимальную"
            ? parsed.error.issues[0].message
            : "Укажите корректную цену, страницу и способ сортировки."}
        </p>
        <Button asChild variant="outline">
          <Link href="/catalog">Сбросить фильтры</Link>
        </Button>
      </div>
    );
  const query = parsed.data;
  const specOptions = await getSpecOptions(query.category);
  const [{ categories, brands }, { products, total, pages }] =
    await Promise.all([getTaxonomy(), getProducts(query)]);
  function pageUrl(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw))
      if (typeof value === "string") params.set(key, value);
    params.set("page", String(page));
    return `/catalog?${params}`;
  }
  return (
    <div className="container-shell py-10">
      <p className="mb-8 text-xs text-zinc-500">
        <Link href="/" className="hover:text-[#D4AF37]">
          Главная
        </Link>{" "}
        <span className="mx-3">/</span> Каталог
      </p>
      <p className="eyebrow mb-3">Найди своё звучание</p>
      <h1 className="display mb-4 text-5xl">
        Каталог инструментов<span className="text-[#D4AF37]">.</span>
      </h1>
      <p className="mb-10 text-sm text-zinc-400">
        Для вдохновения, репетиций, студии и большой сцены.
      </p>
      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <form action="/catalog" className="panel grid gap-6 p-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4 text-[#D4AF37]" /> Фильтры
          </p>
          <label className="label">
            Поиск
            <div className="relative">
              <input
                id="search"
                name="q"
                type="search"
                maxLength={120}
                defaultValue={query.q}
                placeholder="Название инструмента"
                className="field pr-9"
              />
              <Search className="absolute right-3 top-3.5 size-4 text-zinc-500" />
            </div>
          </label>
          <label className="label">
            Категория
            <select
              name="category"
              defaultValue={query.category}
              className="field"
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Бренд
            <select name="brand" defaultValue={query.brand} className="field">
              <option value="">Все бренды</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-[13px] text-zinc-400">Цена, ₽</legend>
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="Минимальная цена"
                name="min"
                type="number"
                min={0}
                max={100000000}
                defaultValue={query.min}
                placeholder="От"
                className="field min-w-0"
              />
              <input
                aria-label="Максимальная цена"
                name="max"
                type="number"
                min={0}
                max={100000000}
                defaultValue={query.max}
                placeholder="До"
                className="field min-w-0"
              />
            </div>
          </fieldset>
          <label className="label">
            Сортировка
            <select name="sort" className="field" defaultValue={query.sort}>
              <option value="featured">Сначала избранные</option>
              <option value="price-asc">Сначала дешевле</option>
              <option value="price-desc">Сначала дороже</option>
              <option value="newest">Сначала новые</option>
            </select>
          </label>
          <label className="label">
            Характеристика
            <select
              name="spec"
              className="field"
              defaultValue={query.spec ? JSON.stringify(query.spec) : ""}
            >
              <option value="">Любая</option>
              {specOptions.map((option) => (
                <option
                  key={JSON.stringify(option)}
                  value={JSON.stringify(option)}
                >
                  {specLabels[option.key] ?? option.key}:{" "}
                  {typeof option.value === "boolean"
                    ? option.value
                      ? "Да"
                      : "Нет"
                    : String(option.value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={query.stock === "1"}
              className="size-4 accent-[#D4AF37]"
            />
            Только в наличии
          </label>
          <Button type="submit">Показать товары</Button>
          <Link
            href="/catalog"
            className="text-center text-xs text-zinc-500 hover:text-[#D4AF37]"
          >
            Сбросить фильтры
          </Link>
        </form>
        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between text-xs text-zinc-400">
            <span>Найдено товаров: {total}</span>
            <span>
              Страница {query.page} из {Math.max(pages, 1)}
            </span>
          </div>
          {products.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="panel p-12 text-center">
              <Search className="mx-auto mb-5 size-8 text-[#D4AF37]" />
              <h2 className="text-xl">Ничего не найдено</h2>
              <p className="my-4 text-sm text-zinc-400">
                Попробуйте изменить запрос или сбросить фильтры.
              </p>
              <Button asChild variant="outline">
                <Link href="/catalog">Показать все товары</Link>
              </Button>
            </div>
          )}
          {pages > 1 && (
            <nav
              aria-label="Страницы каталога"
              className="mt-8 flex items-center justify-center gap-4"
            >
              {query.page > 1 && (
                <Button asChild variant="outline">
                  <Link href={pageUrl(query.page - 1)}>Назад</Link>
                </Button>
              )}
              {query.page < pages && (
                <Button asChild variant="outline">
                  <Link href={pageUrl(query.page + 1)}>
                    Далее <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
export default function CatalogPage(props: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <div className="container-shell py-20 text-zinc-400">
          Загружаем каталог…
        </div>
      }
    >
      <Catalog {...props} />
    </Suspense>
  );
}
