import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { money, orderStatuses } from "@/lib/utils";
import { OrderInfo } from "@/components/order-info";
import {
  CancelOrderButton,
  RepeatOrderButton,
} from "@/components/order-controls";

export const metadata = {
  title: "Заказ",
  robots: { index: false, follow: false },
};
async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = z
    .string()
    .cuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const order = await prisma.order.findFirst({
    where: { id: parsed.data, userId: user.id },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  return (
    <div className="container-shell py-12">
      <Link className="text-sm text-[#E5C158]" href="/profile">
        ← Личный кабинет
      </Link>
      <h1 className="display my-7 text-4xl">
        Заказ №{order.id.slice(-8).toUpperCase()}
      </h1>
      <article className="panel p-6">
        <p className="text-[#E5C158]">{orderStatuses[order.status]}</p>
        <ul className="my-6 grid gap-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 text-sm">
              <span>
                {item.titleAtPurchase ?? item.product.title} × {item.quantity}
                <small className="block text-zinc-500">
                  {item.skuAtPurchase}
                </small>
              </span>
              <span>{money(item.priceAtPurchase * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <p>Товары: {money(order.totalPrice)}</p>
        <p className="mt-3 text-sm text-zinc-400">
          {order.address} · {order.phone}
        </p>
        <OrderInfo order={order} />
        <RepeatOrderButton id={order.id} />
        {order.status === "PENDING" && <CancelOrderButton id={order.id} />}
      </article>
    </div>
  );
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={<div className="container-shell py-12">Загружаем заказ…</div>}
    >
      <OrderPage {...props} />
    </Suspense>
  );
}
