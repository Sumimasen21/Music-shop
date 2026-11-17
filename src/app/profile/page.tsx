import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, LogOut, Settings2, ShoppingBag } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { money, orderStatuses } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { CartSync } from "@/components/cart-panel";
import {
  CancelOrderButton,
  RepeatOrderButton,
} from "@/components/order-controls";
import { OrderInfo } from "@/components/order-info";
import { Notifications } from "@/components/notifications";
import { ProfileSettings } from "@/components/profile-settings";
import { AddressBook } from "@/components/address-book";
import { addressSelect } from "@/lib/address-book";
export const metadata: Metadata = { title: "Личный кабинет" };
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function Profile({ searchParams }: Props) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const addresses = await prisma.savedAddress.findMany({
    where: { userId: user.id },
    select: addressSelect,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const params = z
    .object({
      order: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).max(100000).default(1),
    })
    .safeParse(await searchParams);
  const page = params.success ? params.data.page : 1;
  const orderCount = await prisma.order.count({ where: { userId: user.id } });
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    take: 10,
    skip: (page - 1) * 10,
  });
  const created = params.success
    ? orders.find((order) => order.id === params.data.order)
    : null;
  return (
    <div className="container-shell py-12">
      <CartSync />
      {created && (
        <div
          role="status"
          className="mb-8 flex items-center gap-4 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-5"
        >
          <CheckCircle2 className="size-6 text-[#D4AF37]" />
          <div>
            <p className="font-medium">Заказ оформлен</p>
            <p className="mt-1 text-xs text-zinc-400">
              Заказ №{created.id.slice(-8).toUpperCase()} сохранён. Статус
              появится ниже.
            </p>
          </div>
        </div>
      )}
      <p className="eyebrow mb-3">На одной волне</p>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="display text-5xl">
            Здравствуйте, {user.name ?? "музыкант"}.
          </h1>
          <p className="mt-4 text-sm text-zinc-400">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user.role === "ADMIN" && (
            <Button asChild variant="outline">
              <Link href="/admin">
                <Settings2 className="size-4" />
                Управление магазином
              </Link>
            </Button>
          )}
          <form action={logoutAction}>
            <Button variant="ghost" type="submit">
              <LogOut className="size-4" />
              Выйти
            </Button>
          </form>
        </div>
      </div>
      <Notifications userId={user.id} />
      <AddressBook addresses={addresses} />
      <ProfileSettings
        user={{ name: user.name, phone: user.phone, address: user.address }}
      />
      <h2 className="display mb-7 text-3xl">Ваши заказы</h2>
      {orders.length ? (
        <div className="grid gap-5">
          {orders.map((order) => (
            <article key={order.id} className="panel p-6">
              <div className="flex flex-wrap justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h3 className="font-medium">
                    <Link
                      href={`/profile/orders/${order.id}`}
                      className="hover:text-[#E5C158]"
                    >
                      Заказ №{order.id.slice(-8).toUpperCase()}
                    </Link>
                  </h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    {order.createdAt.toLocaleDateString("ru-RU", {
                      timeZone: "Europe/Moscow",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-md border border-[#D4AF37]/30 px-3 py-1 text-xs text-[#E5C158]">
                    {orderStatuses[order.status]}
                  </span>
                  <p className="mt-3 text-lg font-semibold text-[#E5C158]">
                    {money(order.totalPrice)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 py-5">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-zinc-300 hover:text-[#D4AF37]"
                    >
                      {item.titleAtPurchase ?? item.product.title}{" "}
                      <span className="text-zinc-500">× {item.quantity}</span>
                    </Link>
                    <span className="shrink-0 text-zinc-400">
                      {money(item.priceAtPurchase * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                {order.address} · {order.phone}
              </p>
              <OrderInfo order={order} />
              <RepeatOrderButton id={order.id} />
              {order.status === "PENDING" && (
                <CancelOrderButton id={order.id} />
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel p-10 text-center">
          <ShoppingBag className="mx-auto mb-5 size-8 text-[#D4AF37]" />
          <p className="mb-6 text-zinc-400">
            Здесь будет история ваших заказов.
          </p>
          <Button asChild>
            <Link href="/cart">Перейти в корзину</Link>
          </Button>
        </div>
      )}
      {orderCount > 10 && (
        <nav
          aria-label="Страницы заказов"
          className="mt-6 flex items-center gap-5"
        >
          {page > 1 && (
            <Link className="text-[#E5C158]" href={`/profile?page=${page - 1}`}>
              ← Назад
            </Link>
          )}
          <span className="text-sm text-zinc-400">Страница {page}</span>
          {page * 10 < orderCount && (
            <Link className="text-[#E5C158]" href={`/profile?page=${page + 1}`}>
              Далее →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
export default function ProfilePage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="container-shell py-20 text-zinc-400">
          Загружаем кабинет…
        </div>
      }
    >
      <Profile {...props} />
    </Suspense>
  );
}
