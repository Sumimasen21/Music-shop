import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { money, orderStatuses } from "@/lib/utils";
import {
  EditProductButton,
  ProductDialog,
  DeleteProductButton,
  TaxonomyForm,
  OrderStatusControl,
} from "@/components/admin-controls";
import { productSchema } from "@/lib/validation";
import type { Prisma } from "@prisma/client";
import { OrderDetailsForm } from "@/components/order-controls";
import { OrderInfo } from "@/components/order-info";
import { Notifications } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { FeedbackModeration } from "@/components/product-feedback";
export const metadata: Metadata = { title: "Управление магазином" };
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function Admin({ searchParams }: Props) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN")
    return (
      <div className="container-shell py-20">
        <h1 className="display text-4xl">Доступ ограничен</h1>
        <p className="mt-5 text-zinc-400">
          Для этой страницы нужны права администратора.
        </p>
      </div>
    );
  const parsed = z
    .object({
      tab: z
        .enum(["products", "orders", "categories", "brands", "feedback"])
        .optional()
        .default("products"),
      q: z.string().trim().max(120).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      status: z
        .enum(["", "PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"])
        .default(""),
      publication: z.enum(["", "PUBLISHED", "DRAFT", "ARCHIVED"]).default(""),
    })
    .safeParse(await searchParams);
  const tab = parsed.success ? parsed.data.tab : "products";
  const { q, page, status, publication } = parsed.success
    ? parsed.data
    : ({ q: "", page: 1, status: "", publication: "" } as const);
  const productWhere: Prisma.ProductWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(publication ? { status: publication } : {}),
  };
  const orderWhere: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };
  const [
    products,
    categories,
    brands,
    orderCount,
    productCount,
    filteredProductCount,
    filteredOrderCount,
  ] = await Promise.all([
    tab === "products"
      ? prisma.product.findMany({
          where: productWhere,
          take: 20,
          skip: (page - 1) * 20,
          orderBy: { id: "asc" },
          include: { category: true, brand: true },
        })
      : Promise.resolve([]),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.order.count(),
    prisma.product.count(),
    prisma.product.count({ where: productWhere }),
    prisma.order.count({ where: orderWhere }),
  ]);
  const orders =
    tab === "orders"
      ? await prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          skip: (page - 1) * 20,
          where: orderWhere,
          include: {
            user: { select: { name: true, email: true } },
            items: { include: { product: true } },
            events: { orderBy: { createdAt: "asc" } },
          },
        })
      : [];
  const editableProducts: z.infer<typeof productSchema>[] = products.map(
    (product) => ({
      ...product,
      oldPrice: product.oldPrice ?? undefined,
      specs:
        product.specs &&
        typeof product.specs === "object" &&
        !Array.isArray(product.specs)
          ? Object.fromEntries(
              Object.entries(product.specs).filter(
                (entry): entry is [string, string | number | boolean] =>
                  typeof entry[1] === "string" ||
                  typeof entry[1] === "number" ||
                  typeof entry[1] === "boolean",
              ),
            )
          : undefined,
    }),
  );
  return (
    <div className="container-shell py-12">
      <p className="eyebrow mb-4">За пультом</p>
      <h1 className="display text-5xl">
        Управление магазином<span className="text-[#D4AF37]">.</span>
      </h1>
      <div className="my-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Товары", productCount],
          ["Категории", categories.length],
          ["Заказы", orderCount],
        ].map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="mt-3 text-3xl text-[#E5C158]">{value}</p>
          </div>
        ))}
      </div>
      <nav
        className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-5"
        aria-label="Разделы управления"
      >
        {[
          ["products", "Товары"],
          ["categories", "Категории"],
          ["brands", "Бренды"],
          ["orders", "Заказы"],
          ["feedback", "Отзывы и вопросы"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/admin?tab=${value}`}
            aria-current={tab === value ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm ${tab === value ? "bg-[#D4AF37] font-semibold text-[#0D0D0F]" : "text-zinc-400 hover:bg-white/5"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Notifications userId={user.id} admin />
      {tab === "feedback" && <FeedbackModeration />}
      {(tab === "products" || tab === "orders") && (
        <form className="panel mb-6 flex flex-wrap gap-3 p-4">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            maxLength={120}
            className="field flex-1"
            aria-label="Поиск"
            placeholder={
              tab === "orders"
                ? "Номер заказа, почта или телефон"
                : "Название товара"
            }
          />
          {tab === "orders" ? (
            <select
              name="status"
              defaultValue={status}
              className="field w-auto"
              aria-label="Статус заказа"
            >
              <option value="">Все статусы</option>
              {Object.entries(orderStatuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <select
              name="publication"
              defaultValue={publication}
              className="field w-auto"
              aria-label="Публикация"
            >
              <option value="">Все товары</option>
              <option value="PUBLISHED">Опубликованы</option>
              <option value="DRAFT">Черновики</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          )}
          <Button type="submit" variant="outline">
            Найти
          </Button>
          <Link
            className="self-center text-sm text-zinc-400"
            href={`/admin?tab=${tab}`}
          >
            Сбросить
          </Link>
        </form>
      )}
      {tab === "products" && (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl">Товары</h2>
            <EditProductButton id="new" />
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-zinc-500">
                <tr>
                  <th className="p-4">Инструмент</th>
                  <th className="p-4">Цена</th>
                  <th className="p-4">Остаток</th>
                  <th className="p-4">Действия</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-white/5">
                    <td className="max-w-xs p-4">
                      <Link
                        href={`/product/${product.slug}`}
                        className="hover:text-[#D4AF37]"
                      >
                        {product.title}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">
                        {product.brand.name} · {product.category.name}
                        {" · MM-"}
                        {String(product.id).padStart(5, "0")}
                        {" · "}
                        {
                          {
                            DRAFT: "Черновик",
                            PUBLISHED: "Опубликован",
                            ARCHIVED: "Архив",
                          }[product.status]
                        }
                      </p>
                    </td>
                    <td className="p-4 text-[#E5C158]">
                      {money(product.price)}
                    </td>
                    <td className="p-4">{product.stock}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <EditProductButton id={product.id} />
                        <DeleteProductButton id={product.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ProductDialog
            products={editableProducts}
            categories={categories}
            brands={brands}
          />
        </>
      )}
      {(tab === "categories" || tab === "brands") && (
        <section>
          <h2 className="mb-5 text-xl">
            {tab === "categories" ? "Категории" : "Бренды"}
          </h2>
          <div className="grid gap-4">
            {(tab === "categories" ? categories : brands).map((item) => (
              <TaxonomyForm
                key={item.id}
                item={item}
                kind={tab === "categories" ? "category" : "brand"}
              />
            ))}
            <div className="mt-4">
              <h3 className="mb-4 text-sm text-zinc-400">
                {tab === "categories" ? "Новая категория" : "Новый бренд"}
              </h3>
              <TaxonomyForm
                kind={tab === "categories" ? "category" : "brand"}
              />
            </div>
          </div>
        </section>
      )}
      {tab === "orders" && (
        <section>
          <h2 className="mb-5 text-xl">
            Заказы · найдено {filteredOrderCount}
          </h2>
          <div className="grid gap-5">
            {orders.map((order) => (
              <article key={order.id} className="panel p-6">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3>
                      №{order.id.slice(-8).toUpperCase()}{" "}
                      <span className="ml-2 text-xs text-zinc-500">
                        {order.createdAt.toLocaleString("ru-RU", {
                          timeZone: "Europe/Moscow",
                        })}
                      </span>
                    </h3>
                    <p className="mt-3 text-sm text-zinc-400">
                      {order.user.name} · {order.user.email}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {order.address} · {order.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-[#E5C158]">
                      {money(order.totalPrice)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {orderStatuses[order.status]}
                    </p>
                  </div>
                </div>
                <ul className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-xs text-zinc-400">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.titleAtPurchase ?? item.product.title} ×{" "}
                      {item.quantity} · {money(item.priceAtPurchase)}
                    </li>
                  ))}
                </ul>
                <OrderStatusControl id={order.id} status={order.status} />
                <OrderInfo order={order} />
                <OrderDetailsForm
                  order={{
                    id: order.id,
                    deliveryPrice: order.deliveryPrice,
                    deliveryConfirmed: order.deliveryConfirmed,
                    trackingNumber: order.trackingNumber,
                    managerComment: order.managerComment,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                  }}
                />
              </article>
            ))}
            {!orders.length && (
              <p className="panel p-8 text-sm text-zinc-400">
                Пока нет заказов.
              </p>
            )}
          </div>
        </section>
      )}
      {(tab === "orders" || tab === "products") && (
        <nav
          aria-label="Страницы управления"
          className="mt-6 flex items-center gap-5"
        >
          {page > 1 && (
            <Link
              className="text-[#E5C158]"
              href={`/admin?${new URLSearchParams({ tab, q, status, publication, page: String(page - 1) })}`}
            >
              ← Назад
            </Link>
          )}
          <span className="text-sm text-zinc-400">Страница {page}</span>
          {page * 20 <
            (tab === "orders" ? filteredOrderCount : filteredProductCount) && (
            <Link
              className="text-[#E5C158]"
              href={`/admin?${new URLSearchParams({ tab, q, status, publication, page: String(page + 1) })}`}
            >
              Далее →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
export default function AdminPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="container-shell py-20 text-zinc-400">
          Загружаем управление…
        </div>
      }
    >
      <Admin {...props} />
    </Suspense>
  );
}
