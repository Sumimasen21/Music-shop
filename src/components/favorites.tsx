"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSaved } from "@/stores/saved";
import { useHydrated } from "@/components/cart-controls";
import { savedProductsAction } from "@/actions/saved";
import type { StoreProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

export function Favorites() {
  const ids = useSaved((state) => state.favorites);
  const comparison = useSaved((state) => state.comparison);
  const clear = useSaved((state) => state.clear);
  const toggle = useSaved((state) => state.toggle);
  const ready = useHydrated();
  const [result, setResult] = useState<{
    ids: number[];
    products: StoreProduct[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    savedProductsAction(ids)
      .then((response) => {
        if (active)
          setResult({
            ids,
            products: response.success ? response.data : [],
            error: response.success ? undefined : response.error,
          });
      })
      .catch(() => {
        if (active)
          setResult({
            ids,
            products: [],
            error: "Не удалось загрузить товары. Обновите страницу.",
          });
      });
    return () => {
      active = false;
    };
  }, [ids, ready]);
  const loaded = ready && result?.ids === ids;
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-4">
        <Button asChild variant="outline">
          <Link
            href={
              ready && comparison.length
                ? `/compare?ids=${comparison.join(",")}`
                : "/compare"
            }
          >
            Сравнение товаров
          </Link>
        </Button>
        {ready && ids.length > 0 && (
          <Button variant="ghost" onClick={() => clear("favorites")}>
            Очистить избранное
          </Button>
        )}
      </div>
      <p className="mb-6 text-sm text-zinc-400">
        Избранное сохраняется в этом браузере. Можно добавить до 100 товаров.
      </p>
      {!loaded ? (
        <p role="status">Загружаем…</p>
      ) : result.error ? (
        <p role="alert">{result.error}</p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {result.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {ids
            .filter(
              (id) => !result.products.some((product) => product.id === id),
            )
            .map((id) => (
              <p className="mt-4 text-sm text-zinc-400" key={id}>
                Товар MM-{String(id).padStart(5, "0")} больше не опубликован.{" "}
                <button
                  className="text-[#E5C158]"
                  onClick={() => toggle("favorites", id)}
                >
                  Убрать
                </button>
              </p>
            ))}
          {!ids.length && (
            <div className="panel p-8">
              Здесь появятся понравившиеся инструменты.{" "}
              <Link className="text-[#E5C158]" href="/catalog">
                Открыть каталог
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
