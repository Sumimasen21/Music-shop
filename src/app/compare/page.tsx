import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { imageSource } from "@/lib/images";
import { money } from "@/lib/utils";
import { SavedButtons } from "@/components/saved-controls";
import { specLabels } from "@/lib/specs";

export const metadata = {
  title: "Сравнение товаров",
  robots: { index: false },
};
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function Comparison({ searchParams }: Props) {
  const raw = (await searchParams).ids;
  const parsed = z
    .string()
    .max(80)
    .transform((value) => value.split(",").map(Number))
    .pipe(z.array(z.number().int().positive()).max(4))
    .safeParse(raw);
  if (!parsed.success)
    return (
      <p className="panel p-8">
        Добавьте до четырёх инструментов кнопкой «Сравнить» в{" "}
        <Link className="text-[#E5C158]" href="/catalog">
          каталоге
        </Link>
        .
      </p>
    );
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data }, status: "PUBLISHED" },
    include: { brand: true, category: true },
  });
  const keys = [
    ...new Set(
      products.flatMap((product) =>
        product.specs &&
        typeof product.specs === "object" &&
        !Array.isArray(product.specs)
          ? Object.keys(product.specs)
          : [],
      ),
    ),
  ];
  if (!products.length) return <p>Выбранные товары больше не опубликованы.</p>;
  const rows = [
    { title: "Цена", values: products.map((p) => money(p.price)) },
    { title: "Бренд", values: products.map((p) => p.brand.name) },
    { title: "Категория", values: products.map((p) => p.category.name) },
    {
      title: "Наличие",
      values: products.map((p) => (p.stock ? "В наличии" : "Нет в наличии")),
    },
    ...keys.map((key) => ({
      title: specLabels[key] ?? key,
      values: products.map((product) => {
        const value =
          product.specs &&
          typeof product.specs === "object" &&
          !Array.isArray(product.specs)
            ? product.specs[key]
            : null;
        return value === null || value === undefined
          ? "—"
          : value === true
            ? "Да"
            : value === false
              ? "Нет"
              : String(value);
      }),
    })),
  ];
  return (
    <>
      <p className="mb-5 text-sm text-zinc-400">
        {products.length !== new Set(parsed.data).size
          ? "Часть товаров больше не доступна. "
          : ""}
        Для точного сравнения выбирайте инструменты одной категории.
      </p>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-5">Характеристика</th>
              {products.map((p) => (
                <th key={p.id} className="min-w-60 p-5">
                  <div className="relative mb-4 aspect-square">
                    <Image
                      src={imageSource(p.images[0])}
                      alt={p.title}
                      fill
                      sizes="240px"
                      className="object-contain"
                    />
                  </div>
                  <Link className="text-[#E5C158]" href={`/product/${p.slug}`}>
                    {p.title}
                  </Link>
                  <SavedButtons id={p.id} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.title} className="border-t border-white/10">
                <th className="p-5 text-zinc-400">{row.title}</th>
                {row.values.map((value, i) => (
                  <td key={products[i].id} className="p-5">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export default function Page(props: Props) {
  return (
    <div className="container-shell py-12">
      <h1 className="display mb-8 text-5xl">Сравнение</h1>
      <Suspense fallback={<p>Загружаем сравнение…</p>}>
        <Comparison {...props} />
      </Suspense>
    </div>
  );
}
